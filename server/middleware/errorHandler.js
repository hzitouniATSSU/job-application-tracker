
import multer from "multer";

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

  return res.status(500).json({
    error: "Internal server error",
  });
}