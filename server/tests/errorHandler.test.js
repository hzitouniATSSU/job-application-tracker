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
test("errorHandler turns malformed multipart errors into a 400", () => {
  const res = createResponse();

  errorHandler(
    new Error("Unexpected end of form"),
    {},
    res,
    () => {}
  );

  expect(res.statusCode).toBe(400);

  expect(res.body).toEqual({
    error: "Malformed upload request",
  });
});

test("errorHandler hides internal error messages behind a generic 500", () => {
  const res = createResponse();

  errorHandler(
    new Error("connect ECONNREFUSED 10.0.0.5:5432"),
    {},
    res,
    () => {}
  );

  expect(res.statusCode).toBe(500);

  expect(res.body).toEqual({
    error: "Internal server error",
  });
});

test("errorHandler delegates when headers were already sent", () => {
  const res = createResponse();
  res.headersSent = true;
  const error = new Error("late failure");
  let forwarded;

  errorHandler(error, {}, res, (value) => {
    forwarded = value;
  });

  expect(forwarded).toBe(error);
  expect(res.body).toBeNull();
});
