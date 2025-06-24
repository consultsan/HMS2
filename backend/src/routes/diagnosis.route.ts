import { Router } from "express";

import {
	createDiagnosisRecord,
	getDiagnosisRecord,
	downloadDiagnosisPDF
} from "../controllers/diagnosis.controller";

const router = Router();

router.post("/add-diagnosis", createDiagnosisRecord);
router.get("/get-by-appointment/:appointmentId", getDiagnosisRecord);
router.get("/download-pdf/:appointmentId", downloadDiagnosisPDF);

export default router;
