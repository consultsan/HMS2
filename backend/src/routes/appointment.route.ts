import { Router } from "express";
import { AppointmentController } from "../controllers/Appointment.controller";
import { upload } from "../services/upload.service";

const router = Router();

const appointmentController: AppointmentController =
	new AppointmentController();
router.get(
	"/history",
	appointmentController.getPatientHistory.bind(appointmentController)
);
router.post(
	"/book",
	appointmentController.bookAppointment.bind(appointmentController)
);

router.post(
	"/upload-attachment",
	upload.single("file"),
	appointmentController.uploadAttachment.bind(appointmentController)
);
router.get(
	"/get-attachments/:id",
	appointmentController.getAttachments.bind(appointmentController)
);
router.delete(
	"/delete-attachment/:id",
	appointmentController.deleteAttachment.bind(appointmentController)
);
router.patch(
	"/update-status/:id",
	appointmentController.updateAppointmentStatus.bind(appointmentController)
);

router.get(
	"/get-by-date-and-doctor",
	appointmentController.getAppointmentByDateAndDoctor.bind(
		appointmentController
	)
);
router.get(
	"/get-by-hospital",
	appointmentController.getAppointmentsByHospital.bind(appointmentController)
);
router.get(
	"/get-by-date",
	appointmentController.getAppointmentsByDate.bind(
		appointmentController
	)
);
router.get(
	"/get-by-date-and-patient",
	appointmentController.getAppointmentsByDateAndPatient.bind(
		appointmentController
	)
);
router.get(
	"/get-surgery-by-appointment-id/:id",
	appointmentController.getSurgeryByAppointmentId.bind(appointmentController)
);
router.post(
	"/add-surgery",
	appointmentController.addSurgery.bind(appointmentController)
);
router.patch(
	"/update-surgery-status/:surgeryId",
	appointmentController.updateSurgeryStatus.bind(appointmentController)
);
router.get(
	"/get-surgery-by-hospital-id",
	appointmentController.getSurgeryByHospitalId.bind(appointmentController)
);

router.patch(
	"/update-appointment-schedule/:id",
	appointmentController.updateAppointmentSchedule.bind(appointmentController)
);

// Specific routes first
router.get(
	"/get-created-appointments",
	appointmentController.getCreatedAppointments.bind(appointmentController)
);

router.get(
	"/get-created-appointments-by-date",
	appointmentController.getCreatedAppointmentsByDate.bind(appointmentController)
);

// Appointment billing routes
router.post(
	"/:appointmentId/generate-bill",
	appointmentController.generateAppointmentBill.bind(appointmentController)
);
router.get(
	"/:appointmentId/billing",
	appointmentController.getAppointmentBilling.bind(appointmentController)
);

// Generic ID route last
router.get(
	"/:id",
	appointmentController.getAppointmentById.bind(appointmentController)
);

export default router;
