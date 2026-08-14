import {
  describe,
  it,
  expect,
} from "vitest";

import path from "path";
import { fileURLToPath } from "url";

import app from "../../app.js";

import {
  createTestUser,
} from "../helpers/users.js";

import {
  loginAgent,
} from "../helpers/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFilePath = path.join(
  __dirname,
  "../fixtures/private_test.pdf"
);

import fs from "fs";

console.log("TEST FILE:", testFilePath);
console.log("EXISTS:", fs.existsSync(testFilePath));

describe("Document two-user isolation", () => {
  it(
    "does not expose User A documents to User B",
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

      const uploadResponse =
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
        uploadResponse.body.id;

      const userADocuments =
        await userA.agent
          .get("/documents")
          .expect(200);

      expect(userADocuments.body).toHaveLength(1);

      expect(
        userADocuments.body[0].name
      ).toBe("User A Private Resume");

      const userBDocuments =
        await userB.agent
          .get("/documents")
          .expect(200);

      expect(userBDocuments.body).toEqual([]);

      await userB.agent
        .get(`/documents/${documentId}`)
        .expect(404);

      await userB.agent
        .get(
          `/documents/${documentId}/download`
        )
        .expect(404);
    }
  );

  it(
    "does not allow User B to delete User A's document",
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

      const uploadResponse =
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
        uploadResponse.body.id;

      await userB.agent
        .delete(`/documents/${documentId}`)
        .set(
          "X-CSRF-Token",
          userB.csrfToken
        )
        .expect(404);

      const stillExists =
        await userA.agent
          .get(`/documents/${documentId}`)
          .expect(200);

      expect(stillExists.body.id).toBe(
        documentId
      );
    }
  );
});