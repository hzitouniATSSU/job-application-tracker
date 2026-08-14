import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import cookieParser from "cookie-parser";

import jobsRouter from "./routes/jobs.routes.js";
import documentsRouter from "./routes/documents.routes.js";
import remindersRouter from "./routes/reminders.routes.js";
import authRouter from "./routes/auth.routes.js";

import requireAuth from "./middleware/requireAuth.js";
import { requireCsrf } from "./middleware/csrf.js";
import requestLogger from "./middleware/requestLogger.js";

import errorHandler, {
  notFound,
} from "./middleware/errorHandler.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

// Security
app.use(helmet());

// HTTP request logging
app.use(requestLogger);

// Body parsing
app.use(
  express.json({
    limit: "50kb",
  })
);

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
    credentials: true,
  })
);

// Cookies
app.use(cookieParser());



const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    error: "Too many requests. Please try again later.",
  },

  handler: (req, res) => {
    req.log.warn(
      {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
      },
      "API rate limit exceeded"
    );

    return res.status(429).json({
      error: "Too many requests. Please try again later.",
    });
  },
});


app.get("/", (req, res) => {
  res.send("Job Tracker API is running!");
});

// Public/auth routes
app.use("/auth", authRouter);

// Protected routes
app.use(
  "/jobs",
  apiLimiter,
  requireAuth,
  requireCsrf,
  jobsRouter
);

app.use(
  "/documents",
  apiLimiter,
  requireAuth,
  requireCsrf,
  documentsRouter
);

app.use(
  "/reminders",
  apiLimiter,
  requireAuth,
  requireCsrf,
  remindersRouter
);



// 404
app.use(notFound);
app.use(errorHandler);

export default app;