import express from "express";
import { register, login, getCurrentUser, logout, getCsrfToken, forgotPassword, resetPassword, verifyEmail} from "../controllers/auth.controller.js";
import requireAuth from "../middleware/requireAuth.js";
import { requireCsrf } from "../middleware/csrf.js";

const router = express.Router();

router.get("/csrf", getCsrfToken);

router.post("/register", requireCsrf, register);
router.post("/login", requireCsrf, login);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout",requireAuth, requireCsrf, logout);
router.post("/forgot-password",requireCsrf,forgotPassword);
router.post("/reset-password", requireCsrf, resetPassword);
router.post("/verify-email", requireCsrf, verifyEmail);


export default router;
