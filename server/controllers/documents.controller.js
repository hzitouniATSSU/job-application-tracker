import prisma from "../lib/prisma.js";
import path from "path";
import { unlink } from "fs/promises";

export async function getDocuments(req, res, next) {
  try {
    const documents = await prisma.document.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        jobs: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(documents);
  } catch (error) {
    return next(error);
  }
}

export async function createDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "A document file is required",
      });
    }

    const document = await prisma.document.create({
      data: {
        name: req.body.name || req.file.originalname,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        userId: req.user.id,
      },
    });

    return res.status(201).json(document);
  } catch (error) {
    /*
     * Prisma/database creation failed after Multer may
     * already have written the physical file.
     */
    if (req.file?.path) {
      try {
        await unlink(req.file.path);
      } catch (fileError) {
        req.log.error(
          {
            err: fileError,
            userId: req.user?.id,
            storedPath: req.file.path,
          },
          "Unable to clean up failed document upload"
        );
      }
    }

    return next(error);
  }
}

export async function attachDocumentToJob(req, res, next) {
  try {
    const documentId = Number(req.params.documentId);
    const jobId = Number(req.params.jobId);

    if (Number.isNaN(documentId) || Number.isNaN(jobId)) {
      return res.status(400).json({
        error: "Invalid document or job ID",
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    const updatedDocument = await prisma.document.update({
      where: {
        id: documentId,
        userId: req.user.id,
      },
      data: {
        jobs: {
          connect: {
            id: jobId,
          },
        },
      },
      include: {
        jobs: true,
      },
    });

    return res.status(200).json(updatedDocument);
  } catch (error) {
    return next(error);
  }
}

export async function detachDocumentFromJob(req, res, next) {
  try {
    const documentId = Number(req.params.documentId);
    const jobId = Number(req.params.jobId);

    if (Number.isNaN(documentId) || Number.isNaN(jobId)) {
      return res.status(400).json({
        error: "Invalid document or job ID",
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: req.user.id,
      },
      include: {
        jobs: {
          where: {
            id: jobId,
            userId: req.user.id,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
      });
    }

    if (document.jobs.length === 0) {
      return res.status(404).json({
        error: "Document or attachment not found",
      });
    }

    const updatedDocument = await prisma.document.update({
      where: {
        id: documentId,
        userId: req.user.id,
      },
      data: {
        jobs: {
          disconnect: {
            id: jobId,
          },
        },
      },
      include: {
        jobs: true,
      },
    });

    return res.status(200).json(updatedDocument);
  } catch (error) {
    return next(error);
  }
}

export async function getDocumentById(req, res, next) {
  try {
    const documentId = Number(req.params.id);

    if (Number.isNaN(documentId)) {
      return res.status(400).json({
        error: "Invalid document ID",
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: req.user.id,
      },
      include: {
        jobs: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
      });
    }

    return res.status(200).json(document);
  } catch (error) {
    return next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const documentId = Number(req.params.id);

    if (Number.isNaN(documentId)) {
      return res.status(400).json({
        error: "Invalid document ID",
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
      });
    }

    await prisma.document.delete({
      where: {
        id: documentId,
      },
    });

    const storedFilePath = path.join(
      process.cwd(),
      "storage",
      "documents",
      document.storedName
    );

    try {
      await unlink(storedFilePath);
    } catch (fileError) {
      if (fileError.code !== "ENOENT") {
        req.log.error(
          {
            err: fileError,
            userId: req.user?.id,
            documentId,
          },
          "Unable to delete stored document file"
        );
      }
    }

    return res.status(200).json({
      message: "Document deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const documentId = Number(req.params.id);

    if (Number.isNaN(documentId)) {
      return res.status(400).json({
        error: "Invalid document ID",
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: req.user.id,
      },
    });

    if (!document) {
      return res.status(404).json({
        error: "Document not found",
      });
    }

    const storedFilePath = path.join(
      process.cwd(),
      "storage",
      "documents",
      document.storedName
    );

    return res.download(
      storedFilePath,
      document.originalName,
      (error) => {
        if (!error) {
          return;
        }

        if (res.headersSent) {
          return next(error);
        }

        req.log.warn(
          {
            err: error,
            documentId,
            userId: req.user?.id,
          },
          "Stored document file not found"
        );

        return res.status(404).json({
          error: "Stored file not found",
        });
      }
    );
  } catch (error) {
    return next(error);
  }
}