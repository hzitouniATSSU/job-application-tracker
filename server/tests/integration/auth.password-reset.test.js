import {
  describe,
  it,
  expect,
} from "vitest";

import crypto from "crypto";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";
import { sendPasswordResetEmail } from "../../lib/email.js";

import { csrfAgent } from "../helpers/auth.js";
import { createTestUser } from "../helpers/users.js";

// /auth/forgot-password shares a 5-requests-per-15-minutes limiter with
// /auth/resend-verification; keep this file's total below 5.

const genericResponse = {
  message:
    "If an account exists for that email, a password reset link will be sent.",
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function post(url, body) {
  const { agent, csrfToken } = await csrfAgent(app);

  return agent.post(url).set("X-CSRF-Token", csrfToken).send(body);
}

describe("password reset", () => {
  it("emails a reset token that is stored only as a hash", async () => {
    const user = await createTestUser({ email: "forgot@test.local" });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: sha256("stale-token"),
        expiresAt: new Date(Date.now() + 60_000),
        userId: user.id,
      },
    });

    const response = await post("/auth/forgot-password", {
      email: " FORGOT@test.local ",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(genericResponse);

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const { to, resetToken } = sendPasswordResetEmail.mock.calls[0][0];
    expect(to).toBe("forgot@test.local");

    // Requesting a new link replaces any previous token.
    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: user.id },
    });
    expect(tokens.map((token) => token.tokenHash)).toEqual([
      sha256(resetToken),
    ]);
  });

  it("returns the same response for an unknown email without sending mail", async () => {
    const unknown = await post("/auth/forgot-password", {
      email: "nobody@test.local",
    });

    const empty = await post("/auth/forgot-password", {});

    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(genericResponse);
    expect(empty.body).toEqual(genericResponse);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });

  it("changes the password so only the new one works", async () => {
    const user = await createTestUser({
      email: "reset@test.local",
      password: "OldPassword123!",
    });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: sha256("valid-token"),
        expiresAt: new Date(Date.now() + 60_000),
        userId: user.id,
      },
    });

    await post("/auth/reset-password", {
      token: "valid-token",
      password: "NewPassword123!",
    }).then((response) => expect(response.status).toBe(200));

    const oldLogin = await post("/auth/login", {
      email: "reset@test.local",
      password: "OldPassword123!",
    });

    const newLogin = await post("/auth/login", {
      email: "reset@test.local",
      password: "NewPassword123!",
    });

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  it("rejects a weak new password without consuming the token", async () => {
    const user = await createTestUser({ email: "weak@test.local" });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: sha256("keep-me"),
        expiresAt: new Date(Date.now() + 60_000),
        userId: user.id,
      },
    });

    const response = await post("/auth/reset-password", {
      token: "keep-me",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(
      await prisma.passwordResetToken.count({ where: { userId: user.id } })
    ).toBe(1);
  });

  it.each([
    [{}, "Reset token and new password are required"],
    [{ token: "abc" }, "Reset token and new password are required"],
    [{ token: "unknown-token", password: "ValidPassword123!" }, "Reset link is invalid or has expired"],
  ])("rejects %j with 400", async (body, error) => {
    const response = await post("/auth/reset-password", body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error });
  });
});
