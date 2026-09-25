import { test, expect, vi } from "vitest";
import { Writable } from "stream";
import express from "express";
import request from "supertest";

const logLines = vi.hoisted(() => []);

vi.mock("../lib/logger.js", async () => {
  const { default: pino } = await import("pino");

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      logLines.push(chunk.toString());
      callback();
    },
  });

  return { default: pino({ level: "info" }, stream) };
});

const { default: requestLogger } = await import(
  "../middleware/requestLogger.js"
);

test("request logs never contain session, CSRF or authorization secrets", async () => {
  const app = express();
  app.use(requestLogger);

  app.post("/login", (req, res) => {
    res.cookie("session", "SESSION-JWT-SECRET", { httpOnly: true });
    res.cookie("csrfToken", "CSRF-COOKIE-SECRET");
    res.status(200).json({ ok: true });
  });

  await request(app)
    .post("/login")
    .set("Cookie", "session=OLD-SESSION-SECRET; csrfToken=OLD-CSRF-SECRET")
    .set("X-CSRF-Token", "CSRF-HEADER-SECRET")
    .set("Authorization", "Bearer AUTH-HEADER-SECRET")
    .expect(200);

  const output = logLines.join("\n");

  // Sanity check that the request was actually logged.
  expect(output).toContain('"url":"/login"');
  expect(output).toContain("[REDACTED]");

  for (const secret of [
    "SESSION-JWT-SECRET",
    "CSRF-COOKIE-SECRET",
    "OLD-SESSION-SECRET",
    "OLD-CSRF-SECRET",
    "CSRF-HEADER-SECRET",
    "AUTH-HEADER-SECRET",
  ]) {
    expect(output).not.toContain(secret);
  }
});
