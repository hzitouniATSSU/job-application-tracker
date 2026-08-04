import express from "express";
import {
    createReminder,
    deleteReminder,
    getReminders,
    updateReminder,

} from "../controllers/reminders.controller.js";

const router = express.Router();

router.get("/", getReminders);
router.post("/", createReminder);
router.patch("/:id", updateReminder);
router.delete("/:id", deleteReminder);


export default router;