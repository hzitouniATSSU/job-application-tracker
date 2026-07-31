import prisma from "../lib/prisma.js";

export async function getJobs(req, res) {
  const jobs = await prisma.job.findMany();

  return res.json(jobs);
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

    const job = await prisma.job.findUnique({
      where: {
        id: jobId,
      },
      include: {
        documents: true,
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
  try{
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
    
        const job = await prisma.job.findUnique({
          where: {
            id: jobId,
          },
        });
    
        if (!job) {
          return res.status(404).json({
            error: "Job not found",
          });
        }
    
        const updatedJob = await prisma.job.update({
          where: {
            id: jobId,
          },
          data: updates,
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
    
        const job = await prisma.job.findUnique({
          where: {
            id: jobId,
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

    