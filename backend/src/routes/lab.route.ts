import { Router } from "express";
import {
	// Lab Test Controllers
	createLabTest,
	getLabTests,
	getLabTestById,
	updateLabTest,
	deleteLabTest,

	// Lab Test Parameter Controllers
	createParameter,
	getParametersByLabTest,
	getParameterById,
	updateParameter,
	deleteParameter,

	// Lab Test Order Controllers
	createLabOrder,
	createExternalLabOrder,
	getInternalLabOrderByHospital,
	getExternalLabOrderByHospital,
	orderLabTest,
	getOrderedTestsByAppointment,
	getOrderedTestById,
	updateLabTestOrder,
	cancelLabTestOrder,
	markTestSentExternal,
	attachReportToOrder,

	// Lab Test Result Controllers
	recordTestResult,
	getResultsByOrder,
	getResultById,
	updateTestResult,
	deleteTestResult,
	getOrderedTestsByPatient,
	getOrderedTestByHospital,

	// Lab Test Attachment Controllers
	uploadLabTestAttachment,
	getLabTestAttachmentsByAppointmentLabTestId,

	// Lab Test Billing Controllers
	generateLabTestBill,
	getLabTestBilling,
	updateLabOrder
} from "../controllers/lab.controller";
import { upload } from "../services/upload.service";

const router = Router();

// Lab Test Routes
router.post("/tests", createLabTest);
router.get("/tests", getLabTests);
router.get("/tests/:id", getLabTestById);
router.patch("/tests/:id", updateLabTest);
router.delete("/tests/:id", deleteLabTest);

// Lab Test Parameter Routes
router.post("/parameters", createParameter);
router.get("/tests/:labTestId/parameters", getParametersByLabTest);
router.get("/parameters/:id", getParameterById);
router.patch("/parameters/:id", updateParameter);
router.delete("/parameters/:id", deleteParameter);

// Lab Test Order Routes	
router.post("/lab-order", createLabOrder);
router.post("/external-lab-order", createExternalLabOrder);
router.get("/lab-orders-by-hospital", getInternalLabOrderByHospital);
router.get("/external-lab-orders-by-hospital", getExternalLabOrderByHospital);
router.patch("/lab-orders/:id", updateLabOrder); // Changed to lab-orders for LabOrder updates
router.post("/orders", orderLabTest);
router.get("/appointments/:appointmentId/orders", getOrderedTestsByAppointment);
router.get("/orders/:id", getOrderedTestById);
router.patch("/orders/:id", updateLabTestOrder); // Keep as orders for AppointmentLabTest updates
router.delete("/orders/:id", cancelLabTestOrder);
router.patch("/orders/:id/mark-external", markTestSentExternal);
router.patch("/orders/:id/attach-report", attachReportToOrder);
router.get("/patients/:patientId/orders", getOrderedTestsByPatient);
router.get("/hospitals/orders", getOrderedTestByHospital);

// Lab Test Attachment Routes
router.post(
	"/upload/attachment",
	upload.single("file"),
	uploadLabTestAttachment
);
router.get("/attachments/:id", getLabTestAttachmentsByAppointmentLabTestId);

// Lab Test Result Routes
router.post("/results", recordTestResult);
router.get("/orders/:appointmentLabTestId/results", getResultsByOrder);
router.get("/results/:id", getResultById);
router.patch("/results/:id", updateTestResult);
router.delete("/results/:id", deleteTestResult);

// Lab Test Billing Routes
router.post("/orders/:appointmentLabTestId/generate-bill", generateLabTestBill);
router.get("/orders/:appointmentLabTestId/billing", getLabTestBilling);

export default router;
