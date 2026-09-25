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

// /auth/resend-verification shares a 5-requests-per-15-minutes limiter
// with /auth/forgot-password; keep this file's total below 5.

const genericResponse = {
  message:
    "If the account exists and is not verified, a verification email will be sent.",
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function post(url, body) {
  const { agent, csrfToken } = await csrfAgent(app);

  return agent.post(url).set("X-CSRF-Token", csrfToken).send(body);
}

describe("POST /auth/resend-verification", () => {
  it("replaces the token and emails an unverified user", async () => {
    const user = await createTestUser({
      email: "unverified@test.local",
      emailVerified: false,
    });

    await prisma.emailVerificationToken.create({
      data: {
        tokenHash: sha256("old-token"),
        expiresAt: new Date(Date.now() + 60_000),
        userId: user.id,
      },
    });

    const response = await post("/auth/resend-verification", {
      email: "Unverified@Test.local",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(genericResponse);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

    const { verificationToken } = sendVerificationEmail.mock.calls[0][0];
    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: user.id },
    });

    expect(tokens.map((token) => token.tokenHash)).toEqual([
      sha256(verificationToken),
    ]);
  });

  it("gives the same response for verified and unknown accounts without sending mail", async () => {
    await createTestUser({ email: "verified@test.local" });

    const verified = await post("/auth/resend-verification", {
      email: "verified@test.local",
    });

    const unknown = await post("/auth/resend-verification", {
      email: "nobody@test.local",
    });

    expect(verified.body).toEqual(genericResponse);
    expect(unknown.body).toEqual(genericResponse);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});

describe("POST /auth/verify-email", () => {
  it("returns 400 when no token is provided", async () => {
    const response = await post("/auth/verify-email", {});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Verification token is required",
    });
  });

  it("does not accept a non-string token", async () => {
    const response = await post("/auth/verify-email", {
      token: { contains: "" },
    });

    expect(response.status).toBe(400);
  });
});
