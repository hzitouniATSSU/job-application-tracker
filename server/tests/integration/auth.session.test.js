import {
  describe,
  it,
  expect,
} from "vitest";

import request from "supertest";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";
import { verifyAccessToken } from "../../lib/auth.js";

import {
  csrfAgent,
  loginAgent,
  sessionCookie,
  authHeaders,
} from "../helpers/auth.js";
import { createTestUser } from "../helpers/users.js";

// /auth/login allows 10 requests per 15 minutes per IP, and the limiter
// lives for the lifetime of this test file. Keep the total below 10;
// /auth/me and logout tests use minted session cookies instead.

const password = "TestPassword123!";

function findCookie(response, name) {
  return (response.headers["set-cookie"] ?? []).find((cookie) =>
    cookie.startsWith(`${name}=`)
  );
}

async function login(body) {
  const { agent, csrfToken } = await csrfAgent(app);

  const req = agent
    .post("/auth/login")
    .set("X-CSRF-Token", csrfToken);

  return body === undefined ? req : req.send(body);
}

describe("POST /auth/login", () => {
  it("sets an HttpOnly session cookie and returns the public user", async () => {
    const user = await createTestUser({
      email: "login@test.local",
      password,
    });

    const response = await login({
      email: "login@test.local",
      password,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: user.id,
        email: "login@test.local",
        name: null,
        hasProfilePhoto: false,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    });

    const cookie = findCookie(response, "session");

    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/; HttpOnly/);
    expect(cookie).toMatch(/; SameSite=Lax/);
    expect(cookie).toMatch(/; Path=\//);
    expect(cookie).toMatch(/; Max-Age=900/);

    const token = cookie.split(";")[0].slice("session=".length);
    expect(verifyAccessToken(token).sub).toBe(String(user.id));
  });

  it("treats the email as case-insensitive and trims whitespace", async () => {
    await createTestUser({
      email: "mixed@test.local",
      password,
    });

    const response = await login({
      email: "  MIXED@Test.Local ",
      password,
    });

    expect(response.status).toBe(200);
  });

  it("returns the same 401 for a wrong password and an unknown email", async () => {
    await createTestUser({
      email: "known@test.local",
      password,
    });

    const wrongPassword = await login({
      email: "known@test.local",
      password: "WrongPassword123!",
    });

    const unknownEmail = await login({
      email: "unknown@test.local",
      password,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body).toEqual({
      error: "Invalid email or password",
    });
    expect(findCookie(wrongPassword, "session")).toBeUndefined();
  });

  it("rejects missing or non-string credentials with 400", async () => {
    const missingPassword = await login({
      email: "someone@test.local",
    });

    const objectEmail = await login({
      email: { $ne: null },
      password,
    });

    expect(missingPassword.status).toBe(400);
    expect(objectEmail.status).toBe(400);
  });

  it("returns 400 (not 500) when the request has no body", async () => {
    const response = await login(undefined);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Email and password are required",
    });
  });
});

describe("GET /auth/me", () => {
  it("returns the current user for a valid session", async () => {
    const user = await createTestUser({
      email: "me@test.local",
    });

    const response = await request(app)
      .get("/auth/me")
      .set("Cookie", sessionCookie(user.id))
      .expect(200);

    expect(response.body.user.id).toBe(user.id);
    expect(response.body.user.email).toBe("me@test.local");
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body.user).not.toHaveProperty(
      "profilePhotoStoredName"
    );
  });

  it("returns 401 without a session cookie", async () => {
    const response = await request(app)
      .get("/auth/me")
      .expect(401);

    expect(response.body).toEqual({
      error: "Authentication required",
    });
  });

  it.each([
    ["signed with the wrong secret", { secret: "not-the-real-secret" }],
    ["expired", { expiresIn: -10 }],
    ["issued for another audience", { audience: "someone-else" }],
    ["issued by another issuer", { issuer: "someone-else" }],
  ])("returns 401 for a token %s", async (_label, options) => {
    const user = await createTestUser({
      email: "forged@test.local",
    });

    await request(app)
      .get("/auth/me")
      .set("Cookie", sessionCookie(user.id, options))
      .expect(401);
  });

  it("returns 401 for a tampered token", async () => {
    const user = await createTestUser({
      email: "tampered@test.local",
    });

    const cookie = sessionCookie(user.id);
    const tampered = cookie.slice(0, -2) + (cookie.endsWith("a") ? "bb" : "aa");

    await request(app)
      .get("/auth/me")
      .set("Cookie", tampered)
      .expect(401);
  });

  it("returns 401 for a token whose subject is not a user id", async () => {
    await request(app)
      .get("/auth/me")
      .set("Cookie", sessionCookie("not-a-number"))
      .expect(401);
  });

  it("returns 404 when the session's user no longer exists", async () => {
    const user = await createTestUser({
      email: "deleted@test.local",
    });

    await prisma.user.delete({ where: { id: user.id } });

    await request(app)
      .get("/auth/me")
      .set("Cookie", sessionCookie(user.id))
      .expect(404);
  });
});

describe("POST /auth/logout", () => {
  it("clears the session and CSRF cookies", async () => {
    const user = await createTestUser({
      email: "logout@test.local",
    });

    const response = await request(app)
      .post("/auth/logout")
      .set(authHeaders(user.id))
      .expect(204);

    const session = findCookie(response, "session");
    const csrf = findCookie(response, "csrfToken");

    expect(session).toMatch(/^session=;/);
    expect(session).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(csrf).toMatch(/^csrfToken=;/);
  });

  it("requires authentication", async () => {
    await request(app)
      .post("/auth/logout")
      .set({
        Cookie: "csrfToken=abc",
        "X-CSRF-Token": "abc",
      })
      .expect(401);
  });

  it("requires a CSRF token", async () => {
    const user = await createTestUser({
      email: "logout-csrf@test.local",
    });

    await request(app)
      .post("/auth/logout")
      .set("Cookie", sessionCookie(user.id))
      .expect(403);
  });

  it("logs the agent out end to end", async () => {
    await createTestUser({
      email: "roundtrip@test.local",
      password,
    });

    const { agent, csrfToken } = await loginAgent(
      app,
      "roundtrip@test.local",
      password
    );

    await agent.get("/auth/me").expect(200);

    await agent
      .post("/auth/logout")
      .set("X-CSRF-Token", csrfToken)
      .expect(204);

    await agent.get("/auth/me").expect(401);
  });
});
