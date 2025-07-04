import { Router } from "express";
import { PaymentController } from "../controllers/Payment.controller";

const router = Router();
const paymentController = new PaymentController();

// Payment processing routes
router.post(
	"/process",
	paymentController.processPayment.bind(paymentController)
);
router.get("/:id", paymentController.getPaymentById.bind(paymentController));
router.get(
	"/bill/:billId",
	paymentController.getPaymentsByBill.bind(paymentController)
);
router.patch(
	"/:id/status",
	paymentController.updatePaymentStatus.bind(paymentController)
);
router.post(
	"/:id/refund",
	paymentController.refundPayment.bind(paymentController)
);

// Payment statistics
router.get(
	"/stats/overview",
	paymentController.getPaymentStats.bind(paymentController)
);

export default router;
