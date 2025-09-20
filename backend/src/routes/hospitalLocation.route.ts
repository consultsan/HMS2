import { Router } from "express";
import hospitalLocationController from "../controllers/HospitalLocation.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route PUT /api/hospital-location/:hospitalId
 * @desc Update hospital location data (coordinates and place ID)
 * @access Private (Hospital Admin, Super Admin)
 */
router.put("/:hospitalId", hospitalLocationController.updateHospitalLocation);

/**
 * @route GET /api/hospital-location/:hospitalId
 * @desc Get hospital location data
 * @access Private (All authenticated users)
 */
router.get("/:hospitalId", hospitalLocationController.getHospitalLocation);

/**
 * @route GET /api/hospital-location
 * @desc Get all hospitals with location data
 * @access Private (All authenticated users)
 */
router.get("/", hospitalLocationController.getAllHospitalsWithLocation);

/**
 * @route POST /api/hospital-location/test
 * @desc Test Google Maps integration
 * @access Private (Hospital Admin, Super Admin)
 */
router.post("/test", hospitalLocationController.testGoogleMapsIntegration);

export default router;
