import { test, expect } from "vitest";
import multer from "multer";

import errorHandler, {
  notFound,
} from "../middleware/errorHandler.js";

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    headersSent: false,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("notFound returns a JSON 404 response", () => {
  const req = {
    method: "GET",
    originalUrl: "/missing-route",
  };

  const res = createResponse();

  notFound(req, res);

  expect(res.statusCode).toBe(404);

  expect(res.body).toEqual({
    error: "Route GET /missing-route not found",
  });
});

test("errorHandler handles Multer file-size errors", () => {
  const error = new multer.MulterError(
    "LIMIT_FILE_SIZE"
  );

  const res = createResponse();
  let nextCalled = false;

  errorHandler(error, {}, res, () => {
    nextCalled = true;
  });

  expect(res.statusCode).toBe(400);

  expect(res.body).toEqual({
    error: "File must be 5 MB or smaller",
  });

  expect(nextCalled).toBe(false);
});

test("errorHandler returns a custom safe error", () => {
  const error = new Error("Invalid request");
  error.statusCode = 400;

  const res = createResponse();

  errorHandler(error, {}, res, () => {});

  expect(res.statusCode).toBe(400);

  expect(res.body).toEqual({
    error: "Invalid request",
  });
});