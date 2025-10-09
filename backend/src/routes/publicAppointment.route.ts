import { Router } from "express";
import { PublicAppointmentController } from "../controllers/PublicAppointment.controller";

const router = Router();
const publicAppointmentController = new PublicAppointmentController();

// Public routes (no authentication required)
router.get("/hospitals", publicAppointmentController.getHospitals.bind(publicAppointmentController));
router.get("/hospitals/:hospitalId/doctors", publicAppointmentController.getDoctorsByHospital.bind(publicAppointmentController));
router.get("/doctors/:doctorId/slots", publicAppointmentController.getAvailableSlots.bind(publicAppointmentController));
router.post("/book", publicAppointmentController.bookPublicAppointment.bind(publicAppointmentController));
router.get("/status/:visitId", publicAppointmentController.getAppointmentStatus.bind(publicAppointmentController));

export default router;
