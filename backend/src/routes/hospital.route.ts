import { Router } from "express";
import { HospitalController } from "../controllers/Hospital.controller";

const router = Router();
const hospitalController = new HospitalController();

router.get(
	"/get/:id",
	hospitalController.getHospitalById.bind(hospitalController)
);


export default router;
