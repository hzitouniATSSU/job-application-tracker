import {
  beforeEach,
  afterAll,
} from "vitest";

import prisma from "../lib/prisma.js";
import fs from "fs/promises";
import path from "path";

beforeEach(async () => {
  await prisma.stageHistory.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.document.deleteMany();
  await prisma.job.deleteMany();

  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();

  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const documentStoragePath = path.join(
  process.cwd(),
  "storage",
  "documents"
);

const files = await fs.readdir(
  documentStoragePath
);

await Promise.all(
  files
    .filter((file) => file !== ".gitkeep")
    .map((file) =>
      fs.unlink(
        path.join(
          documentStoragePath,
          file
        )
      )
    )
);