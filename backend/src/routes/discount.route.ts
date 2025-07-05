import { Router } from "express";
import { DiscountController } from "../controllers/Discount.controller";

const router = Router();
const discountController = new DiscountController();

// Discount management routes
router.post(
	"/create",
	discountController.createDiscount.bind(discountController)
);
router.get("/:id", discountController.getDiscountById.bind(discountController));
router.get("/all", discountController.getAllDiscounts.bind(discountController));
router.patch(
	"/:id",
	discountController.updateDiscount.bind(discountController)
);
router.delete(
	"/:id",
	discountController.deleteDiscount.bind(discountController)
);

// Discount validation and application
router.post(
	"/validate",
	discountController.validateDiscount.bind(discountController)
);
router.post(
	"/:id/apply",
	discountController.applyDiscount.bind(discountController)
);

// Discount statistics
router.get(
	"/stats/overview",
	discountController.getDiscountStats.bind(discountController)
);

export default router;
