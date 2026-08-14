import {
  describe,
  it,
  expect,
} from "vitest";


import request from "supertest";
import app from "../../app.js";


import {
  createTestUser,
} from "../helpers/users.js";

import {
  loginAgent,
} from "../helpers/auth.js";

describe("Authentication and CSRF security", () => {
  it("rejects unauthenticated access to protected routes", async () => {
    await request(app)
  .get("/jobs")
  .expect(401);
  });

  it("rejects mutations without a CSRF token", async () => {
    const password = "TestPassword123!";

    await createTestUser({
      email: "user@test.local",
      password,
    });

    const { agent } = await loginAgent(
      app,
      "user@test.local",
      password
    );

    await agent
      .post("/jobs")
      .send({
        company: "Should Fail",
        title: "Support Engineer",
      })
      .expect(403);
  });

  it("allows a valid authenticated mutation with CSRF", async () => {
    const password = "TestPassword123!";

    await createTestUser({
      email: "user@test.local",
      password,
    });

    const user = await loginAgent(
      app,
      "user@test.local",
      password
    );

    const response = await user.agent
      .post("/jobs")
      .set(
        "X-CSRF-Token",
        user.csrfToken
      )
      .send({
        company: "Canonical",
        title: "Support Engineer",
      })
      .expect(201);

    expect(response.body.company).toBe(
      "Canonical"
    );
  });

  it("invalidates the session after logout", async () => {
    const password = "TestPassword123!";

    await createTestUser({
      email: "user@test.local",
      password,
    });

    const user = await loginAgent(
      app,
      "user@test.local",
      password
    );

    await user.agent
      .post("/auth/logout")
      .set(
        "X-CSRF-Token",
        user.csrfToken
      )
      .expect(204);

    await user.agent
      .get("/jobs")
      .expect(401);
  });

  it("allows unverified users to log in for now", async () => {
    const password = "TestPassword123!";

    await createTestUser({
      email: "unverified@test.local",
      password,
      emailVerified: false,
    });

    const agent = await loginAgent(
      app,
      "unverified@test.local",
      password
    );

    await agent.agent
      .get("/jobs")
      .expect(200);
  });
});

