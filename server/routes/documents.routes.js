import express from "express";
import upload from "../middleware/upload.js";
import { createDocument, 
    getDocuments,
    getDocumentById,
    deleteDocument,
    downloadDocument,
attachDocumentToJob,
detachDocumentFromJob,
 } from "../controllers/documents.controller.js";

const router = express.Router();

router.get("/", getDocuments);
router.post("/", upload.single("file"), createDocument);
router.post("/:documentId/jobs/:jobId", attachDocumentToJob);
router.delete("/:documentId/jobs/:jobId", detachDocumentFromJob);
router.get("/:id", getDocumentById);
router.get("/:id/download", downloadDocument);
router.delete("/:id", deleteDocument);

export default router;