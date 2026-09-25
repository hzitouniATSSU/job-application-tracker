import {
  describe,
  it,
  expect,
  beforeEach,
} from "vitest";

import fs from "fs/promises";
import path from "path";
import request from "supertest";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";

import {
  authHeaders,
  sessionCookie,
} from "../helpers/auth.js";
import { createTestUser } from "../helpers/users.js";

const documentStoragePath = path.join(
  process.cwd(),
  "storage",
  "documents"
);

const PDF = "application/pdf";
const DOC = "application/msword";
const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const pdfBytes = Buffer.from("%PDF-1.4\n% test document\n%%EOF\n");

async function storedFiles() {
  const files = await fs.readdir(documentStoragePath);
  return files.filter((file) => file !== ".gitkeep").sort();
}

let user;

beforeEach(async () => {
  await Promise.all(
    (await storedFiles()).map((file) =>
      fs.unlink(path.join(documentStoragePath, file))
    )
  );

  user = await createTestUser({ email: "uploads@test.local" });
});

function upload({
  buffer = pdfBytes,
  filename = "resume.pdf",
  contentType = PDF,
  field = "file",
  name,
  headers = authHeaders(user.id),
} = {}) {
  const req = request(app).post("/documents").set(headers);

  if (name !== undefined) {
    req.field("name", name);
  }

  return req.attach(field, buffer, { filename, contentType });
}

describe("POST /documents", () => {
  it("stores a PDF under a random name and records its metadata", async () => {
    const before = await storedFiles();

    const response = await upload({ name: "My Resume" }).expect(201);

    expect(response.body).toMatchObject({
      name: "My Resume",
      originalName: "resume.pdf",
      mimeType: PDF,
      size: pdfBytes.length,
      userId: user.id,
    });

    expect(response.body.storedName).toMatch(
      /^[0-9a-f-]{36}\.pdf$/
    );

    const after = await storedFiles();
    expect(after).toEqual(
      [...before, response.body.storedName].sort()
    );

    const saved = await fs.readFile(
      path.join(documentStoragePath, response.body.storedName)
    );
    expect(saved.equals(pdfBytes)).toBe(true);
  });

  it("defaults the display name to the original file name", async () => {
    const response = await upload().expect(201);

    expect(response.body.name).toBe("resume.pdf");
  });

  it.each([
    ["resume.doc", DOC],
    ["resume.docx", DOCX],
  ])("accepts %s", async (filename, contentType) => {
    const response = await upload({ filename, contentType }).expect(201);

    expect(response.body.mimeType).toBe(contentType);
  });

  it.each([
    ["notes.txt", "text/plain"],
    ["photo.png", "image/png"],
    ["page.html", "text/html"],
    ["script.js", "application/javascript"],
    ["archive.zip", "application/zip"],
  ])("rejects %s (%s) without storing anything", async (filename, contentType) => {
    const response = await upload({
      buffer: Buffer.from("not a document"),
      filename,
      contentType,
    }).expect(400);

    expect(response.body).toEqual({
      error: "Only PDF, DOC, and DOCX files are allowed",
    });
    expect(await storedFiles()).toEqual([]);
    expect(await prisma.document.count()).toBe(0);
  });

  it("rejects files over 5 MB and removes the partial upload", async () => {
    const response = await upload({
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 0x20),
    }).expect(400);

    expect(response.body).toEqual({
      error: "File must be 5 MB or smaller",
    });
    expect(await storedFiles()).toEqual([]);
    expect(await prisma.document.count()).toBe(0);
  });

  it("accepts a file just under 5 MB", async () => {
    // busboy treats a file of exactly fileSize bytes as over the limit.
    await upload({
      buffer: Buffer.alloc(5 * 1024 * 1024 - 1, 0x20),
    }).expect(201);
  });

  it("returns 400 when no file is attached", async () => {
    const response = await request(app)
      .post("/documents")
      .set(authHeaders(user.id))
      .field("name", "No file")
      .expect(400);

    expect(response.body).toEqual({
      error: "A document file is required",
    });
  });

  it("returns 400 for a JSON request with no file", async () => {
    await request(app)
      .post("/documents")
      .set(authHeaders(user.id))
      .send({ name: "Not multipart" })
      .expect(400);
  });

  it("returns 400 when the file uses an unexpected field name", async () => {
    await upload({ field: "document" }).expect(400);

    expect(await storedFiles()).toEqual([]);
  });

  it("returns 400 (not 500) for a truncated multipart body", async () => {
    const response = await request(app)
      .post("/documents")
      .set(authHeaders(user.id))
      .set("Content-Type", "multipart/form-data; boundary=xyz")
      .send(
        '--xyz\r\nContent-Disposition: form-data; name="file"; ' +
          'filename="a.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF'
      )
      .expect(400);

    expect(response.body).toEqual({ error: "Malformed upload request" });
    expect(await storedFiles()).toEqual([]);
    expect(await prisma.document.count()).toBe(0);
  });

  it("returns 400 (not 500) for a multipart body without a boundary", async () => {
    await request(app)
      .post("/documents")
      .set(authHeaders(user.id))
      .set("Content-Type", "multipart/form-data")
      .send("garbage")
      .expect(400);
  });

  it("does not let the client-supplied file name escape the storage folder", async () => {
    const response = await upload({
      filename: "../../../evil.pdf",
    }).expect(201);

    expect(response.body.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(await storedFiles()).toEqual([response.body.storedName]);
  });

  it("rejects unauthenticated uploads before writing a file", async () => {
    await upload({
      headers: { Cookie: "csrfToken=abc", "X-CSRF-Token": "abc" },
    }).expect(401);

    expect(await storedFiles()).toEqual([]);
  });
});

describe("GET /documents/:id/download", () => {
  it("returns the file as an attachment with its original name", async () => {
    const created = await upload({ filename: "My CV.pdf" }).expect(201);

    const response = await request(app)
      .get(`/documents/${created.body.id}/download`)
      .set("Cookie", sessionCookie(user.id))
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(response.headers["content-disposition"]).toBe(
      'attachment; filename="My CV.pdf"'
    );
    expect(response.body.equals(pdfBytes)).toBe(true);
  });

  it("returns 404 when the stored file is missing from disk", async () => {
    const created = await upload().expect(201);

    await fs.unlink(
      path.join(documentStoragePath, created.body.storedName)
    );

    const response = await request(app)
      .get(`/documents/${created.body.id}/download`)
      .set("Cookie", sessionCookie(user.id))
      .expect(404);

    expect(response.body).toEqual({ error: "Stored file not found" });
  });

  it("returns 400 for an invalid ID", async () => {
    await request(app)
      .get("/documents/abc/download")
      .set("Cookie", sessionCookie(user.id))
      .expect(400);
  });
});

describe("DELETE /documents/:id", () => {
  it("removes the database record and the stored file", async () => {
    const created = await upload().expect(201);

    await request(app)
      .delete(`/documents/${created.body.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    expect(await storedFiles()).toEqual([]);

    await request(app)
      .get(`/documents/${created.body.id}`)
      .set("Cookie", sessionCookie(user.id))
      .expect(404);
  });

  it("still succeeds when the stored file is already gone", async () => {
    const created = await upload().expect(201);

    await fs.unlink(
      path.join(documentStoragePath, created.body.storedName)
    );

    await request(app)
      .delete(`/documents/${created.body.id}`)
      .set(authHeaders(user.id))
      .expect(200);
  });

  it("detaches the document from jobs without deleting the job", async () => {
    const job = await prisma.job.create({
      data: { company: "Acme", title: "Engineer", userId: user.id },
    });

    const created = await upload().expect(201);

    await request(app)
      .post(`/documents/${created.body.id}/jobs/${job.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    await request(app)
      .delete(`/documents/${created.body.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    const jobAfter = await prisma.job.findUnique({
      where: { id: job.id },
      include: { documents: true },
    });

    expect(jobAfter.documents).toEqual([]);
  });
});

describe("document attachments", () => {
  it("attaches and detaches a document from the caller's job", async () => {
    const job = await prisma.job.create({
      data: { company: "Acme", title: "Engineer", userId: user.id },
    });

    const created = await upload().expect(201);

    const attached = await request(app)
      .post(`/documents/${created.body.id}/jobs/${job.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    expect(attached.body.jobs.map((j) => j.id)).toEqual([job.id]);

    // Attaching twice is idempotent.
    await request(app)
      .post(`/documents/${created.body.id}/jobs/${job.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    const detached = await request(app)
      .delete(`/documents/${created.body.id}/jobs/${job.id}`)
      .set(authHeaders(user.id))
      .expect(200);

    expect(detached.body.jobs).toEqual([]);

    // Detaching something that is not attached is a 404.
    await request(app)
      .delete(`/documents/${created.body.id}/jobs/${job.id}`)
      .set(authHeaders(user.id))
      .expect(404);
  });

  it("returns 400 for invalid document or job IDs", async () => {
    await request(app)
      .post("/documents/abc/jobs/1")
      .set(authHeaders(user.id))
      .expect(400);

    await request(app)
      .delete("/documents/1/jobs/99999999999")
      .set(authHeaders(user.id))
      .expect(400);
  });
});
