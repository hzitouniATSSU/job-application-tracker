import {
  beforeEach,
  afterAll,
  vi,
} from "vitest";

// This setup file wipes every table before each test. Refuse to run
// against anything that does not look like a dedicated test database
// (e.g. a DATABASE_URL exported in the shell overrides .env.test).
const databaseName = (() => {
  try {
    return new URL(process.env.DATABASE_URL).pathname.slice(1);
  } catch {
    return "";
  }
})();

if (!/test/i.test(databaseName)) {
  throw new Error(
    `Refusing to run tests against database "${databaseName}". ` +
      "DATABASE_URL must point to a dedicated test database."
  );
}

// Never send real email from tests. The test env also loads .env,
// which may contain a real RESEND_API_KEY.
vi.mock("../lib/email.js", () => ({
  sendVerificationEmail: vi.fn(async () => ({ id: "test-email" })),
  sendPasswordResetEmail: vi.fn(async () => ({ id: "test-email" })),
}));

import prisma from "../lib/prisma.js";
import fs from "fs/promises";
import path from "path";

beforeEach(async () => {
  vi.clearAllMocks();

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
