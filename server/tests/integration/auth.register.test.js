import {
  describe,
  it,
  expect,
} from "vitest";

import crypto from "crypto";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";
import { sendVerificationEmail } from "../../lib/email.js";

import { csrfAgent } from "../helpers/auth.js";
import { createTestUser } from "../helpers/users.js";

// /auth/register allows 5 requests per hour per IP, and the limiter
// lives for the lifetime of this test file. Keep the total below 5.

describe("POST /auth/register", () => {
  it("creates an unverified account and sends a verification email", async () => {
    const { agent, csrfToken } = await csrfAgent(app);
    const password = "RegisterPassword123!";

    const response = await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({
        email: "  New.User@Test.Local ",
        password,
      })
      .expect(201);

    expect(response.body.user).toEqual({
      id: expect.any(Number),
      email: "new.user@test.local",
      name: null,
      hasProfilePhoto: false,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    // Registration must not sign the user in.
    const setCookies = response.headers["set-cookie"] ?? [];
    expect(
      setCookies.some((cookie) => cookie.startsWith("session="))
    ).toBe(false);

    const savedUser = await prisma.user.findUnique({
      where: { email: "new.user@test.local" },
      include: { emailVerificationTokens: true },
    });

    expect(savedUser.emailVerifiedAt).toBeNull();
    expect(savedUser.passwordHash).not.toBe(password);
    expect(savedUser.passwordHash).toMatch(/^\$2[aby]\$/);

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

    const { to, verificationToken } =
      sendVerificationEmail.mock.calls[0][0];

    expect(to).toBe("new.user@test.local");

    // Only the hash of the emailed token is stored.
    expect(savedUser.emailVerificationTokens).toHaveLength(1);
    expect(savedUser.emailVerificationTokens[0].tokenHash).toBe(
      crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex")
    );
  });

  it("rejects a duplicate email regardless of case and whitespace", async () => {
    await createTestUser({ email: "taken@test.local" });

    const { agent, csrfToken } = await csrfAgent(app);

    const response = await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({
        email: " TAKEN@test.local",
        password: "AnotherPassword123!",
      })
      .expect(409);

    expect(response.body).toEqual({
      error: "An account with this email already exists",
    });

    expect(
      await prisma.user.count({
        where: { email: "taken@test.local" },
      })
    ).toBe(1);

    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("still creates the account when the verification email fails", async () => {
    sendVerificationEmail.mockRejectedValueOnce(
      new Error("Email provider unavailable")
    );

    const { agent, csrfToken } = await csrfAgent(app);

    await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrfToken)
      .send({
        email: "flaky-email@test.local",
        password: "RegisterPassword123!",
      })
      .expect(201);

    expect(
      await prisma.user.findUnique({
        where: { email: "flaky-email@test.local" },
      })
    ).not.toBeNull();
  });
});
