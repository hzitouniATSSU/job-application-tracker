import "./instrument.js";


import * as Sentry from "@sentry/node";


import app from "./app.js"
import logger from "./lib/logger.js";


Sentry.setupExpressErrorHandler(app);

const PORT = process.env.PORT || 3000;


const server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
    },
    "Server started"
  );
});

// Unexpected synchronous errors
process.on("uncaughtException", (error) => {
  logger.fatal(
    { err: error },
    "Uncaught exception"
  );

  process.exit(1);
});

// Unexpected Promise rejections
process.on("unhandledRejection", (reason) => {
  logger.fatal(
    { err: reason },
    "Unhandled promise rejection"
  );

  server.close(() => {
    process.exit(1);
  });
});


