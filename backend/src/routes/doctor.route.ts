import { Router } from "express";
import { HospitalStaffController } from "../controllers/HospitalStaff.controller";
import {
	addDiseaseTemplate,
	getDiseaseTemplates,
	updateDiseaseTemplate
} from "../controllers/diagnosis.controller";
import { SlotController } from "../controllers/slot.controller";
import { AppointmentController } from "../controllers/Appointment.controller";

const router = Router();
const staffController = new HospitalStaffController();
const slotController = new SlotController();
const appointmentController = new AppointmentController();
router.get(
	"/get-by-hospital",
	staffController.getDoctorByHospital.bind(staffController)
);

router.get(
	"/doctor-availability",
	staffController.getDoctorAvailability.bind(staffController)
);

router.post("/add-prescription-template", addDiseaseTemplate);
router.patch("/update-prescription-template/:id", updateDiseaseTemplate);
router.get("/get-prescription-templates", getDiseaseTemplates);

router.post("/add-slot/:id", slotController.createSlot.bind(slotController));
router.get("/get-slots/:id", slotController.getSlotsByDoctor.bind(slotController));
router.patch("/update-slot/:id", slotController.updateSlot.bind(slotController));
router.patch("/update-time-slot-by-appointment-id", slotController.updateTimeSlotByAppointmentId.bind(slotController));
router.get("/kpis/:doctorId", appointmentController.getDoctorKpis.bind(appointmentController));
export default router;
