import {
  describe,
  it,
  expect,
  beforeEach,
} from "vitest";

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import request from "supertest";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";

import { authHeaders } from "../helpers/auth.js";
import { createTestUser } from "../helpers/users.js";

// User A owns a job, a document attached to it, a reminder and stage
// history. Every route User B can reach must behave as if A's
// resources do not exist, and must leave them untouched.

const documentStoragePath = path.join(
  process.cwd(),
  "storage",
  "documents"
);

let userA;
let userB;
let jobA;
let documentA;
let reminderA;
let jobB;
let documentB;

async function createDocument(userId, name, jobIds = []) {
  const storedName = `${randomUUID()}.pdf`;

  await fs.writeFile(
    path.join(documentStoragePath, storedName),
    "%PDF-1.4 private"
  );

  return prisma.document.create({
    data: {
      name,
      originalName: `${name}.pdf`,
      storedName,
      mimeType: "application/pdf",
      size: 16,
      userId,
      jobs: { connect: jobIds.map((id) => ({ id })) },
    },
  });
}

// Fixtures are created directly in the database: the /jobs, /documents
// and /reminders routes share a 100-requests-per-15-minutes limiter.
beforeEach(async () => {
  userA = await createTestUser({ email: "owner-a@test.local" });
  userB = await createTestUser({ email: "owner-b@test.local" });

  jobA = await prisma.job.create({
    data: {
      company: "Private A",
      title: "Engineer",
      notes: "secret",
      userId: userA.id,
      stageHistory: { create: { newStage: "APPLIED" } },
    },
  });

  jobB = await prisma.job.create({
    data: {
      company: "B Corp",
      title: "Engineer",
      userId: userB.id,
      stageHistory: { create: { newStage: "APPLIED" } },
    },
  });

  documentA = await createDocument(userA.id, "resume-a", [jobA.id]);
  documentB = await createDocument(userB.id, "resume-b");

  reminderA = await prisma.reminder.create({
    data: {
      jobId: jobA.id,
      title: "Follow up",
      dueAt: new Date("2030-01-01T00:00:00.000Z"),
      userId: userA.id,
    },
  });
});

async function expectUserADataIntact() {
  const job = await prisma.job.findUnique({
    where: { id: jobA.id },
    include: { documents: true, stageHistory: true },
  });

  expect(job).toMatchObject({
    company: "Private A",
    status: "APPLIED",
    notes: "secret",
    userId: userA.id,
  });
  expect(job.documents.map((d) => d.id)).toEqual([documentA.id]);
  expect(job.stageHistory).toHaveLength(1);

  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderA.id },
  });
  expect(reminder).toMatchObject({ completed: false, userId: userA.id });

  const document = await prisma.document.findUnique({
    where: { id: documentA.id },
  });
  expect(document).toMatchObject({ name: "resume-a", userId: userA.id });

  await expect(
    fs.access(path.join(documentStoragePath, document.storedName))
  ).resolves.toBeUndefined();
}

describe("cross-user resource isolation", () => {
  const attempts = [
    ["GET", () => `/jobs/${jobA.id}`],
    ["PATCH", () => `/jobs/${jobA.id}`, { status: "REJECTED", notes: "pwned" }],
    ["DELETE", () => `/jobs/${jobA.id}`],
    ["GET", () => `/documents/${documentA.id}`],
    ["GET", () => `/documents/${documentA.id}/download`],
    ["DELETE", () => `/documents/${documentA.id}`],
    ["POST", () => `/documents/${documentA.id}/jobs/${jobB.id}`],
    ["POST", () => `/documents/${documentB.id}/jobs/${jobA.id}`],
    ["DELETE", () => `/documents/${documentA.id}/jobs/${jobA.id}`],
    ["PATCH", () => `/reminders/${reminderA.id}`, { completed: true }],
    ["DELETE", () => `/reminders/${reminderA.id}`],
    [
      "POST",
      () => "/reminders",
      () => ({ jobId: jobA.id, title: "Hijack", dueAt: "2030-01-01" }),
    ],
  ];

  it.each(attempts)(
    "User B: %s %s returns 404 and changes nothing",
    async (method, getPath, getBody) => {
      const body =
        typeof getBody === "function" ? getBody() : getBody;

      const req = request(app)
        [method.toLowerCase()](getPath())
        .set(authHeaders(userB.id));

      const response = await (body ? req.send(body) : req);

      expect(response.status).toBe(404);
      expect(JSON.stringify(response.body)).not.toContain("Private A");
      expect(JSON.stringify(response.body)).not.toContain("secret");

      await expectUserADataIntact();

      expect(
        await prisma.reminder.count({ where: { userId: userB.id } })
      ).toBe(0);
    }
  );

  it("User B's collection endpoints never include User A's data", async () => {
    const [jobs, documents, reminders] = await Promise.all(
      ["/jobs", "/documents", "/reminders"].map((url) =>
        request(app).get(url).set(authHeaders(userB.id)).expect(200)
      )
    );

    expect(jobs.body.map((job) => job.id)).toEqual([jobB.id]);
    expect(documents.body.map((doc) => doc.id)).toEqual([documentB.id]);
    expect(reminders.body).toEqual([]);

    const allStageHistoryJobIds = jobs.body.flatMap((job) =>
      job.stageHistory.map((entry) => entry.jobId)
    );
    expect(allStageHistoryJobIds).not.toContain(jobA.id);
  });

  it("User A still has full access to their own resources", async () => {
    const job = await request(app)
      .get(`/jobs/${jobA.id}`)
      .set(authHeaders(userA.id))
      .expect(200);

    expect(job.body.documents.map((d) => d.id)).toEqual([documentA.id]);

    await request(app)
      .get(`/documents/${documentA.id}/download`)
      .set(authHeaders(userA.id))
      .expect(200);
  });

  it("deleting User B's account leaves User A's data intact", async () => {
    await request(app)
      .delete("/auth/account")
      .set(authHeaders(userB.id))
      .expect(204);

    expect(
      await prisma.user.findUnique({ where: { id: userB.id } })
    ).toBeNull();
    expect(
      await prisma.document.findUnique({ where: { id: documentB.id } })
    ).toBeNull();

    await expectUserADataIntact();
  });
});
