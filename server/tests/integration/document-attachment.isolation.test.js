import {
  describe,
  it,
  expect,
} from "vitest";

import path from "path";

import app from "../../app.js";

import {
  createTestUser,
} from "../helpers/users.js";

import {
  loginAgent,
} from "../helpers/auth.js";

const testFilePath = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "private_test.pdf"
);

describe("Document attachment two-user isolation", () => {
  it(
    "does not allow User B to attach User A's document to User B's job",
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

      const documentResponse =
        await userA.agent
          .post("/documents")
          .set(
            "X-CSRF-Token",
            userA.csrfToken
          )
          .field(
            "name",
            "User A Private Resume"
          )
          .attach(
            "file",
            testFilePath
          )
          .expect(201);

      const documentId =
        documentResponse.body.id;

      const userBJob =
        await userB.agent
          .post("/jobs")
          .set(
            "X-CSRF-Token",
            userB.csrfToken
          )
          .send({
            company: "User B Company",
            title: "Support Engineer",
          })
          .expect(201);

      const jobId = userBJob.body.id;

      await userB.agent
        .post(
          `/documents/${documentId}/jobs/${jobId}`
        )
        .set(
          "X-CSRF-Token",
          userB.csrfToken
        )
        .expect(404);

      const documentAfterAttempt =
        await userA.agent
          .get(`/documents/${documentId}`)
          .expect(200);

      expect(
        documentAfterAttempt.body.jobs
      ).toEqual([]);
    }
  );

  it(
    "does not allow User A to attach their document to User B's job",
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

      const documentResponse =
        await userA.agent
          .post("/documents")
          .set(
            "X-CSRF-Token",
            userA.csrfToken
          )
          .attach(
            "file",
            testFilePath
          )
          .expect(201);

      const documentId =
        documentResponse.body.id;

      const userBJob =
        await userB.agent
          .post("/jobs")
          .set(
            "X-CSRF-Token",
            userB.csrfToken
          )
          .send({
            company: "User B Company",
            title: "Linux Engineer",
          })
          .expect(201);

      const jobId = userBJob.body.id;

      await userA.agent
        .post(
          `/documents/${documentId}/jobs/${jobId}`
        )
        .set(
          "X-CSRF-Token",
          userA.csrfToken
        )
        .expect(404);

      const documentAfterAttempt =
        await userA.agent
          .get(`/documents/${documentId}`)
          .expect(200);

      expect(
        documentAfterAttempt.body.jobs
      ).toEqual([]);
    }
  );

  it(
    "does not allow User B to detach User A's document from User A's job",
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

      const documentResponse =
        await userA.agent
          .post("/documents")
          .set(
            "X-CSRF-Token",
            userA.csrfToken
          )
          .attach(
            "file",
            testFilePath
          )
          .expect(201);

      const documentId =
        documentResponse.body.id;

      const userAJob =
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

      const jobId = userAJob.body.id;

      await userA.agent
        .post(
          `/documents/${documentId}/jobs/${jobId}`
        )
        .set(
          "X-CSRF-Token",
          userA.csrfToken
        )
        .expect(200);

      await userB.agent
        .delete(
          `/documents/${documentId}/jobs/${jobId}`
        )
        .set(
          "X-CSRF-Token",
          userB.csrfToken
        )
        .expect(404);

      const documentAfterAttempt =
        await userA.agent
          .get(`/documents/${documentId}`)
          .expect(200);

      expect(
        documentAfterAttempt.body.jobs
      ).toHaveLength(1);

      expect(
        documentAfterAttempt.body.jobs[0].id
      ).toBe(jobId);
    }
  );
});