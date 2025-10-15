import { Request, Response } from "express";
import { OpdChargeRepository } from "../repositories/OpdCharge.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import { OpdCharge, UserRole } from "@prisma/client";
import prisma from "../utils/dbConfig";

// Same roles array as patient creation
const roles: string[] = [
	UserRole.SUPER_ADMIN,
	UserRole.HOSPITAL_ADMIN,
	UserRole.DOCTOR,
	UserRole.RECEPTIONIST,
	UserRole.SALES_PERSON
];

export class OpdChargeController {
	private opdChargeRepo: OpdChargeRepository;

	constructor() {
		this.opdChargeRepo = new OpdChargeRepository();
	}

	createOpdCharge = async (req: Request, res: Response) => {
		// Apply the SAME SUCCESSFUL PATTERN as patient creation
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { doctorId } = req.query as Pick<OpdCharge, "doctorId">;
				const { amount } = req.body as Pick<OpdCharge, "amount">;
				
				// Hospital validation (same as patient creation)
				const hospitalId = req.user.hospitalId;
				if (!hospitalId) {
					throw new AppError("User ain't linked to any hospital", 400);
				}

				// User existence check (same as patient creation)
				const userExists = await prisma.hospitalStaff.findUnique({
					where: { id: req.user.id },
					select: { id: true }
				});

				const data: Pick<OpdCharge, "doctorId" | "amount" | "hospitalId"> = {
					doctorId,
					amount,
					hospitalId
				};

				const opdCharge = await this.opdChargeRepo.create({
					...data,
					createdBy: userExists ? req.user.id : null // Same pattern as patient creation
				});

				res.status(201).json(new ApiResponse("OPD Charge created successfully", opdCharge));
			} catch (error: any) {
				console.error("Error creating OPD charge:", error);
				res.status(error.code || 500).json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	};

	updateOpdCharge = async (req: Request, res: Response) => {
		// Apply the SAME SUCCESSFUL PATTERN as patient creation
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params as Pick<OpdCharge, "id">;
				const { amount } = req.body as Pick<OpdCharge, "amount">;

				// Hospital validation (same as patient creation)
				const hospitalId = req.user.hospitalId;
				if (!hospitalId) {
					throw new AppError("User ain't linked to any hospital", 400);
				}

				const opdCharge = await this.opdChargeRepo.update(id, amount);

				res.status(200).json(new ApiResponse("OPD Charge updated successfully", opdCharge));
			} catch (error: any) {
				console.error("Error updating OPD charge:", error);
				res.status(error.code || 500).json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	};

	deleteOpdCharge = async (req: Request, res: Response) => {
		// Apply the SAME SUCCESSFUL PATTERN as patient creation
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params as Pick<OpdCharge, "id">;
				
				// Hospital validation (same as patient creation)
				const hospitalId = req.user.hospitalId;
				if (!hospitalId) {
					throw new AppError("User ain't linked to any hospital", 400);
				}

				await this.opdChargeRepo.delete(id);
				res.status(204).json(new ApiResponse("OPD Charge deleted successfully"));
			} catch (error: any) {
				console.error("Error deleting OPD charge:", error);
				res.status(error.code || 500).json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
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
