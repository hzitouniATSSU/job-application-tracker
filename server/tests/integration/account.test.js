import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "vitest";

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import request from "supertest";

import app from "../../app.js";
import prisma from "../../lib/prisma.js";
import { profilePhotoDirectory } from "../../middleware/profileUpload.js";

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

// 1x1 transparent PNG.
const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

// The profile photo folder is shared with local development, so only
// remove files these tests created.
let photosBefore;

async function listPhotos() {
  return fs.readdir(profilePhotoDirectory);
}

async function newPhotos() {
  return (await listPhotos()).filter((file) => !photosBefore.includes(file));
}

let user;

beforeEach(async () => {
  photosBefore = await listPhotos();
  user = await createTestUser({ email: "account@test.local" });
});

afterEach(async () => {
  await Promise.all(
    (await newPhotos()).map((file) =>
      fs.unlink(path.join(profilePhotoDirectory, file))
    )
  );
});

function patchProfile() {
  return request(app)
    .patch("/auth/profile")
    .set(authHeaders(user.id));
}

describe("PATCH /auth/profile", () => {
  it("updates the name and uploads a profile photo", async () => {
    const response = await patchProfile()
      .field("name", "  Ada Lovelace ")
      .attach("photo", pngBytes, {
        filename: "me.png",
        contentType: "image/png",
      })
      .expect(200);

    expect(response.body.user).toMatchObject({
      name: "Ada Lovelace",
      hasProfilePhoto: true,
    });
    expect(response.body.user).not.toHaveProperty("profilePhotoStoredName");
    expect(await newPhotos()).toHaveLength(1);

    const photo = await request(app)
      .get("/auth/profile/photo")
      .set("Cookie", sessionCookie(user.id))
      .expect(200);

    expect(photo.headers["content-type"]).toBe("image/png");
    expect(photo.headers["cache-control"]).toBe("private, no-cache");
  });

  it("replaces the previous photo file", async () => {
    await patchProfile()
      .attach("photo", pngBytes, { filename: "a.png", contentType: "image/png" })
      .expect(200);

    const [firstPhoto] = await newPhotos();

    await patchProfile()
      .attach("photo", pngBytes, { filename: "b.png", contentType: "image/png" })
      .expect(200);

    const photos = await newPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0]).not.toBe(firstPhoto);
  });

  it("clears the name when an empty name is sent", async () => {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: "Old Name" },
    });

    const response = await patchProfile().field("name", "   ").expect(200);

    expect(response.body.user.name).toBeNull();
  });

  it("rejects a name over 80 characters and discards the uploaded photo", async () => {
    const response = await patchProfile()
      .field("name", "x".repeat(81))
      .attach("photo", pngBytes, { filename: "me.png", contentType: "image/png" })
      .expect(400);

    expect(response.body).toEqual({
      error: "Name must be 80 characters or fewer",
    });
    expect(await newPhotos()).toEqual([]);
  });

  it.each([
    ["anim.gif", "image/gif"],
    ["vector.svg", "image/svg+xml"],
    ["resume.pdf", "application/pdf"],
  ])("rejects %s as a profile photo", async (filename, contentType) => {
    const response = await patchProfile()
      .attach("photo", Buffer.from("fake"), { filename, contentType })
      .expect(400);

    expect(response.body).toEqual({
      error: "Only JPEG, PNG, and WebP images are allowed",
    });
    expect(await newPhotos()).toEqual([]);
  });

  it("rejects photos over 5 MB", async () => {
    await patchProfile()
      .attach("photo", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "big.png",
        contentType: "image/png",
      })
      .expect(400);

    expect(await newPhotos()).toEqual([]);
  });

  it("requires authentication", async () => {
    await request(app)
      .patch("/auth/profile")
      .set({ Cookie: "csrfToken=abc", "X-CSRF-Token": "abc" })
      .field("name", "Nope")
      .expect(401);
  });
});

describe("GET /auth/profile/photo", () => {
  it("returns 404 when the user has no photo", async () => {
    await request(app)
      .get("/auth/profile/photo")
      .set("Cookie", sessionCookie(user.id))
      .expect(404);
  });

  it("requires authentication", async () => {
    await request(app).get("/auth/profile/photo").expect(401);
  });
});

describe("DELETE /auth/account", () => {
  it("deletes the user, their data and stored files, and clears cookies", async () => {
    await patchProfile()
      .attach("photo", pngBytes, { filename: "me.png", contentType: "image/png" })
      .expect(200);

    const storedName = `${randomUUID()}.pdf`;
    await fs.writeFile(path.join(documentStoragePath, storedName), "%PDF");

    const job = await prisma.job.create({
      data: {
        company: "Acme",
        title: "Engineer",
        userId: user.id,
        stageHistory: { create: { newStage: "APPLIED" } },
        reminders: {
          create: { title: "x", dueAt: new Date(), userId: user.id },
        },
      },
    });

    await prisma.document.create({
      data: {
        name: "cv",
        originalName: "cv.pdf",
        storedName,
        mimeType: "application/pdf",
        size: 4,
        userId: user.id,
        jobs: { connect: { id: job.id } },
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        tokenHash: randomUUID(),
        expiresAt: new Date(Date.now() + 60_000),
        userId: user.id,
      },
    });

    const response = await request(app)
      .delete("/auth/account")
      .set(authHeaders(user.id))
      .expect(204);

    const cookies = response.headers["set-cookie"].join("\n");
    expect(cookies).toMatch(/^session=;/m);
    expect(cookies).toMatch(/^csrfToken=;/m);

    const counts = await Promise.all([
      prisma.user.count(),
      prisma.job.count(),
      prisma.stageHistory.count(),
      prisma.reminder.count(),
      prisma.document.count(),
      prisma.passwordResetToken.count(),
    ]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);

    expect(await newPhotos()).toEqual([]);
    await expect(
      fs.access(path.join(documentStoragePath, storedName))
    ).rejects.toThrow();
  });

  it("returns 404 for a session whose user is already deleted", async () => {
    await prisma.user.delete({ where: { id: user.id } });

    await request(app)
      .delete("/auth/account")
      .set(authHeaders(user.id))
      .expect(404);
  });
});
