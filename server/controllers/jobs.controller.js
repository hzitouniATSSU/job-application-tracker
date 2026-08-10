import prisma from "../lib/prisma.js";

export async function getJobs(req, res) {
  
  try{
    
  const jobs = await prisma.job.findMany({
    where: {
      userId: req.user.id,
    },
  include:{
    stageHistory: {
      orderBy: {
        changedAt: "desc", 
      },
    },
  },
});

  return res.json(jobs);
}catch(error){
  console.error(error);
  return res.status(500).json({
    error:"Unable to retrieve jobs",
  });
}
}

export async function createJob(req, res) {
  try {
    const { company, title, location, jobUrl, notes } = req.body;

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
        user:{
          connect:{
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

    res.status(201).json(job);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Unable to create job",
    });
  }
}

export async function getJobById(req, res) {
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
    console.error(error);

    return res.status(500).json({
      error: "Unable to retrieve job",
    });
  }
}

export async function updateJob(req, res) {
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
      updates.status !== undefined && updates.status !== job.status;

    const updatedJob = await prisma.$transaction(async (transaction) => {
       await transaction.job.update({
        where: {
          id: jobId,
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

      return transaction.job.findUnique({
        where: {
          id: jobId,
        },
        include:{
          stageHistory: {
            orderBy: {
              changedAt: "desc", 
            },
          },
        },

      });
    });
    return res.status(200).json(updatedJob);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unable to update job",
    });
  }
}

export async function deleteJob(req, res) {
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
      },
    });

    return res.status(200).json({
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unable to delete job",
    });
  }
}
