import assert from "node:assert/strict";
import test from "node:test";

import {
  validateCreateJob,
  validateUpdateJob,
} from "../middleware/validateJob.js";
import { title } from "node:process";

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

  assert.equal(res.statusCode, 400);

  assert.deepEqual(res.body, {
    error: "Company is required",
  });

  assert.equal(nextCalled, false);
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

  assert.equal(nextCalled, true);

  assert.equal(req.body.company, "Canonical");

  assert.equal(req.body.title, "Support Engineer");
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

  assert.equal(res.statusCode, 400);

  assert.deepEqual(res.body, {
    error: "Invalid application status",
  });

  assert.equal(nextCalled, false);
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

  assert.equal(nextCalled, true);

  assert.equal(res.statusCode, 200);
});
