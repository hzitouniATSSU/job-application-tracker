import express from "express";
import { getJobs,
         createJob,
         getJobById,
         updateJob,
         deleteJob,
} from "../controllers/jobs.controller.js";

const router = express.Router();

router.get("/", getJobs);
router.post("/", createJob);
router.get("/:id", getJobById);
router.patch("/:id", updateJob);
router.delete("/:id",deleteJob );

export default router;