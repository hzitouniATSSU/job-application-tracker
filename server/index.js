import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit"; 
import jobsRouter from "./routes/jobs.routes.js";
import documentsRouter from "./routes/documents.routes.js";
import errorHandler,{
  notFound,
} from "./middleware/errorHandler.js";
import remindersRouter from "./routes/reminders.routes.js";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import requireAuth from "./middleware/requireAuth.js";
import { requireCsrf } from "./middleware/csrf.js";




const app = express(); 
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  express.json({
    limit:"50Kb",
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15*60*1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(cookieParser());


app.get("/" , (req, res) =>{
    res.send("Job Tracker API is running!");
});

app.use("/auth", authRouter);

app.use("/jobs",apiLimiter,requireAuth,requireCsrf, jobsRouter);
app.use("/documents",apiLimiter,requireAuth,requireCsrf, documentsRouter);
app.use("/reminders",apiLimiter,requireAuth,requireCsrf, remindersRouter);


app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
})

// app.get("/jobs", async (req, res) => {
//     try {
//       const jobs = await prisma.job.findMany();
  
//       res.status(200).json(jobs);
//     } catch (error) {
//       console.error("Failed to retrieve jobs:", error);
  
//       res.status(500).json({
//         error: "Unable to retrieve jobs",
//       });
//     }
//   });
// app.post("/jobs", async (req, res) => {
//     try {
//       const { company, title, location, jobUrl, notes } = req.body;
  
//       const job = await prisma.job.create({
//         data: {
//           company,
//           title,
//           location,
//           jobUrl,
//           notes,
//         },
//       });
  
//       res.status(201).json(job);
//     } catch (error) {
//       console.error(error);
  
//       res.status(500).json({
//         error: "Unable to create job",
//       });
//     }
//   });
// app.get("/jobs/:id", async (req, res) => {
//     try {
//       const { id } = req.params;
  
//       const job = await prisma.job.findUnique({
//         where: {
//           id: Number(id),
//         },
//       });
  
//       if (!job) {
//         return res.status(404).json({
//           error: "Job not found",
//         });
//       }
  
//       res.status(200).json(job);
//     } catch (error) {
//       console.error(error);
  
//       res.status(500).json({
//         error: "Unable to retrieve job",
//       });
//     }
//   });

  // app.patch("/jobs/:id", async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const jobId = Number(id);
  
  //     if (Number.isNaN(jobId)) {
  //       return res.status(400).json({
  //         error: "Invalid job ID",
  //       });
  //     }
  
  //     const allowedFields = [
  //       "company",
  //       "title",
  //       "status",
  //       "location",
  //       "jobUrl",
  //       "notes",
  //       "appliedAt",
  //     ];
  
  //     const updates = {};
  
  //     for (const field of allowedFields) {
  //       if (req.body[field] !== undefined) {
  //         updates[field] = req.body[field];
  //       }
  //     }
  
  //     if (Object.keys(updates).length === 0) {
  //       return res.status(400).json({
  //         error: "No valid fields provided for update",
  //       });
  //     }
  
  //     const job = await prisma.job.findUnique({
  //       where: {
  //         id: jobId,
  //       },
  //     });
  
  //     if (!job) {
  //       return res.status(404).json({
  //         error: "Job not found",
  //       });
  //     }
  
  //     const updatedJob = await prisma.job.update({
  //       where: {
  //         id: jobId,
  //       },
  //       data: updates,
  //     });
  
  //     return res.status(200).json(updatedJob);
  //   } catch (error) {
  //     console.error(error);
  
  //     return res.status(500).json({
  //       error: "Unable to update job",
  //     });
  //   }
  // });

  // app.delete("/jobs/:id", async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const jobId = Number(id);
  
  //     if (Number.isNaN(jobId)) {
  //       return res.status(400).json({
  //         error: "Invalid job ID",
  //       });
  //     }
  
  //     const job = await prisma.job.findUnique({
  //       where: {
  //         id: jobId,
  //       },
  //     });
  
  //     if (!job) {
  //       return res.status(404).json({
  //         error: "Job not found",
  //       });
  //     }
  
  //     await prisma.job.delete({
  //       where: {
  //         id: jobId,
  //       },
  //     });
  
  //     return res.status(200).json({
  //       message: "Job deleted successfully",
  //     });
  //   } catch (error) {
  //     console.error(error);
  
  //     return res.status(500).json({
  //       error: "Unable to delete job",
  //     });
  //   }
  // });

