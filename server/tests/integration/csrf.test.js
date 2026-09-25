import {
  describe,
  it,
  expect,
  beforeEach,
} from "vitest";

import fs from "fs/promises";
import path from "path";
import request from "supertest";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";

import {
  authHeaders,
  sessionCookie,
} from "../helpers/auth.js";
import { createTestUser } from "../helpers/users.js";

const documentStoragePath = path.join(
  process.cwd(),
  "storage",
  "documents"
);

async function storedDocumentFiles() {
  const files = await fs.readdir(documentStoragePath);
  return files.filter((file) => file !== ".gitkeep");
}

describe("GET /auth/csrf", () => {
  it("issues a readable CSRF cookie that matches the response body", async () => {
    const response = await request(app)
      .get("/auth/csrf")
      .expect(200);

    const { csrfToken } = response.body;
    expect(csrfToken).toMatch(/^[0-9a-f]{64}$/);

    const cookie = response.headers["set-cookie"].find((value) =>
      value.startsWith("csrfToken=")
    );

    expect(cookie.split(";")[0]).toBe(`csrfToken=${csrfToken}`);
    expect(cookie).not.toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it("issues a fresh token on every call", async () => {
    const first = await request(app).get("/auth/csrf");
    const second = await request(app).get("/auth/csrf");

    expect(first.body.csrfToken).not.toBe(second.body.csrfToken);
  });
});

describe("CSRF enforcement on an authenticated mutation", () => {
  let user;

  beforeEach(async () => {
    user = await createTestUser({ email: "csrf@test.local" });
  });

  const body = { company: "Acme", title: "Engineer" };

  it.each([
    [
      "no cookie and no header",
      {},
      "CSRF token required",
    ],
    [
      "a header but no cookie",
      { header: "a".repeat(64) },
      "CSRF token required",
    ],
    [
      "a cookie but no header",
      { cookie: "a".repeat(64) },
      "CSRF token required",
    ],
    [
      "a mismatched token of the same length",
      { cookie: "a".repeat(64), header: "b".repeat(64) },
      "Invalid CSRF token",
    ],
    [
      "a mismatched token of a different length",
      { cookie: "a".repeat(64), header: "a".repeat(63) },
      "Invalid CSRF token",
    ],
  ])("rejects %s with 403", async (_label, { cookie, header }, error) => {
    const cookies = [sessionCookie(user.id)];

    if (cookie) {
      cookies.push(`csrfToken=${cookie}`);
    }

    const req = request(app)
      .post("/jobs")
      .set("Cookie", cookies.join("; "));

    if (header) {
      req.set("X-CSRF-Token", header);
    }

    const response = await req.send(body).expect(403);

    expect(response.body).toEqual({ error });
    expect(await prisma.job.count()).toBe(0);
  });

  it("accepts a matching cookie and header", async () => {
    await request(app)
      .post("/jobs")
      .set(authHeaders(user.id))
      .send(body)
      .expect(201);
  });

  it("checks authentication before CSRF", async () => {
    await request(app)
      .post("/jobs")
      .set({
        Cookie: "csrfToken=abc",
        "X-CSRF-Token": "abc",
      })
      .send(body)
      .expect(401);
  });

  it("does not require a CSRF token for safe methods", async () => {
    await request(app)
      .get("/jobs")
      .set("Cookie", sessionCookie(user.id))
      .expect(200);

    await request(app)
      .get("/auth/me")
      .set("Cookie", sessionCookie(user.id))
      .expect(200);
  });
});

describe("every state-changing endpoint requires CSRF", () => {
  let user;
  let job;
  let document;
  let reminder;

  beforeEach(async () => {
    user = await createTestUser({ email: "csrf-matrix@test.local" });

    job = await prisma.job.create({
      data: {
        company: "Acme",
        title: "Engineer",
        userId: user.id,
      },
    });

    document = await prisma.document.create({
      data: {
        name: "Resume",
        originalName: "resume.pdf",
        storedName: "missing-file.pdf",
        mimeType: "application/pdf",
        size: 10,
        userId: user.id,
        jobs: { connect: { id: job.id } },
      },
    });

    reminder = await prisma.reminder.create({
      data: {
        jobId: job.id,
        title: "Follow up",
        dueAt: new Date(),
        userId: user.id,
      },
    });
  });

  const endpoints = [
    ["post", () => "/jobs", { company: "X", title: "Y" }],
    ["patch", () => `/jobs/${job.id}`, { status: "REJECTED" }],
    ["delete", () => `/jobs/${job.id}`],
    ["delete", () => `/documents/${document.id}`],
    ["post", () => `/documents/${document.id}/jobs/${job.id}`],
    ["delete", () => `/documents/${document.id}/jobs/${job.id}`],
    ["post", () => "/reminders", { jobId: 1, title: "x", dueAt: "2030-01-01" }],
    ["patch", () => `/reminders/${reminder.id}`, { completed: true }],
    ["delete", () => `/reminders/${reminder.id}`],
    ["patch", () => "/auth/profile", { name: "Changed" }],
    ["delete", () => "/auth/account"],
    ["post", () => "/auth/logout"],
  ];

  it.each(endpoints)(
    "%s %s is rejected with 403 without side effects",
    async (method, getPath, body) => {
      const req = request(app)
        [method](getPath())
        .set("Cookie", sessionCookie(user.id));

      await (body ? req.send(body) : req).expect(403);

      const [
        jobAfter,
        documentAfter,
        reminderAfter,
        userAfter,
        jobCount,
      ] = await Promise.all([
        prisma.job.findUnique({ where: { id: job.id } }),
        prisma.document.findUnique({
          where: { id: document.id },
          include: { jobs: true },
        }),
        prisma.reminder.findUnique({ where: { id: reminder.id } }),
        prisma.user.findUnique({ where: { id: user.id } }),
        prisma.job.count(),
      ]);

      expect(jobAfter.status).toBe("APPLIED");
      expect(jobCount).toBe(1);
      expect(documentAfter.jobs).toHaveLength(1);
      expect(reminderAfter.completed).toBe(false);
      expect(userAfter.name).toBeNull();
    }
  );

  it("rejects an upload without CSRF before any file is written", async () => {
    await request(app)
      .post("/documents")
      .set("Cookie", sessionCookie(user.id))
      .attach("file", Buffer.from("%PDF-1.4 test"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      })
      .expect(403);

    expect(await storedDocumentFiles()).toEqual([]);
    expect(await prisma.document.count()).toBe(1);
  });
});

describe("unauthenticated auth endpoints still require CSRF", () => {
  it.each([
    ["/auth/register", { email: "x@test.local", password: "LongPassword123!" }],
    ["/auth/login", { email: "x@test.local", password: "LongPassword123!" }],
    ["/auth/forgot-password", { email: "x@test.local" }],
    ["/auth/reset-password", { token: "abc", password: "LongPassword123!" }],
    ["/auth/verify-email", { token: "abc" }],
    ["/auth/resend-verification", { email: "x@test.local" }],
  ])("POST %s returns 403 without a token", async (url, body) => {
    const response = await request(app)
      .post(url)
      .send(body)
      .expect(403);

    expect(response.body).toEqual({ error: "CSRF token required" });
  });
});
