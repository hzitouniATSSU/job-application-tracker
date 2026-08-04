import express from "express";
import { getJobs,
         createJob,
         getJobById,
         updateJob,
         deleteJob,
} from "../controllers/jobs.controller.js";
import {
    validateCreateJob,
    validateUpdateJob,
} from "../middleware/validateJob.js";

const router = express.Router();

router.get("/", getJobs);
router.post("/", validateCreateJob, createJob);
router.get("/:id", getJobById);
router.patch("/:id", validateUpdateJob, updateJob);
router.delete("/:id",deleteJob );

export default router;