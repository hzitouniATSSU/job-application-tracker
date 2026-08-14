import { test, expect } from "vitest";

import {
  validateCreateJob,
  validateUpdateJob,
} from "../middleware/validateJob.js";

function createResponse() {
  return {
    statusCode: 200,
    body: null,

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

test("create validation rejects an empty company", () => {
  const req = {
    body: {
      company: "",
      title: "support engineer",
    },
  };

  const res = createResponse();
  let nextCalled = false;

  validateCreateJob(req, res, () => {
    nextCalled = true;
  });

  expect(res.statusCode).toBe(400);

  expect(res.body).toEqual({
    error: "Company is required",
  });

  expect(nextCalled).toBe(false);
});

test("create validation accepts a valid job", () => {
  const req = {
    body: {
      company: "  Canonical  ",
      title: "  Support Engineer  ",
      location: "Remote",
    },
  };

  const res = createResponse();
  let nextCalled = false;

  validateCreateJob(req, res, () => {
    nextCalled = true;
  });

  expect(nextCalled).toBe(true);

  expect(req.body.company).toBe("Canonical");
  expect(req.body.title).toBe("Support Engineer");
});

test("update validation rejects an invalid status", () => {
  const req = {
    body: {
      status: "MAYBE",
    },
  };

  const res = createResponse();
  let nextCalled = false;

  validateUpdateJob(req, res, () => {
    nextCalled = true;
  });

  expect(res.statusCode).toBe(400);

  expect(res.body).toEqual({
    error: "Invalid application status",
  });

  expect(nextCalled).toBe(false);
});

test("update validation accepts a valid status", () => {
  const req = {
    body: {
      status: "INTERVIEW",
    },
  };

  const res = createResponse();
  let nextCalled = false;

  validateUpdateJob(req, res, () => {
    nextCalled = true;
  });

  expect(nextCalled).toBe(true);
  expect(res.statusCode).toBe(200);
});