import pino from "pino";

const isProduction =
  process.env.NODE_ENV === "production";

const level = process.env.LOG_LEVEL || "info";

const logger = pino(
  isProduction
    ? { level }
    : {
        level,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }
);

export default logger;