import {
  describe,
  it,
  expect,
  beforeEach,
} from "vitest";

import request from "supertest";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";

import { authHeaders } from "../helpers/auth.js";
import { createTestUser } from "../helpers/users.js";

let user;
let jobId;

function patchJob(body, userId = user.id) {
  return request(app)
    .patch(`/jobs/${jobId}`)
    .set(authHeaders(userId))
    .send(body);
}

async function historyFor(id = jobId) {
  return prisma.stageHistory.findMany({
    where: { jobId: id },
    orderBy: { id: "asc" },
    select: { previousStage: true, newStage: true },
  });
}

beforeEach(async () => {
  user = await createTestUser({ email: "stages@test.local" });

  const created = await request(app)
    .post("/jobs")
    .set(authHeaders(user.id))
    .send({ company: "Acme", title: "Engineer" })
    .expect(201);

  jobId = created.body.id;
});

describe("stage history", () => {
  it("records the initial APPLIED stage on creation", async () => {
    expect(await historyFor()).toEqual([
      { previousStage: null, newStage: "APPLIED" },
    ]);
  });

  it("records each status transition with the previous stage", async () => {
    await patchJob({ status: "SCREENING" }).expect(200);
    await patchJob({ status: "INTERVIEW" }).expect(200);
    const response = await patchJob({ status: "OFFER" }).expect(200);

    expect(await historyFor()).toEqual([
      { previousStage: null, newStage: "APPLIED" },
      { previousStage: "APPLIED", newStage: "SCREENING" },
      { previousStage: "SCREENING", newStage: "INTERVIEW" },
      { previousStage: "INTERVIEW", newStage: "OFFER" },
    ]);

    // The response includes history newest first.
    expect(response.body.status).toBe("OFFER");
    expect(response.body.stageHistory[0].newStage).toBe("OFFER");
    expect(response.body.stageHistory).toHaveLength(4);
  });

  it("does not record an entry when the status is unchanged", async () => {
    await patchJob({ status: "APPLIED" }).expect(200);

    expect(await historyFor()).toHaveLength(1);
  });

  it("does not record an entry for non-status updates", async () => {
    await patchJob({ notes: "Called the recruiter" }).expect(200);
    await patchJob({ title: "Senior Engineer" }).expect(200);

    expect(await historyFor()).toHaveLength(1);
  });

  it("does not touch history when the status is invalid", async () => {
    await patchJob({ status: "HIRED" }).expect(400);

    expect(await historyFor()).toHaveLength(1);

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job.status).toBe("APPLIED");
  });

  it("does not let another user add history to the job", async () => {
    const intruder = await createTestUser({
      email: "intruder@test.local",
    });

    await patchJob({ status: "REJECTED" }, intruder.id).expect(404);

    expect(await historyFor()).toHaveLength(1);
  });

  it("ignores stageHistory supplied in the request body", async () => {
    await patchJob({
      status: "SCREENING",
      stageHistory: {
        create: { previousStage: "OFFER", newStage: "OFFER" },
      },
    }).expect(200);

    expect(await historyFor()).toEqual([
      { previousStage: null, newStage: "APPLIED" },
      { previousStage: "APPLIED", newStage: "SCREENING" },
    ]);
  });

  it("can move back to an earlier stage", async () => {
    await patchJob({ status: "REJECTED" }).expect(200);
    await patchJob({ status: "APPLIED" }).expect(200);

    expect((await historyFor()).at(-1)).toEqual({
      previousStage: "REJECTED",
      newStage: "APPLIED",
    });
  });
});
