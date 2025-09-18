import { Router } from 'express';
import PrescriptionController from '../controllers/Prescription.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// ========================================
// DRUG MANAGEMENT ROUTES
// ========================================

// Create a new drug
router.post('/drugs', authMiddleware, PrescriptionController.createDrug);

// Get all drugs with optional filters
router.get('/drugs', authMiddleware, PrescriptionController.getAllDrugs);

// Get drug by ID
router.get('/drugs/:id', authMiddleware, PrescriptionController.getDrugById);

// Update drug
router.put('/drugs/:id', authMiddleware, PrescriptionController.updateDrug);

// Delete drug (soft delete)
router.delete('/drugs/:id', authMiddleware, PrescriptionController.deleteDrug);

// ========================================
// DRUG INTERACTION ROUTES
// ========================================

// Create drug interaction
router.post('/drug-interactions', authMiddleware, PrescriptionController.createDrugInteraction);

// Check drug interactions for multiple drugs
router.post('/drug-interactions/check', authMiddleware, PrescriptionController.checkDrugInteractions);

// Get all drug interactions
router.get('/drug-interactions', authMiddleware, PrescriptionController.getAllDrugInteractions);

// ========================================
// PRESCRIPTION MANAGEMENT ROUTES
// ========================================

// Create a new prescription
router.post('/prescriptions', authMiddleware, PrescriptionController.createPrescription);

// Get prescription by ID
router.get('/prescriptions/:id', authMiddleware, PrescriptionController.getPrescriptionById);

// Get prescription by prescription number
router.get('/prescriptions/number/:prescriptionNumber', authMiddleware, PrescriptionController.getPrescriptionByNumber);

// Get patient prescriptions
router.get('/patients/:patientId/prescriptions', authMiddleware, PrescriptionController.getPatientPrescriptions);

// Get doctor prescriptions
router.get('/doctors/:doctorId/prescriptions', authMiddleware, PrescriptionController.getDoctorPrescriptions);

// Update prescription status
router.put('/prescriptions/:id/status', authMiddleware, PrescriptionController.updatePrescriptionStatus);

// Update prescription item status
router.put('/prescription-items/:itemId/status', authMiddleware, PrescriptionController.updatePrescriptionItemStatus);

// Get expired prescriptions
router.get('/prescriptions/expired', authMiddleware, PrescriptionController.getExpiredPrescriptions);

// Mark prescriptions as expired
router.put('/prescriptions/mark-expired', authMiddleware, PrescriptionController.markPrescriptionsAsExpired);

// ========================================
// STOCK MANAGEMENT ROUTES
// ========================================

// Update drug stock
router.put('/drugs/:id/stock', authMiddleware, PrescriptionController.updateDrugStock);

// Get low stock drugs
router.get('/drugs/low-stock', authMiddleware, PrescriptionController.getLowStockDrugs);

// ========================================
// DASHBOARD & ANALYTICS ROUTES
// ========================================

// Get prescription statistics
router.get('/hospitals/:hospitalId/stats', authMiddleware, PrescriptionController.getPrescriptionStats);

export default router;
