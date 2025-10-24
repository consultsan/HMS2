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

export default router;
