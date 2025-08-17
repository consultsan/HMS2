import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";

const router = Router();
const notificationController = new NotificationController();

// Lab report routes
router.post(
	"/lab-report/:appointmentLabTestId",
	notificationController.sendLabReport.bind(notificationController)
);

// Diagnosis record routes
router.post(
	"/diagnosis-record/:appointmentId",
	notificationController.sendDiagnosisRecord.bind(notificationController)
);

// Notification history routes
router.get(
	"/history/:patientId",
	notificationController.getNotificationHistory.bind(notificationController)
);

// Resend notification routes
router.post(
	"/resend/:type/:attachmentId",
	notificationController.resendNotification.bind(notificationController)
);

export default router;
