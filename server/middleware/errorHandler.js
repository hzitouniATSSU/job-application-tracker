import multer from "multer";

export function notFound(req, res) {
  req.log?.warn(
    {
      method: req.method,
      url: req.originalUrl,
    },
    "Route not found"
  );

  return res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

export default function errorHandler(
  error,
  req,
  res,
  next
) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    req.log?.warn(
      {
        err: error,
        userId: req.user?.id,
      },
      "Multer upload error"
    );

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File must be 5 MB or smaller",
      });
    }

    return res.status(400).json({
      error: error.message,
    });
  }

  if (
    error.message ===
    "Only PDF, DOC, and DOCX files are allowed" ||
    error.message === "Only JPEG, PNG, and WebP images are allowed"
  ) {
    req.log?.warn(
      {
        err: error,
        userId: req.user?.id,
      },
      "Unsupported document type"
    );

    return res.status(400).json({
      error: error.message,
    });
  }

  const statusCode = Number.isInteger(error.statusCode)
    ? error.statusCode
    : 500;

  if (statusCode >= 500) {
    req.log?.error(
      {
        err: error,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
      },
      "Unhandled request error"
    );
  } else {
    req.log?.warn(
      {
        err: error,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
        statusCode,
      },
      "Request failed"
    );
  }

  return res.status(statusCode).json({
    error:
      statusCode === 500
        ? "Internal server error"
        : error.message,
  });
}
