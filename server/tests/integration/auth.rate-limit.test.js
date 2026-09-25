import {
  describe,
  it,
  expect,
} from "vitest";

import app from "../../app.js";

import { csrfAgent } from "../helpers/auth.js";

// Each test file gets a fresh app (and fresh in-memory limiters), so
// these tests can exhaust the limits without affecting other files.

async function post(url, body) {
  const { agent, csrfToken } = await csrfAgent(app);

  return agent.post(url).set("X-CSRF-Token", csrfToken).send(body);
}

describe("authentication rate limits", () => {
  it("blocks login after 10 attempts in the window", async () => {
    const credentials = {
      email: "brute@test.local",
      password: "WrongPassword123!",
    };

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await post("/auth/login", credentials);
      expect(response.status).toBe(401);
    }

    const blocked = await post("/auth/login", credentials);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      error: "Too many login attempts. Please try again later.",
    });
  });

  it("blocks registration after 5 attempts in the window", async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await post("/auth/register", {
        email: `spam${attempt}@test.local`,
        password: "short",
      });
      expect(response.status).toBe(400);
    }

    const blocked = await post("/auth/register", {
      email: "spam6@test.local",
      password: "LongEnoughPassword123!",
    });

    expect(blocked.status).toBe(429);
  });
});
