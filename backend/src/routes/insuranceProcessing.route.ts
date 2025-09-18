import { Router } from "express";
import { InsuranceProcessingController } from "../controllers/InsuranceProcessing.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
const insuranceController = new InsuranceProcessingController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Insurance Document Routes
router.post("/document/upload", 
	insuranceController.getUploadMiddleware(),
	insuranceController.uploadInsuranceDocument.bind(insuranceController)
);
router.get("/document/:admissionId", insuranceController.getInsuranceDocuments.bind(insuranceController));
router.delete("/document/:documentId", insuranceController.deleteInsuranceDocument.bind(insuranceController));

// Insurance Verification Routes
router.post("/verification", insuranceController.createInsuranceVerification.bind(insuranceController));
router.get("/verification/:admissionId", insuranceController.getInsuranceVerification.bind(insuranceController));
router.patch("/verification/:admissionId", insuranceController.updateInsuranceVerification.bind(insuranceController));
router.get("/verification", insuranceController.getInsuranceVerificationsByStatus.bind(insuranceController));

// Insurance Processing Dashboard Routes
router.get("/dashboard/stats", insuranceController.getInsuranceProcessingStats.bind(insuranceController));
router.get("/dashboard/incomplete", insuranceController.getAdmissionsWithIncompleteInsurance.bind(insuranceController));

// Policy Validation Routes
router.get("/policy/check/:admissionId", insuranceController.checkPolicyValidity.bind(insuranceController));

export default router;
