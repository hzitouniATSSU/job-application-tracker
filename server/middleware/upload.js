
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

const allowedMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, "uploads/");
  },

  filename(req, file, callback) {
    const extension = path.extname(file.originalname);
    const uniqueName = `${randomUUID()}${extension}`;

    callback(null, uniqueName);
  },
});

function fileFilter(req, file, callback) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new Error("Only PDF, DOC, and DOCX files are allowed")
    );
  }

  callback(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export default upload;