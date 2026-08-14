import pino from "pino";

const isProduction =
  process.env.NODE_ENV === "production";

const logger = pino(
  isProduction
    ? {}
    : {
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