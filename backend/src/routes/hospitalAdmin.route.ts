import { Router } from "express";
import { HospitalStaffController } from "../controllers/HospitalStaff.controller";
import { ShiftController } from "../controllers/Shift.controller";
import { HospitalController } from "../controllers/Hospital.controller";
import { OpdChargeController } from "../controllers/OpdCharge.controller";
import { PatientController } from "../controllers/Patient.controller";

const router = Router();
const staffController = new HospitalStaffController();
const shiftController = new ShiftController();
const opdChargeController = new OpdChargeController();
const hospitalController = new HospitalController();
const patientController = new PatientController();

router.post("/staff/add", staffController.createStaff.bind(staffController));
router.patch(
	"/staff/update/:id",
	staffController.updateStaff.bind(staffController)
);
router.delete(
	"/staff/delete/:id",
	staffController.deleteStaff.bind(staffController)
);
router.get("/staff/fetch", hospitalController.getStaffByHospital.bind(hospitalController));
router.get("/staff/fetch/:id", shiftController.getStaffById.bind(shiftController));
router.post("/shift/create", shiftController.createShift.bind(shiftController));
router.get("/shifts", shiftController.getShiftsByHospital.bind(shiftController));

router.patch(
	"/shift/update/:id",
	shiftController.updateShift.bind(shiftController)
);
router.delete(
	"/shift/delete/:id",
	shiftController.deleteShift.bind(shiftController)
);
router.get("/opd-charge/fetch", opdChargeController.getOpdChargesByHospital.bind(opdChargeController));
router.post(
	"/opd-charge/create",
	opdChargeController.createOpdCharge.bind(opdChargeController)
);
router.patch(
	"/opd-charge/update/:id",
	opdChargeController.updateOpdCharge.bind(opdChargeController)
);
router.delete(
	"/opd-charge/delete/:id",
	opdChargeController.deleteOpdCharge.bind(opdChargeController)
);
router.post(
	"/add/department",
	hospitalController.addDepartmentInHospital.bind(hospitalController)
);

router.get(
	"/departments",
	hospitalController.getDepartmentsByHospital.bind(hospitalController)
);
router.get(
	"/patient/fetch-all",
	patientController.getAllPatients.bind(patientController)
);
router.post("/shift/create-temp", shiftController.createTempShift.bind(shiftController));
router.get("/shift/temp-shift/:staffId", shiftController.getTempShiftByStaff.bind(shiftController));
router.get("/shift/temp-shift", shiftController.getTempShiftsByHospital.bind(shiftController));
router.delete("/shift/temp-shift/delete/:id", shiftController.deleteTempShift.bind(shiftController));
router.get("/kpis", hospitalController.getHospitalKpis.bind(hospitalController));
router.get("/kpis-by-interval", hospitalController.getHospitalKpisByInterval.bind(hospitalController));

export default router;
