import prisma from "../../lib/prisma.js";
import {
  hashPassword,
} from "../../lib/auth.js";
import { loginAgent } from "./auth.js";

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

export async function createLoggedInUser(
  app,
  email,
  password = "TestPassword123!"
) {
  const user = await createTestUser({
    email,
    password,
  });

  const session = await loginAgent(
    app,
    email,
    password
  );

  return {
    user,
    ...session,
  };
}
