import { Router } from "express";
import { PublicAppointmentController } from "../controllers/PublicAppointment.controller";

const router = Router();
const publicAppointmentController = new PublicAppointmentController();

// Test routes for public appointment system
router.get("/test-hospitals", publicAppointmentController.getHospitals.bind(publicAppointmentController));
router.get("/test-doctors/:hospitalId", publicAppointmentController.getDoctorsByHospital.bind(publicAppointmentController));
router.get("/test-slots/:doctorId", publicAppointmentController.getAvailableSlots.bind(publicAppointmentController));

export default router;
