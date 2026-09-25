import pinoHttp from "pino-http";
import logger from "../lib/logger.js";

const requestLogger = pinoHttp({
  logger,

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-csrf-token"]',
      // Login responses carry the session JWT in Set-Cookie.
      'res.headers["set-cookie"]',
      "req.body.password",
      "req.body.token",
    ],
    censor: "[REDACTED]",
  },
});

export default requestLogger;