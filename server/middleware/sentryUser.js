import * as Sentry from "@sentry/node";

export default function sentryUser(req, res, next) {
  if (req.user?.id) {
    Sentry.setUser({
      id: String(req.user.id),
    });
  }

  return next();
}