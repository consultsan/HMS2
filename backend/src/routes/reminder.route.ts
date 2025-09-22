import { Router } from "express";
import reminderController from "../controllers/reminder.controller";

const router = Router();

// Reminder service management routes (no auth for testing)
router.post("/start", reminderController.startService.bind(reminderController));
router.post("/stop", reminderController.stopService.bind(reminderController));
router.get("/status", reminderController.getStatus.bind(reminderController));
router.post("/trigger", reminderController.triggerCheck.bind(reminderController));

export default router;
