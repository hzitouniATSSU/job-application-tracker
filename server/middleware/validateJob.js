const allowedStatuses = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

const allowedUpdateFields = [
  "company",
  "title",
  "status",
  "location",
  "jobUrl",
  "notes",
  "appliedAt",
];

export function validateCreateJob(req, res, next) {
  const { company, title, location, jobUrl, notes } = req.body;

  if (typeof company !== "string" || !company.trim()) {
    return res.status(400).json({
      error: "Company is required",
    });
  }

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({
      error: "Job title is required",
    });
  }

  const optionalFields = { location, jobUrl, notes };

  for (const [field, value] of Object.entries(optionalFields)) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return res.status(400).json({
        error: `${field} must be a string`,
      });
    }
  }

  req.body.company = company.trim();

  req.body.title = title.trim();

  return next();
}

export function validateUpdateJob(req, res, next) {
  const updates = Object.keys(req.body).filter((field) =>
    allowedUpdateFields.includes(field)
  );

  if (updates.length === 0) {
    return res.status(400).json({
      error: "No valid fields provided for update",
    });
  }

  if (
    req.body.company !== undefined &&
    (typeof req.body.company !== "string" || !req.body.company.trim())
  ) {
    return res.status(400).json({
      error: "Company cannot be empty",
    });
  }

  if (
    req.body.title !== undefined &&
    (typeof req.body.title !== "string" || !req.body.title.trim())
  ) {
    return res.status(400).json({
      error: "Job title cannot be empty",
    });
  }

  if (
    req.body.status !== undefined &&
    !allowedStatuses.includes(req.body.status)
  ) {
    return res.status(400).json({
      error: "Invalid application status",
    });
  }

  for (const field of ["location", "jobUrl", "notes"]) {
    const value = req.body[field];

    if (value !== undefined && value !== null && typeof value !== "string") {
      return res.status(400).json({
        error: `${field} must be a string`,
      });
    }
  }

  if (req.body.appliedAt !== undefined) {
    const appliedDate = new Date(req.body.appliedAt);

    if (Number.isNaN(appliedDate.getTime())) {
      return res.status(400).json({
        error: "Invalid application date",
      });
    }

    req.body.appliedAt = appliedDate.toISOString();
  }

  if (typeof req.body.company === "string") {
    req.body.company = req.body.company.trim();
  }

  if (typeof req.body.title === "string") {
    req.body.title = req.body.title.trim();
  }

  return next();
}
