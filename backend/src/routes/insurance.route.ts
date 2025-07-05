import { Router } from "express";
import { InsuranceController } from "../controllers/Insurance.controller";

const router = Router();
const insuranceController = new InsuranceController();

// Insurance management routes
router.post("/add", insuranceController.addInsurance.bind(insuranceController));
router.get(
	"/:id",
	insuranceController.getInsuranceById.bind(insuranceController)
);
router.get(
	"/patient/:patientId",
	insuranceController.getInsuranceByPatient.bind(insuranceController)
);
router.patch(
	"/:id",
	insuranceController.updateInsurance.bind(insuranceController)
);
router.delete(
	"/:id",
	insuranceController.deleteInsurance.bind(insuranceController)
);

// Insurance validation
router.post(
	"/validate",
	insuranceController.validateInsurance.bind(insuranceController)
);

// Insurance statistics
router.get(
	"/stats/overview",
	insuranceController.getInsuranceStats.bind(insuranceController)
);

export default router;
