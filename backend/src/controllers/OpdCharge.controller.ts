import { Request, Response } from "express";
import { OpdChargeRepository } from "../repositories/OpdCharge.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import { OpdCharge } from "@prisma/client";

export class OpdChargeController {
	private opdChargeRepo: OpdChargeRepository;

	constructor() {
		this.opdChargeRepo = new OpdChargeRepository();
	}

	createOpdCharge = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { doctorId } = req.query as Pick<OpdCharge, "doctorId">;
				const { amount } = req.body as Pick<OpdCharge, "amount">;
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const data: Pick<OpdCharge, "doctorId" | "amount" | "hospitalId"> = {
					doctorId,
					amount,
					hospitalId
				};

				const opdCharge = await this.opdChargeRepo.create(data);

				res
					.status(201)
					.json(new ApiResponse("OPD Charge created successfully", opdCharge));
			} catch (error: any) {
				console.error("Error in createOpdCharge:", error);
				res
					.status(error.code || 500)
					.json(
						new ApiResponse(error.message || "Failed to create OPD Charge")
					);
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	updateOpdCharge = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { id } = req.params as Pick<OpdCharge, "id">;
				const { amount } = req.body as Pick<OpdCharge, "amount">;

				const opdCharge = await this.opdChargeRepo.update(id, amount);

				res
					.status(200)
					.json(new ApiResponse("OPD Charge updated successfully", opdCharge));
			} catch (error: any) {
				console.error("Error in updateOpdCharge:", error);
				res
					.status(error.code || 500)
					.json(
						new ApiResponse(error.message || "Failed to update OPD Charge")
					);
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	deleteOpdCharge = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { id } = req.params as Pick<OpdCharge, "id">;
				await this.opdChargeRepo.delete(id);
				res
					.status(204)
					.json(new ApiResponse("OPD Charge deleted successfully"));
			} catch (error: any) {
				console.error("Error in deleteOpdCharge:", error);
				res
					.status(error.code || 500)
					.json(
						new ApiResponse(error.message || "Failed to delete OPD Charge")
					);
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	getOpdChargesByHospital = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("Hospital ID is required", 400);
				}

				const opdCharges = await this.opdChargeRepo.getByHospital(hospitalId);
				res
					.status(200)
					.json(new ApiResponse("OPD Charges retrieved successfully", opdCharges));
			} catch (error: any) {
				console.error("Error in getOpdChargesByHospital:", error);
				res
					.status(error.code || 500)
					.json(
						new ApiResponse(error.message || "Failed to retrieve OPD Charges")
					);
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	getOpdChargesByDoctor = async (req: Request, res: Response) => {
		try {
			const { doctorId } = req.params;
			const opdCharges = await this.opdChargeRepo.getByDoctor(doctorId);
			res
				.status(200)
				.json(
					new ApiResponse("OPD Charges retrieved successfully", opdCharges)
				);
		} catch (error: any) {
			console.error("Error in getOpdChargesByDoctor:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(error.message || "Failed to retrieve OPD Charges")
				);
		}
	};
}
