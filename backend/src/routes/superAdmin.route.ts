import { Router } from "express";
import { AdminController } from "../controllers/HospitalAdmin.controller";
import { HospitalController } from "../controllers/Hospital.controller";
const router = Router();
const adminController = new AdminController();
const hospitalController = new HospitalController();

router.post(
	"/hospital/create",
	hospitalController.createHospital.bind(hospitalController)
);
router.get(
	"/hospital/fetch-all",
	hospitalController.getAllHospitals.bind(hospitalController)
);
router.patch(
	"/hospital/update/:id",
	hospitalController.updateHospital.bind(hospitalController)
);
router.delete(
	"/hospitals/:id",
	hospitalController.deleteHospital.bind(hospitalController)
);

router.get(
	"/admin/fetch-all",
	adminController.getAllAdmins.bind(adminController)
);
router.get("/admin/:id", adminController.getAdminById.bind(adminController));
router.post("/admin/create", adminController.createAdmin.bind(adminController));
router.patch(
	"/admin/update/:id",
	adminController.updateAdmin.bind(adminController)
);
router.delete(
	"/admin/delete/:id",
	adminController.deleteAdmin.bind(adminController)
);

export default router;
