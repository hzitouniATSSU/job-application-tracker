import pinoHttp from "pino-http";
import logger from "../lib/logger.js";

const requestLogger = pinoHttp({
  logger,

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
    ],
    censor: "[REDACTED]",
  },
});

export default requestLogger;