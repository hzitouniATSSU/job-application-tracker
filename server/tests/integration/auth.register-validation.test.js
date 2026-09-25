import {
  describe,
  it,
  expect,
} from "vitest";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";

import { csrfAgent } from "../helpers/auth.js";

// /auth/register allows 5 requests per hour per IP, and the limiter
// lives for the lifetime of this test file. Keep the total at 5.

async function register(body) {
  const { agent, csrfToken } = await csrfAgent(app);

  const request = agent
    .post("/auth/register")
    .set("X-CSRF-Token", csrfToken);

  return body === undefined ? request : request.send(body);
}

describe("POST /auth/register validation", () => {
  it("returns 400 (not 500) when the request has no body", async () => {
    const response = await register(undefined);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Email and password are required",
    });
  });

  it("rejects a malformed email address", async () => {
    const response = await register({
      email: "not-an-email",
      password: "ValidPassword123!",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Enter a valid email address",
    });
  });

  it("rejects a password shorter than 12 characters", async () => {
    const response = await register({
      email: "short@test.local",
      password: "Short1!",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Password must be between 12 and 128 characters",
    });
  });

  it("rejects a password longer than 128 characters", async () => {
    const response = await register({
      email: "long@test.local",
      password: "a".repeat(129),
    });

    expect(response.status).toBe(400);
  });

  it("rejects a non-string password", async () => {
    const response = await register({
      email: "object@test.local",
      password: { $gt: "" },
    });

    expect(response.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });
});
