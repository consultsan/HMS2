import { Router } from "express";
import { PatientController } from "../controllers/Patient.controller";
import { upload } from "../services/upload.service";

const router = Router();

const patientController = new PatientController();

router.get("/", patientController.getAllPatients.bind(patientController));

router.post("/create", patientController.createPatient.bind(patientController));

router.get(
	"/get-by-name",
	patientController.getPatientByName.bind(patientController)
);
router.get(
	"/get-by-phone",
	patientController.getPatientByPhone.bind(patientController)
);
router.post(
	"/upload-doc",
	upload.single("file"),
	patientController.uploadDocument.bind(patientController)
);
router.post(
	"/add-vitals/:appointmentId",
	patientController.addVitals.bind(patientController)
);
router.get(
	"/get/:id",
	patientController.getPatientById.bind(patientController)
);

router.patch(
	"/update/:id",
	patientController.updatePatientDetails.bind(patientController)
);

router.get("/family-links", patientController.listFamilyLinks.bind(patientController));

router.post("/add/family-link", patientController.addFamilyLink.bind(patientController));
export default router;
