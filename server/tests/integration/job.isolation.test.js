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

describe("Job two-user isolation", () => {
  it(
    "does not expose User A jobs to User B",
    async () => {
      const password =
        "TestPassword123!";

      await createTestUser({
        email: "usera@test.local",
        password,
      });

      await createTestUser({
        email: "userb@test.local",
        password,
      });

      const userA =
        await loginAgent(
          app,
          "usera@test.local",
          password
        );

      const userB =
        await loginAgent(
          app,
          "userb@test.local",
          password
        );

      const createResponse =
        await userA.agent
          .post("/jobs")
          .set(
            "X-CSRF-Token",
            userA.csrfToken
          )
          .send({
            company: "Private Company A",
            title: "Support Engineer",
            location: "Remote",
          })
          .expect(201);

      const jobId =
        createResponse.body.id;

      const userAJobs =
        await userA.agent
          .get("/jobs")
          .expect(200);

      expect(userAJobs.body).toHaveLength(1);

      expect(
        userAJobs.body[0].company
      ).toBe("Private Company A");

      const userBJobs =
        await userB.agent
          .get("/jobs")
          .expect(200);

      expect(userBJobs.body).toEqual([]);

      await userB.agent
        .get(`/jobs/${jobId}`)
        .expect(404);
    }
  );

  it(
  "does not allow User B to modify or delete User A's job",
  async () => {
    const password =
      "TestPassword123!";

    await createTestUser({
      email: "usera@test.local",
      password,
    });

    await createTestUser({
      email: "userb@test.local",
      password,
    });

    const userA =
      await loginAgent(
        app,
        "usera@test.local",
        password
      );

    const userB =
      await loginAgent(
        app,
        "userb@test.local",
        password
      );

    const created =
      await userA.agent
        .post("/jobs")
        .set(
          "X-CSRF-Token",
          userA.csrfToken
        )
        .send({
          company: "Secret Company",
          title: "Linux Engineer",
        })
        .expect(201);

    const jobId = created.body.id;

    await userB.agent
      .patch(`/jobs/${jobId}`)
      .set(
        "X-CSRF-Token",
        userB.csrfToken
      )
      .send({
        status: "REJECTED",
      })
      .expect(404);

    await userB.agent
      .delete(`/jobs/${jobId}`)
      .set(
        "X-CSRF-Token",
        userB.csrfToken
      )
      .expect(404);

    const stillExists =
      await userA.agent
        .get(`/jobs/${jobId}`)
        .expect(200);

    expect(
      stillExists.body.company
    ).toBe("Secret Company");

    expect(
      stillExists.body.status
    ).not.toBe("REJECTED");
  }
);
});