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