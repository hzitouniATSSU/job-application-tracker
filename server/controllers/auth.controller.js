import prisma from "../lib/prisma.js";
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
} from "../lib/auth.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email.js";
import { cleanupExpiredAuthTokens } from "../lib/tokenCleanup.js";

import { createCsrfToken } from "../middleware/csrf.js";
import crypto from "crypto";

function setSessionCookie(res, userId) {
  const token = createAccessToken(userId);
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("session", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 15 * 60 * 1000,
    path: "/",
  });
}

export async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || typeof password !== "string") {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        error: "Enter a valid email address",
      });
    }

    if (password.length < 12 || password.length > 128) {
      return res.status(400).json({
        error: "Password must be between 12 and 128 characters",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    const rawVerificationToken = crypto.randomBytes(32).toString("hex");

    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(rawVerificationToken)
      .digest("hex");

    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.emailVerificationToken.create({
      data: {
        tokenHash: verificationTokenHash,
        expiresAt: verificationExpiresAt,
        userId: user.id,
      },
    });
    try {
      await sendVerificationEmail({
        to: user.email,
        verificationToken: rawVerificationToken,
      });
    } catch (emailError) {
      req.log.error(
    {
      err: emailError,
      userId: user.id,
    },
      "Unable to send verification email:", emailError
  );
    }
    req.log.info(
  {
    userId: user.id,
  },
  "User registered"
);

    return res.status(201).json({ user, message:
    "Account created. Check your email to verify your account, then sign in.", });
  } catch (error) {
    // Handles two simultaneous registrations using the same email.
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "An account with this email already exists",
      });
    }

    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const password =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const passwordIsValid =
      user && (await verifyPassword(password, user.passwordHash));

    if (!passwordIsValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    setSessionCookie(res, user.id);

    req.log.info(
  {
    userId: user.id,
  },
  "User logged in"
);
    
    return res.status(200).json({
      user: {
        id: user.id,

        email: user.email,

        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
}

export function logout(req, res) {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("session", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });

  res.clearCookie("csrfToken", {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  });

  req.log.info(
    {
      userId: req.user?.id,
    },
    "User logged out"
  );

  return res.status(204).send();
}

export function getCsrfToken(req, res) {
  const token = createCsrfToken();

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("csrfToken", token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 15 * 60 * 1000,
  });

  return res.status(200).json({
    csrfToken: token,
  });
}

export async function forgotPassword(req, res, next) {
  try {

await cleanupExpiredAuthTokens();
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    // Always return the same response to prevent email enumeration.
    const genericResponse = {
      message:
        "If an account exists for that email, a password reset link will be sent.",
    };

    if (!email) {
      return res.status(200).json(genericResponse);
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
        },
      }),

      prisma.passwordResetToken.create({
        data: {
          tokenHash,
          expiresAt,
          userId: user.id,
        },
      }),
    ]);

    await sendPasswordResetEmail({
      to: user.email,
      resetToken: rawToken,
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    return next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await cleanupExpiredAuthTokens();
    const token =
      typeof req.body.token === "string" ? req.body.token.trim() : "";

    const newPassword =
      typeof req.body.password === "string" ? req.body.password : "";

    if (!token || !newPassword) {
      return res.status(400).json({
        error: "Reset token and new password are required",
      });
    }

    if (newPassword.length < 12 || newPassword.length > 128) {
      return res.status(400).json({
        error: "Password must be between 12 and 128 characters",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      
    });

    if (!resetToken || resetToken.expiresAt <= new Date()) {
      if (resetToken) {
        await prisma.passwordResetToken.delete({
          where: {
            id: resetToken.id,
          },
        });
      }

      return res.status(400).json({
        error: "Reset link is invalid or has expired",
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          passwordHash,
        },
      }),

      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      }),
    ]);

    res.clearCookie("session", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? "none"
      : "lax",
  path: "/",
});

res.clearCookie("csrfToken", {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite:
    process.env.NODE_ENV === "production"
      ? "none"
      : "lax",
  path: "/",
});

req.log.info(
  {
    userId: resetToken.userId,
  },
  "Password reset completed"
);

return res.status(200).json({
  message:
    "Password reset successfully. Please sign in with your new password.",
});

   
  } catch (error) {
    return next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    await cleanupExpiredAuthTokens();

    const token =
      typeof req.body.token === "string"
        ? req.body.token.trim()
        : "";

    if (!token) {
      return res.status(400).json({
        error: "Verification token is required",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const verificationToken =
      await prisma.emailVerificationToken.findUnique({
        where: {
          tokenHash,
        },
      });

    if (
      !verificationToken ||
      verificationToken.expiresAt <= new Date()
    ) {
      if (verificationToken) {
        await prisma.emailVerificationToken.delete({
          where: {
            id: verificationToken.id,
          },
        });
      }

      return res.status(400).json({
        error: "Verification link is invalid or has expired",
      });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: verificationToken.userId,
        },
        data: {
          emailVerifiedAt: new Date(),
        },
      }),

      prisma.emailVerificationToken.deleteMany({
        where: {
          userId: verificationToken.userId,
        },
      }),
    ]);

    req.log.info(
      {
        userId: verificationToken.userId,
      },
      "Email verification completed"
    );

    return res.status(200).json({
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    return next(error);
  }
}

export async function resendVerificationEmail(req, res, next) {
  try {
    await cleanupExpiredAuthTokens();

    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const genericResponse = {
      message:
        "If the account exists and is not verified, a verification email will be sent.",
    };

    if (!email) {
      return res.status(200).json(genericResponse);
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
      },
    });

    // Same outward response prevents account enumeration.
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    if (user.emailVerifiedAt) {
  return res.status(200).json(genericResponse);
}

    const rawVerificationToken =
      crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawVerificationToken)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({
        where: {
          userId: user.id,
        },
      }),

      prisma.emailVerificationToken.create({
        data: {
          tokenHash,
          expiresAt,
          userId: user.id,
        },
      }),
    ]);

    await sendVerificationEmail({
      to: user.email,
      verificationToken: rawVerificationToken,
    });

    req.log.info(
      {
        userId: user.id,
      },
      "Verification email resent"
    );

    return res.status(200).json(genericResponse);
  } catch (error) {
    return next(error);
  }
}