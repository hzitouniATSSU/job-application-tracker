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
let otherUser;

beforeEach(async () => {
  user = await createTestUser({ email: "jobs@test.local" });
  otherUser = await createTestUser({ email: "other@test.local" });
});

function createJob(body, userId = user.id) {
  return request(app)
    .post("/jobs")
    .set(authHeaders(userId))
    .send(body);
}

describe("POST /jobs", () => {
  it("creates a job owned by the caller with an initial APPLIED stage", async () => {
    const response = await createJob({
      company: "  Canonical  ",
      title: "  Support Engineer ",
      location: "Remote",
      jobUrl: "https://example.com/job/1",
      notes: "Referred by a friend",
    }).expect(201);

    expect(response.body).toMatchObject({
      company: "Canonical",
      title: "Support Engineer",
      location: "Remote",
      jobUrl: "https://example.com/job/1",
      notes: "Referred by a friend",
      status: "APPLIED",
      userId: user.id,
    });

    expect(response.body.stageHistory).toEqual([
      expect.objectContaining({
        previousStage: null,
        newStage: "APPLIED",
      }),
    ]);
  });

  it("ignores ownership and server-managed fields supplied by the client", async () => {
    const response = await createJob({
      company: "Acme",
      title: "Engineer",
      userId: otherUser.id,
      id: 999999,
      status: "OFFER",
    }).expect(201);

    expect(response.body.userId).toBe(user.id);
    expect(response.body.id).not.toBe(999999);
    expect(response.body.status).toBe("APPLIED");

    expect(
      await prisma.job.count({ where: { userId: otherUser.id } })
    ).toBe(0);
  });

  it.each([
    [{ title: "Engineer" }, "Company is required"],
    [{ company: "   ", title: "Engineer" }, "Company is required"],
    [{ company: 42, title: "Engineer" }, "Company is required"],
    [{ company: "Acme" }, "Job title is required"],
    [{ company: "Acme", title: "" }, "Job title is required"],
    [{ company: "Acme", title: "Eng", location: 5 }, "location must be a string"],
    [{ company: "Acme", title: "Eng", jobUrl: ["x"] }, "jobUrl must be a string"],
    [{ company: "Acme", title: "Eng", notes: { a: 1 } }, "notes must be a string"],
  ])("rejects %j with 400", async (body, error) => {
    const response = await createJob(body).expect(400);

    expect(response.body).toEqual({ error });
    expect(await prisma.job.count()).toBe(0);
  });

  it("returns 400 (not 500) when the request has no body", async () => {
    const response = await request(app)
      .post("/jobs")
      .set(authHeaders(user.id))
      .expect(400);

    expect(response.body).toEqual({ error: "Company is required" });
  });

  it("returns 400 (not 500) for a non-JSON content type", async () => {
    await request(app)
      .post("/jobs")
      .set(authHeaders(user.id))
      .set("Content-Type", "text/plain")
      .send("company=Acme")
      .expect(400);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await request(app)
      .post("/jobs")
      .set(authHeaders(user.id))
      .set("Content-Type", "application/json")
      .send('{"company": "Acme",')
      .expect(400);

    expect(response.body).toHaveProperty("error");
  });

  it("returns 413 for a body over the 50kb limit", async () => {
    await createJob({
      company: "Acme",
      title: "Engineer",
      notes: "x".repeat(60 * 1024),
    }).expect(413);

    expect(await prisma.job.count()).toBe(0);
  });
});

describe("GET /jobs", () => {
  it("lists only the caller's jobs", async () => {
    await createJob({ company: "Mine", title: "Engineer" }).expect(201);
    await createJob(
      { company: "Theirs", title: "Engineer" },
      otherUser.id
    ).expect(201);

    const response = await request(app)
      .get("/jobs")
      .set(authHeaders(user.id))
      .expect(200);

    expect(response.body.map((job) => job.company)).toEqual(["Mine"]);
  });
});

describe("GET /jobs/:id", () => {
  it("returns the job with its documents and stage history", async () => {
    const created = await createJob({
      company: "Acme",
      title: "Engineer",
    }).expect(201);

    const response = await request(app)
      .get(`/jobs/${created.body.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    expect(response.body.id).toBe(created.body.id);
    expect(response.body.documents).toEqual([]);
    expect(response.body.stageHistory).toHaveLength(1);
  });

  it("returns 404 for a job that does not exist", async () => {
    await request(app)
      .get("/jobs/123456")
      .set(authHeaders(user.id))
      .expect(404);
  });

  it.each(["abc", "0", "-5", "1.5", "99999999999"])(
    "returns 400 for the invalid ID %j",
    async (id) => {
      const response = await request(app)
        .get(`/jobs/${id}`)
        .set(authHeaders(user.id))
        .expect(400);

      expect(response.body).toEqual({ error: "Invalid job ID" });
    }
  );
});

describe("PATCH /jobs/:id", () => {
  let jobId;

  beforeEach(async () => {
    const created = await createJob({
      company: "Acme",
      title: "Engineer",
    }).expect(201);

    jobId = created.body.id;
  });

  function patchJob(body, id = jobId) {
    return request(app)
      .patch(`/jobs/${id}`)
      .set(authHeaders(user.id))
      .send(body);
  }

  it("updates allowed fields and trims text", async () => {
    const response = await patchJob({
      company: "  Acme Corp ",
      location: "Berlin",
      notes: null,
      appliedAt: "2026-01-15",
    }).expect(200);

    expect(response.body).toMatchObject({
      company: "Acme Corp",
      title: "Engineer",
      location: "Berlin",
      notes: null,
      appliedAt: "2026-01-15T00:00:00.000Z",
    });
  });

  it("ignores fields that are not updatable", async () => {
    const response = await patchJob({
      title: "Senior Engineer",
      userId: otherUser.id,
      createdAt: "2000-01-01",
    }).expect(200);

    expect(response.body.userId).toBe(user.id);
    expect(response.body.createdAt).not.toMatch(/^2000-/);
  });

  it.each([
    [{}, "No valid fields provided for update"],
    [{ userId: 1 }, "No valid fields provided for update"],
    [{ company: "" }, "Company cannot be empty"],
    [{ title: 7 }, "Job title cannot be empty"],
    [{ status: "HIRED" }, "Invalid application status"],
    [{ status: "applied" }, "Invalid application status"],
    [{ location: 12 }, "location must be a string"],
    [{ appliedAt: "not-a-date" }, "Invalid application date"],
  ])("rejects %j with 400 and leaves the job unchanged", async (body, error) => {
    const response = await patchJob(body).expect(400);

    expect(response.body).toEqual({ error });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job).toMatchObject({
      company: "Acme",
      title: "Engineer",
      status: "APPLIED",
    });
  });

  it("returns 400 (not 500) when the request has no body", async () => {
    await request(app)
      .patch(`/jobs/${jobId}`)
      .set(authHeaders(user.id))
      .expect(400);
  });

  it("returns 404 for a job that does not exist", async () => {
    await patchJob({ title: "Anything" }, 123456).expect(404);
  });

  it("returns 400 for an invalid ID", async () => {
    await patchJob({ title: "Anything" }, "99999999999").expect(400);
  });
});

describe("DELETE /jobs/:id", () => {
  it("deletes the job and cascades its stage history and reminders", async () => {
    const created = await createJob({
      company: "Acme",
      title: "Engineer",
    }).expect(201);

    const jobId = created.body.id;

    await request(app)
      .post("/reminders")
      .set(authHeaders(user.id))
      .send({
        jobId,
        title: "Follow up",
        dueAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);

    await request(app)
      .delete(`/jobs/${jobId}`)
      .set(authHeaders(user.id))
      .expect(200);

    await request(app)
      .get(`/jobs/${jobId}`)
      .set(authHeaders(user.id))
      .expect(404);

    expect(await prisma.stageHistory.count({ where: { jobId } })).toBe(0);
    expect(await prisma.reminder.count({ where: { jobId } })).toBe(0);
  });

  it("returns 404 when deleting a job twice", async () => {
    const created = await createJob({
      company: "Acme",
      title: "Engineer",
    }).expect(201);

    await request(app)
      .delete(`/jobs/${created.body.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    await request(app)
      .delete(`/jobs/${created.body.id}`)
      .set(authHeaders(user.id))
      .expect(404);
  });

  it("returns 400 for an invalid ID", async () => {
    await request(app)
      .delete("/jobs/not-a-number")
      .set(authHeaders(user.id))
      .expect(400);
  });
});
