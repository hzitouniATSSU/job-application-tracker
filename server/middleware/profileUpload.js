import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";

export const profilePhotoDirectory = path.join(
  process.cwd(),
  "storage",
  "profile-photos"
);

fs.mkdirSync(profilePhotoDirectory, { recursive: true });

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, profilePhotoDirectory);
  },
  filename(req, file, callback) {
    callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

function fileFilter(req, file, callback) {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new Error("Only JPEG, PNG, and WebP images are allowed"));
  }

  callback(null, true);
}

export default multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
