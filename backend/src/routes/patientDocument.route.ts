import { Router } from "express";
import { PatientDocumentController } from "../controllers/PatientDocument.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();
const patientDocumentController = new PatientDocumentController();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Document Folder Management Routes
router.post("/folder", patientDocumentController.createDocumentFolder.bind(patientDocumentController));
router.get("/folder/patient/:patientId", patientDocumentController.getDocumentFolders.bind(patientDocumentController));
router.get("/folder/:folderId", patientDocumentController.getDocumentFolderById.bind(patientDocumentController));
router.put("/folder/:folderId", patientDocumentController.updateDocumentFolder.bind(patientDocumentController));

// Document Upload and Management Routes
router.post(
	"/upload", 
	patientDocumentController.getUploadMiddleware(),
	patientDocumentController.uploadPatientDocument.bind(patientDocumentController)
);

router.post(
	"/version/:originalDocumentId", 
	patientDocumentController.getUploadMiddleware(),
	patientDocumentController.createDocumentVersion.bind(patientDocumentController)
);

router.get("/patient/:patientId", patientDocumentController.getPatientDocuments.bind(patientDocumentController));
router.get("/:documentId", patientDocumentController.getDocumentById.bind(patientDocumentController));
router.put("/:documentId/status", patientDocumentController.updateDocumentStatus.bind(patientDocumentController));
router.delete("/:documentId", patientDocumentController.deleteDocument.bind(patientDocumentController));

// Document Access Logging Routes
router.get("/:documentId/access-logs", patientDocumentController.getDocumentAccessLogs.bind(patientDocumentController));

// Dashboard and Analytics Routes
router.get("/patient/:patientId/stats", patientDocumentController.getPatientDocumentStats.bind(patientDocumentController));
router.get("/patient/:patientId/search", patientDocumentController.searchDocuments.bind(patientDocumentController));

// Admission-specific Document Routes
router.get("/admission/:admissionId", patientDocumentController.getDocumentsByAdmission.bind(patientDocumentController));

export default router;
