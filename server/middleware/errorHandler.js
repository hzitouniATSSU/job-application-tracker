
import multer from "multer";

export function notFound(req,res) {
  return res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
}

export default function errorHandler(error, req, res, next) {

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File must be 5 MB or smaller",
      });
    }

    return res.status(400).json({
      error: error.message,
    });
  }

  if (error.message === "Only PDF, DOC, and DOCX files are allowed") {
    return res.status(400).json({
      error: error.message,
    });
  }
  console.error(error);

  const statusCode = Number.isInteger(error.statusCode)
  ? error.statusCode
  :500;

  return res.status(statusCode).json({
    error:
    statusCode  === 500
    ? "Internal server error"
    : error.message,
  });
}