import { Router } from "express";
import { IPDController } from "../controllers/IPD.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import multer from "multer";

const router = Router();
const ipdController = new IPDController();

// Configure multer for file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
});

// Apply authentication middleware to all routes
router.use(authMiddleware);

// IPD Queue Routes
router.post("/queue", ipdController.createIPDQueue.bind(ipdController));
router.get("/queue", ipdController.getIPDQueues.bind(ipdController));
router.get("/queue/:id", ipdController.getIPDQueueById.bind(ipdController));
router.patch("/queue/:id/status", ipdController.updateIPDQueueStatus.bind(ipdController));

// IPD Admission Routes
router.post("/admission", upload.single('insuranceCard'), ipdController.createIPDAdmission.bind(ipdController));
router.get("/admission", ipdController.getIPDAdmissions.bind(ipdController));
router.get("/admission/:id", ipdController.getIPDAdmissionById.bind(ipdController));
router.patch("/admission/:id", ipdController.updateIPDAdmission.bind(ipdController));

// IPD Visit Routes
router.post("/visit", ipdController.createIPDVisit.bind(ipdController));
router.get("/visit/:admissionId", ipdController.getIPDVisits.bind(ipdController));

// IPD Discharge Summary Routes
router.post("/discharge-summary", ipdController.createDischargeSummary.bind(ipdController));
router.get("/discharge-summary/:admissionId", ipdController.getDischargeSummary.bind(ipdController));

// Insurance Company Routes
router.post("/insurance-company", ipdController.createInsuranceCompany.bind(ipdController));
router.get("/insurance-company", ipdController.getInsuranceCompanies.bind(ipdController));

// Ward Management Routes
router.post("/ward", ipdController.createWard.bind(ipdController));
router.get("/ward", ipdController.getWards.bind(ipdController));
router.patch("/ward/:id/bed-count", ipdController.updateWardBedCount.bind(ipdController));

// Bed Management Routes
router.get("/ward/:wardId/beds", ipdController.getAvailableBeds.bind(ipdController));
router.post("/bed/assign", ipdController.assignBed.bind(ipdController));
router.patch("/bed/:bedId/release", ipdController.releaseBed.bind(ipdController));

// IPD Patient Document Routes
router.post("/patient-document", upload.single('file'), ipdController.uploadIPDPatientDocument.bind(ipdController));
router.get("/patient-document/:admissionId", ipdController.getIPDPatientDocuments.bind(ipdController));
router.delete("/patient-document/:id", ipdController.deleteIPDPatientDocument.bind(ipdController));

// Dashboard Routes
router.get("/dashboard/stats", ipdController.getIPDDashboardStats.bind(ipdController));

// IPD Lab Test Routes
router.post("/lab-test", ipdController.createIPDLabTest.bind(ipdController));
router.get("/lab-test/:admissionId", ipdController.getIPDLabTests.bind(ipdController));
router.patch("/lab-test/:id", ipdController.updateIPDLabTest.bind(ipdController));
router.post("/lab-test/attachment", ipdController.uploadIPDLabTestAttachment.bind(ipdController));

// IPD Surgery Routes
router.post("/surgery", ipdController.createIPDSurgery.bind(ipdController));
router.get("/surgery/:admissionId", ipdController.getIPDSurgeries.bind(ipdController));
router.patch("/surgery/:id", ipdController.updateIPDSurgery.bind(ipdController));
router.post("/surgery/attachment", ipdController.uploadIPDSurgeryAttachment.bind(ipdController));

// IPD Transfer Routes
router.post("/transfer", ipdController.createIPDTransfer.bind(ipdController));
router.get("/transfer/:admissionId", ipdController.getIPDTransfers.bind(ipdController));
router.patch("/transfer/:id", ipdController.updateIPDTransfer.bind(ipdController));

// Real-time polling routes (WebSocket alternative)
router.get("/realtime/ward", ipdController.getWardUpdates.bind(ipdController));
router.get("/realtime/doctor", ipdController.getDoctorUpdates.bind(ipdController));
router.get("/realtime/nurse", ipdController.getNurseUpdates.bind(ipdController));

// IPD Billing Routes
router.get("/billing/:admissionId/calculate", ipdController.calculateIPDDischargeBill.bind(ipdController));
router.post("/billing/:admissionId/generate", ipdController.generateIPDDischargeBill.bind(ipdController));
router.get("/billing/:admissionId/bills", ipdController.getIPDBills.bind(ipdController));
router.get("/billing/bill/:billId", ipdController.getIPDBillDetails.bind(ipdController));

export default router;
