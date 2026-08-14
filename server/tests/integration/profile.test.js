import { describe, expect, it } from "vitest";
import app from "../../app.js";
import prisma from "../../lib/prisma.js";
import { loginAgent } from "../helpers/auth.js";
import { createTestUser } from "../helpers/users.js";

describe("Profile settings", () => {
  it("updates the authenticated user's display name", async () => {
    const email = "profile@test.local";
    const password = "TestPassword123!";
    await createTestUser({ email, password });
    const { agent, csrfToken } = await loginAgent(app, email, password);

    const response = await agent
      .patch("/auth/profile")
      .set("X-CSRF-Token", csrfToken)
      .field("name", "Test User")
      .expect(200);

    expect(response.body.user.name).toBe("Test User");
    const savedUser = await prisma.user.findUnique({ where: { email } });
    expect(savedUser.name).toBe("Test User");
  });
});
