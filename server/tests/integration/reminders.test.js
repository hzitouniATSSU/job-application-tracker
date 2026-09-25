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
let job;

const dueAt = "2030-06-01T09:00:00.000Z";

beforeEach(async () => {
  user = await createTestUser({ email: "reminders@test.local" });
  job = await prisma.job.create({
    data: { company: "Acme", title: "Engineer", userId: user.id },
  });
});

function createReminder(body) {
  return request(app)
    .post("/reminders")
    .set(authHeaders(user.id))
    .send(body);
}

describe("POST /reminders", () => {
  it("creates a reminder with defaults and the job summary", async () => {
    const response = await createReminder({
      jobId: job.id,
      title: "  Send thank-you note ",
      dueAt,
    }).expect(201);

    expect(response.body).toMatchObject({
      jobId: job.id,
      userId: user.id,
      type: "FOLLOW_UP",
      title: "Send thank-you note",
      dueAt,
      completed: false,
      job: { id: job.id, company: "Acme", title: "Engineer" },
    });
  });

  it("accepts a numeric string job ID", async () => {
    await createReminder({
      jobId: String(job.id),
      title: "Prep",
      type: "INTERVIEW",
      dueAt,
    }).expect(201);
  });

  it.each([
    [{ title: "x", dueAt }, "Invalid job ID"],
    [{ jobId: "abc", title: "x", dueAt }, "Invalid job ID"],
    [{ jobId: true, title: "x", dueAt }, "Invalid job ID"],
    [{ jobId: 99999999999, title: "x", dueAt }, "Invalid job ID"],
  ])("rejects %j with 400", async (body, error) => {
    const response = await createReminder(body).expect(400);

    expect(response.body).toEqual({ error });
  });

  it.each([
    [{ title: "  " }, "Reminder title is required"],
    [{ title: 5 }, "Reminder title is required"],
    [{ title: "x", type: "PARTY" }, "Invalid reminder type"],
    [{ title: "x", dueAt: undefined }, "A valid due date is required"],
    [{ title: "x", dueAt: "tomorrow-ish" }, "A valid due date is required"],
  ])("rejects %j with 400", async (overrides, error) => {
    const response = await createReminder({
      jobId: job.id,
      dueAt,
      ...overrides,
    }).expect(400);

    expect(response.body).toEqual({ error });
    expect(await prisma.reminder.count()).toBe(0);
  });

  it("returns 404 for a job that does not exist", async () => {
    await createReminder({
      jobId: 123456,
      title: "x",
      dueAt,
    }).expect(404);
  });

  it("returns 400 (not 500) when the request has no body", async () => {
    await request(app)
      .post("/reminders")
      .set(authHeaders(user.id))
      .expect(400);
  });
});

describe("GET /reminders", () => {
  it("lists the caller's reminders ordered by due date", async () => {
    for (const [title, date] of [
      ["Later", "2031-01-01"],
      ["Sooner", "2030-01-01"],
    ]) {
      await createReminder({ jobId: job.id, title, dueAt: date }).expect(201);
    }

    const response = await request(app)
      .get("/reminders")
      .set(authHeaders(user.id))
      .expect(200);

    expect(response.body.map((reminder) => reminder.title)).toEqual([
      "Sooner",
      "Later",
    ]);
  });
});

describe("PATCH /reminders/:id", () => {
  let reminderId;

  beforeEach(async () => {
    const created = await createReminder({
      jobId: job.id,
      title: "Follow up",
      dueAt,
    }).expect(201);

    reminderId = created.body.id;
  });

  it("marks a reminder complete and incomplete", async () => {
    const done = await request(app)
      .patch(`/reminders/${reminderId}`)
      .set(authHeaders(user.id))
      .send({ completed: true })
      .expect(200);

    expect(done.body.completed).toBe(true);

    const undone = await request(app)
      .patch(`/reminders/${reminderId}`)
      .set(authHeaders(user.id))
      .send({ completed: false })
      .expect(200);

    expect(undone.body.completed).toBe(false);
  });

  it("only updates the completed flag", async () => {
    const response = await request(app)
      .patch(`/reminders/${reminderId}`)
      .set(authHeaders(user.id))
      .send({ completed: true, title: "Changed", userId: 999 })
      .expect(200);

    expect(response.body.title).toBe("Follow up");
    expect(response.body.userId).toBe(user.id);
  });

  it.each([{ completed: "true" }, { completed: 1 }, {}])(
    "rejects %j with 400",
    async (body) => {
      await request(app)
        .patch(`/reminders/${reminderId}`)
        .set(authHeaders(user.id))
        .send(body)
        .expect(400);
    }
  );

  it("returns 400 for an invalid ID and 404 for a missing one", async () => {
    await request(app)
      .patch("/reminders/abc")
      .set(authHeaders(user.id))
      .send({ completed: true })
      .expect(400);

    await request(app)
      .patch("/reminders/123456")
      .set(authHeaders(user.id))
      .send({ completed: true })
      .expect(404);
  });
});

describe("DELETE /reminders/:id", () => {
  it("deletes the reminder, then 404s", async () => {
    const created = await createReminder({
      jobId: job.id,
      title: "Follow up",
      dueAt,
    }).expect(201);

    await request(app)
      .delete(`/reminders/${created.body.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    await request(app)
      .delete(`/reminders/${created.body.id}`)
      .set(authHeaders(user.id))
      .expect(404);

    expect(
      await prisma.job.findUnique({ where: { id: job.id } })
    ).not.toBeNull();
  });
});
