import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment:
    process.env.NODE_ENV || "development",

  sendDefaultPii: false,

  tracesSampleRate:
    process.env.NODE_ENV === "production"
      ? 0.1
      : 1.0,


  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
      delete event.request.headers.authorization;
      delete event.request.headers.Authorization;
      delete event.request.headers["x-csrf-token"];
      delete event.request.headers["X-CSRF-Token"];
    }

    if (
      event.request?.data &&
      typeof event.request.data === "object"
    ) {
      const data = event.request.data;

      if ("password" in data) {
        data.password = "[REDACTED]";
      }

      if ("token" in data) {
        data.token = "[REDACTED]";
      }

      if ("csrfToken" in data) {
        data.csrfToken = "[REDACTED]";
      }
    }

    return event;
  },
});