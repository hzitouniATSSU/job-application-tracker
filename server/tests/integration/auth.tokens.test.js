import {
  describe,
  it,
  expect,
} from "vitest";

import crypto from "crypto";
import request from "supertest";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";

import {
  createTestUser,
} from "../helpers/users.js";

describe("Authentication token security", () => {
  it("allows a password reset token to be used only once", async () => {
    const user = await createTestUser({
      email: "reset@test.local",
      password: "OldPassword123!",
    });

    const rawToken =
      crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        expiresAt: new Date(
          Date.now() + 30 * 60 * 1000
        ),
        userId: user.id,
      },
    });

    const agent = request.agent(app);

    const csrfResponse = await agent
      .get("/auth/csrf")
      .expect(200);

    const csrfToken =
      csrfResponse.body.csrfToken;

    await agent
      .post("/auth/reset-password")
      .set(
        "X-CSRF-Token",
        csrfToken
      )
      .send({
        token: rawToken,
        password: "NewPassword123!",
      })
      .expect(200);

    const secondCsrfResponse = await agent
      .get("/auth/csrf")
      .expect(200);

    const secondCsrfToken =
      secondCsrfResponse.body.csrfToken;

    await agent
      .post("/auth/reset-password")
      .set(
        "X-CSRF-Token",
        secondCsrfToken
      )
      .send({
        token: rawToken,
        password: "AnotherPassword123!",
      })
      .expect(400);

    const storedToken =
      await prisma.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },
      });

    expect(storedToken).toBeNull();
  });

  it("allows an email verification token to be used only once", async () => {
    const user = await createTestUser({
      email: "verify@test.local",
      password: "TestPassword123!",
      emailVerified: false,
    });

    const rawToken =
      crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        expiresAt: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ),
        userId: user.id,
      },
    });

    const agent = request.agent(app);

    const csrfResponse = await agent
      .get("/auth/csrf")
      .expect(200);

    const csrfToken =
      csrfResponse.body.csrfToken;

    await agent
      .post("/auth/verify-email")
      .set(
        "X-CSRF-Token",
        csrfToken
      )
      .send({
        token: rawToken,
      })
      .expect(200);

    const verifiedUser =
      await prisma.user.findUnique({
        where: {
          id: user.id,
        },
      });

    expect(
      verifiedUser.emailVerifiedAt
    ).not.toBeNull();

    const secondCsrfResponse = await agent
      .get("/auth/csrf")
      .expect(200);

    const secondCsrfToken =
      secondCsrfResponse.body.csrfToken;

    await agent
      .post("/auth/verify-email")
      .set(
        "X-CSRF-Token",
        secondCsrfToken
      )
      .send({
        token: rawToken,
      })
      .expect(400);

    const storedToken =
      await prisma.emailVerificationToken.findUnique({
        where: {
          tokenHash,
        },
      });

    expect(storedToken).toBeNull();
  });

  it("rejects an expired password reset token", async () => {
  const user = await createTestUser({
    email: "expired-reset@test.local",
    password: "OldPassword123!",
  });

  const rawToken =
    crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      expiresAt: new Date(
        Date.now() - 60 * 1000
      ),
      userId: user.id,
    },
  });

  const agent = request.agent(app);

  const csrfResponse = await agent
    .get("/auth/csrf")
    .expect(200);

  const csrfToken =
    csrfResponse.body.csrfToken;

  const response = await agent
    .post("/auth/reset-password")
    .set(
      "X-CSRF-Token",
      csrfToken
    )
    .send({
      token: rawToken,
      password: "NewPassword123!",
    })
    .expect(400);

  expect(response.body).toEqual({
    error: "Reset link is invalid or has expired",
  });

  const storedToken =
    await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
    });

  expect(storedToken).toBeNull();
});

it("rejects an expired email verification token", async () => {
  const user = await createTestUser({
    email: "expired-verify@test.local",
    password: "TestPassword123!",
    emailVerified: false,
  });

  const rawToken =
    crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  await prisma.emailVerificationToken.create({
    data: {
      tokenHash,
      expiresAt: new Date(
        Date.now() - 60 * 1000
      ),
      userId: user.id,
    },
  });

  const agent = request.agent(app);

  const csrfResponse = await agent
    .get("/auth/csrf")
    .expect(200);

  const csrfToken =
    csrfResponse.body.csrfToken;

  const response = await agent
    .post("/auth/verify-email")
    .set(
      "X-CSRF-Token",
      csrfToken
    )
    .send({
      token: rawToken,
    })
    .expect(400);

  expect(response.body).toEqual({
    error:
      "Verification link is invalid or has expired",
  });

  const storedToken =
    await prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
    });

  expect(storedToken).toBeNull();

  const unchangedUser =
    await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

  expect(
    unchangedUser.emailVerifiedAt
  ).toBeNull();
});
});