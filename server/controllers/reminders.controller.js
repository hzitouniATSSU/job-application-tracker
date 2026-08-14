import prisma from "../lib/prisma.js";

const allowedTypes = [
  "FOLLOW_UP",
  "INTERVIEW",
  "DEADLINE",
  "OTHER",
];

export async function getReminders(req, res, next) {
  try {
    const reminders = await prisma.reminder.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        job: {
          select: {
            id: true,
            company: true,
            title: true,
          },
        },
      },
      orderBy: {
        dueAt: "asc",
      },
    });

    return res.status(200).json(reminders);
  } catch (error) {
    return next(error);
  }
}

export async function createReminder(req, res, next) {
  try {
    const jobId = Number(req.body.jobId);

    const {
      type = "FOLLOW_UP",
      title,
      dueAt,
    } = req.body;

    if (Number.isNaN(jobId)) {
      return res.status(400).json({
        error: "Invalid job ID",
      });
    }

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        error: "Reminder title is required",
      });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        error: "Invalid reminder type",
      });
    }

    const dueDate = new Date(dueAt);

    if (
      !dueAt ||
      Number.isNaN(dueDate.getTime())
    ) {
      return res.status(400).json({
        error: "A valid due date is required",
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

    const reminder = await prisma.reminder.create({
      data: {
        jobId,
        type,
        title: title.trim(),
        dueAt: dueDate,
        userId: req.user.id,
      },
      include: {
        job: {
          select: {
            id: true,
            company: true,
            title: true,
          },
        },
      },
    });

    return res.status(201).json(reminder);
  } catch (error) {
    return next(error);
  }
}

export async function updateReminder(req, res, next) {
  try {
    const reminderId = Number(req.params.id);
    const { completed } = req.body;

    if (Number.isNaN(reminderId)) {
      return res.status(400).json({
        error: "Invalid reminder ID",
      });
    }

    if (typeof completed !== "boolean") {
      return res.status(400).json({
        error: "Completed must be true or false",
      });
    }

    const existingReminder =
      await prisma.reminder.findFirst({
        where: {
          id: reminderId,
          userId: req.user.id,
        },
      });

    if (!existingReminder) {
      return res.status(404).json({
        error: "Reminder not found",
      });
    }

    const reminder = await prisma.reminder.update({
      where: {
        id: reminderId,
        userId: req.user.id,
      },
      data: {
        completed,
      },
      include: {
        job: {
          select: {
            id: true,
            company: true,
            title: true,
          },
        },
      },
    });

    return res.status(200).json(reminder);
  } catch (error) {
    return next(error);
  }
}

export async function deleteReminder(req, res, next) {
  try {
    const reminderId = Number(req.params.id);

    if (Number.isNaN(reminderId)) {
      return res.status(400).json({
        error: "Invalid reminder ID",
      });
    }

    const existingReminder =
      await prisma.reminder.findFirst({
        where: {
          id: reminderId,
          userId: req.user.id,
        },
      });

    if (!existingReminder) {
      return res.status(404).json({
        error: "Reminder not found",
      });
    }

    await prisma.reminder.delete({
      where: {
        id: reminderId,
        userId: req.user.id,
      },
    });

    return res.status(200).json({
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    return next(error);
  }
}