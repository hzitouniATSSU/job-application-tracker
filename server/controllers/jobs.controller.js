import prisma from "../lib/prisma.js";

export async function getJobs(req, res, next) {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        stageHistory: {
          orderBy: {
            changedAt: "desc",
          },
        },
      },
    });

    return res.json(jobs);
  } catch (error) {
    return next(error);
  }
}

export async function createJob(req, res, next) {
  try {
    const {
      company,
      title,
      location,
      jobUrl,
      notes,
    } = req.body;

    const job = await prisma.job.create({
      data: {
        company,
        title,
        location,
        jobUrl,
        notes,

        stageHistory: {
          create: {
            previousStage: null,
            newStage: "APPLIED",
          },
        },

        user: {
          connect: {
            id: req.user.id,
          },
        },
      },

      include: {
        stageHistory: {
          orderBy: {
            changedAt: "desc",
          },
        },
      },
    });

    return res.status(201).json(job);
  } catch (error) {
    return next(error);
  }
}

export async function getJobById(req, res, next) {
  try {
    const jobId = Number(req.params.id);

    if (Number.isNaN(jobId)) {
      return res.status(400).json({
        error: "Invalid job ID",
      });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        userId: req.user.id,
      },

      include: {
        documents: true,

        stageHistory: {
          orderBy: {
            changedAt: "desc",
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    return res.status(200).json(job);
  } catch (error) {
    return next(error);
  }
}

export async function updateJob(req, res, next) {
  try {
    const jobId = Number(req.params.id);

    if (Number.isNaN(jobId)) {
      return res.status(400).json({
        error: "Invalid job ID",
      });
    }

    const allowedFields = [
      "company",
      "title",
      "status",
      "location",
      "jobUrl",
      "notes",
      "appliedAt",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "No valid fields provided for update",
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

    const statusChanged =
      updates.status !== undefined &&
      updates.status !== job.status;

    const updatedJob = await prisma.$transaction(
      async (transaction) => {
        await transaction.job.update({
          where: {
            id: jobId,
            userId: req.user.id,
          },
          data: updates,
        });

        if (statusChanged) {
          await transaction.stageHistory.create({
            data: {
              jobId,
              previousStage: job.status,
              newStage: updates.status,
            },
          });
        }

        return transaction.job.findFirst({
          where: {
            id: jobId,
            userId: req.user.id,
          },

          include: {
            stageHistory: {
              orderBy: {
                changedAt: "desc",
              },
            },
          },
        });
      }
    );

    return res.status(200).json(updatedJob);
  } catch (error) {
    return next(error);
  }
}

export async function deleteJob(req, res, next) {
  try {
    const jobId = Number(req.params.id);

    if (Number.isNaN(jobId)) {
      return res.status(400).json({
        error: "Invalid job ID",
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

    await prisma.job.delete({
      where: {
        id: jobId,
        userId: req.user.id,
      },
    });

    return res.status(200).json({
      message: "Job deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}