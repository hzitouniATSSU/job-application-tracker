import jwt from "jsonwebtoken";
import request from "supertest";

export async function loginAgent(
  app,
  email,
  password
) {
  const agent = request.agent(app);

  const csrfResponse = await agent
    .get("/auth/csrf")
    .expect(200);

  const csrfToken =
    csrfResponse.body.csrfToken;

  await agent
    .post("/auth/login")
    .set(
      "X-CSRF-Token",
      csrfToken
    )
    .send({
      email,
      password,
    })
    .expect(200);

  return {
    agent,
    csrfToken,
  };
}

export async function csrfAgent(app) {
  const agent = request.agent(app);

  const csrfResponse = await agent
    .get("/auth/csrf")
    .expect(200);

  return {
    agent,
    csrfToken: csrfResponse.body.csrfToken,
  };
}

// Mints a session JWT directly, bypassing /auth/login (and its rate
// limiter). Options allow forging invalid tokens for negative tests.
export function sessionCookie(
  userId,
  {
    secret = process.env.JWT_SECRET,
    expiresIn = "15m",
    issuer = "job-application-tracker",
    audience = "job-application-tracker-client",
  } = {}
) {
  const token = jwt.sign(
    { sub: String(userId) },
    secret,
    { expiresIn, issuer, audience }
  );

  return `session=${token}`;
}

// Headers for an authenticated, CSRF-valid request without going
// through /auth/login. The CSRF check is double-submit, so any value
// works as long as the cookie and header match.
export function authHeaders(
  userId,
  csrfToken = "test-csrf-token"
) {
  return {
    Cookie: `${sessionCookie(userId)}; csrfToken=${csrfToken}`,
    "X-CSRF-Token": csrfToken,
  };
}
