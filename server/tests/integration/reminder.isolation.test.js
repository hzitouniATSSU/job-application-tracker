import {
  describe,
  it,
  expect,
} from "vitest";

import app from "../../app.js";

import {
  createTestUser,
} from "../helpers/users.js";

import {
  loginAgent,
} from "../helpers/auth.js";

describe("Reminder two-user isolation", () => {
  it(
    "does not expose User A reminders to User B",
    async () => {
      const password = "TestPassword123!";

      await createTestUser({
        email: "usera@test.local",
        password,
      });

      await createTestUser({
        email: "userb@test.local",
        password,
      });

      const userA = await loginAgent(
        app,
        "usera@test.local",
        password
      );

      const userB = await loginAgent(
        app,
        "userb@test.local",
        password
      );

      const jobResponse =
        await userA.agent
          .post("/jobs")
          .set(
            "X-CSRF-Token",
            userA.csrfToken
          )
          .send({
            company: "User A Company",
            title: "Support Engineer",
          })
          .expect(201);

      const jobId = jobResponse.body.id;

      const reminderResponse =
        await userA.agent
          .post("/reminders")
          .set(
            "X-CSRF-Token",
            userA.csrfToken
          )
          .send({
            jobId,
            type: "FOLLOW_UP",
            title: "Follow up with recruiter",
            dueAt: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(),
          })
          .expect(201);

      const reminderId =
        reminderResponse.body.id;

      const userAReminders =
        await userA.agent
          .get("/reminders")
          .expect(200);

      expect(userAReminders.body).toHaveLength(1);

      expect(
        userAReminders.body[0].title
      ).toBe("Follow up with recruiter");

      const userBReminders =
        await userB.agent
          .get("/reminders")
          .expect(200);

      expect(userBReminders.body).toEqual([]);

      expect(reminderId).toBeDefined();
    }
  );

  it(
    "does not allow User B to update or delete User A's reminder",
    async () => {
      const password = "TestPassword123!";

      await createTestUser({
        email: "usera@test.local",
        password,
      });

      await createTestUser({
        email: "userb@test.local",
        password,
      });

      const userA = await loginAgent(
        app,
        "usera@test.local",
        password
      );

      const userB = await loginAgent(
        app,
        "userb@test.local",
        password
      );

      const jobResponse =
        await userA.agent
          .post("/jobs")
          .set(
            "X-CSRF-Token",
            userA.csrfToken
          )
          .send({
            company: "Private Company",
            title: "Linux Engineer",
          })
          .expect(201);

      const jobId = jobResponse.body.id;

      const reminderResponse =
        await userA.agent
          .post("/reminders")
          .set(
            "X-CSRF-Token",
            userA.csrfToken
          )
          .send({
            jobId,
            type: "INTERVIEW",
            title: "Prepare for interview",
            dueAt: new Date(
              Date.now() + 48 * 60 * 60 * 1000
            ).toISOString(),
          })
          .expect(201);

      const reminderId =
        reminderResponse.body.id;

      await userB.agent
        .patch(`/reminders/${reminderId}`)
        .set(
          "X-CSRF-Token",
          userB.csrfToken
        )
        .send({
          completed: true,
        })
        .expect(404);

      await userB.agent
        .delete(`/reminders/${reminderId}`)
        .set(
          "X-CSRF-Token",
          userB.csrfToken
        )
        .expect(404);

      const userAReminders =
        await userA.agent
          .get("/reminders")
          .expect(200);

      expect(userAReminders.body).toHaveLength(1);

      expect(
        userAReminders.body[0].completed
      ).toBe(false);

      expect(
        userAReminders.body[0].id
      ).toBe(reminderId);
    }
  );

  it(
    "does not allow User A to create a reminder for User B's job",
    async () => {
      const password = "TestPassword123!";

      await createTestUser({
        email: "usera@test.local",
        password,
      });

      await createTestUser({
        email: "userb@test.local",
        password,
      });

      const userA = await loginAgent(
        app,
        "usera@test.local",
        password
      );

      const userB = await loginAgent(
        app,
        "userb@test.local",
        password
      );

      const userBJob =
        await userB.agent
          .post("/jobs")
          .set(
            "X-CSRF-Token",
            userB.csrfToken
          )
          .send({
            company: "User B Company",
            title: "Backend Engineer",
          })
          .expect(201);

      const userBJobId =
        userBJob.body.id;

      await userA.agent
        .post("/reminders")
        .set(
          "X-CSRF-Token",
          userA.csrfToken
        )
        .send({
          jobId: userBJobId,
          type: "FOLLOW_UP",
          title: "Should not exist",
          dueAt: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .expect(404);

      const userAReminders =
        await userA.agent
          .get("/reminders")
          .expect(200);

      expect(userAReminders.body).toEqual([]);

      const userBReminders =
        await userB.agent
          .get("/reminders")
          .expect(200);

      expect(userBReminders.body).toEqual([]);
    }
  );
});