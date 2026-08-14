import prisma from "../../lib/prisma.js";
import {
  hashPassword,
} from "../../lib/auth.js";

export async function createTestUser({
  email,
  password = "TestPassword123!",
  emailVerified = true,
}) {
  const passwordHash =
    await hashPassword(password);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      emailVerifiedAt: emailVerified ? new Date() : null,
    },
  });
}