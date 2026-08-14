import express from "express";
import { register, login, getCurrentUser, logout, getCsrfToken, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail, updateProfile, getProfilePhoto, deleteAccount } from "../controllers/auth.controller.js";
import requireAuth from "../middleware/requireAuth.js";
import { requireCsrf } from "../middleware/csrf.js";
import { rateLimit } from "express-rate-limit";
import profileUpload from "../middleware/profileUpload.js";

const router = express.Router();
const emailActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});
const tokenActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many attempts. Please try again later.",
  },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again later.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many account creation attempts. Please try again later.",
  },
});

router.get("/csrf", getCsrfToken);

router.post("/register", registerLimiter,requireCsrf, register);
router.post("/login",  loginLimiter, requireCsrf, login);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout",requireAuth, requireCsrf, logout);
router.patch("/profile", requireAuth, requireCsrf, profileUpload.single("photo"), updateProfile);
router.get("/profile/photo", requireAuth, getProfilePhoto);
router.delete("/account", requireAuth, requireCsrf, deleteAccount);
router.post("/forgot-password",emailActionLimiter, requireCsrf,  forgotPassword);
router.post("/reset-password", tokenActionLimiter,requireCsrf, resetPassword);
router.post("/verify-email", tokenActionLimiter, requireCsrf, verifyEmail);
router.post("/resend-verification", emailActionLimiter, requireCsrf,  resendVerificationEmail);


export default router;
