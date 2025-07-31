import { Router } from "express";
import { BillingController } from "../controllers/Billing.controller";


const router = Router();
const billingController = new BillingController();

// Bill management routes
router.post("/create", billingController.createBill.bind(billingController));
router.get("/:id", billingController.getBillById.bind(billingController));
router.get(
	"/patient/:patientId",
	billingController.getBillsByPatient.bind(billingController)
);
router.get(
	"/hospital/all",
	billingController.getBillsByHospital.bind(billingController)
);
router.patch(
	"/:id/status",
	billingController.updateBillStatus.bind(billingController)
);
router.post(
	"/:billId/items",
	billingController.addBillItem.bind(billingController)
);

// Billing statistics
router.get(
	"/stats/overview",
	billingController.getBillingStats.bind(billingController)
);
// HTML template generation
router.get("/get-html/:id", billingController.getHtmlTemplate.bind(billingController));

// Export routes
router.get("/:id/export/pdf", billingController.exportBillPDF.bind(billingController));

export default router;
