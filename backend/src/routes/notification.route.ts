import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { sendAppointmentNotification } from "../services/whatsapp.service";

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

//appointment notification
router.post("/appointment-msg",
	notificationController.sendAppointmentNotification.bind(notificationController)
);

router.post("/lab-completion",
	notificationController.sendLabTestComplitionNotification.bind(notificationController)
);

// Prescription notification routes
router.post(
	"/prescription/:prescriptionId",
	notificationController.sendPrescriptionNotification.bind(notificationController)
);

export default router;
