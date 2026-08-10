import crypto from "crypto";

const SAFE_METHODS = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
]);

export function createCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.get("X-CSRF-Token");

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      error: "CSRF token required",
    });
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);

  if (cookieBuffer.length !== headerBuffer.length) {
    return res.status(403).json({
      error: "Invalid CSRF token",
    });
  }

  const tokensMatch = crypto.timingSafeEqual(
    cookieBuffer,
    headerBuffer
  );

  if (!tokensMatch) {
    return res.status(403).json({
      error: "Invalid CSRF token",
    });
  }

  return next();
}