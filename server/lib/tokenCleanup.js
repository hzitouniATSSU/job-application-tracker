import prisma from "./prisma.js";

export async function cleanupExpiredAuthTokens() {
  const now = new Date();

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    }),

    prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    }),
  ]);
}