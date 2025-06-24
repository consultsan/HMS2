import e, { Request, Response } from "express";
import { HospitalRepository } from "../repositories/Hospital.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import { Department, Hospital } from "@prisma/client";
import prisma from "../utils/dbConfig";

export class HospitalController {
	private hospitalRepository: HospitalRepository;

	constructor() {
		this.hospitalRepository = new HospitalRepository();
	}

	async getStaffByHospital(req: Request, res: Response) {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const hospitalId = req.user.hospitalId;
				const staff = await prisma.hospitalStaff.findMany({
					where: {
						hospitalId
					}
				});
				res.status(200).json(new ApiResponse("Staff retrieved successfully", staff));
			} catch (error: any) {
				res.status(error.code || 500).json(new ApiResponse(error.message || "Failed to retrieve staff"));
			}
		}
		else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async getAllHospitals(req: Request, res: Response) {
		if (req.user && req.user.role == "SUPER_ADMIN") {
			try {
				const hospitals = await this.hospitalRepository.getAllHospitals();
				res
					.status(200)
					.json(new ApiResponse("Hospitals retrieved successfully", hospitals));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(
						new ApiResponse(error.message || "Failed to retrieve hospitals")
					);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async getHospitalById(req: Request, res: Response) {
		if (
			req.user &&
			(req.user.role == "SUPER_ADMIN" || req.user.role == "HOSPITAL_ADMIN")
		) {
			try {
				const { id } = req.params as Pick<Hospital, "id">;
				const hospital = await this.hospitalRepository.getHospitalById(id);
				res
					.status(200)
					.json(new ApiResponse("Hospital retrieved successfully", hospital));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(
						new ApiResponse(error.message || "Failed to retrieve hospital")
					);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async createHospital(req: Request, res: Response) {
		if (req.user && req.user.role == "SUPER_ADMIN") {
			try {
				const { name, address, contactNumber, email } = req.body;

				if (!name || !address || !contactNumber || !email) {
					throw new AppError("All fields are required", 400);
				}

				const hospital = await this.hospitalRepository.createHospital({
					name,
					address,
					contactNumber,
					email
				});

				res
					.status(201)
					.json(new ApiResponse("Hospital created successfully", hospital));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Failed to create hospital"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async updateHospital(req: Request, res: Response) {
		if (req.user && req.user.role === "SUPER_ADMIN") {
			try {
				const { id } = req.params as Pick<Hospital, "id">;
				const { name, address, contactNumber, email, status } =
					req.body as Pick<Hospital, "name" | "address" | "contactNumber" | "email" | "status">;

				if (!name && !address && !contactNumber && !email && !status)
					throw new AppError("At least one field is required for update", 400);

				const hospital = await this.hospitalRepository.updateHospital(id, {
					name,
					address,
					contactNumber,
					email,
					status
				});

				res
					.status(200)
					.json(new ApiResponse("Hospital updated successfully", hospital));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Failed to update hospital"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async deleteHospital(req: Request, res: Response) {
		if (req.user && req.user.role == "SUPER_ADMIN") {
			try {
				const { id } = req.params as Pick<Hospital, "id">;
				await this.hospitalRepository.deleteHospital(id);
				res.status(204).json(new ApiResponse("Hospital deleted successfully"));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Failed to delete hospital"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async getDepartmentsByHospital(req: Request, res: Response) {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const hospitalId = req.user.hospitalId;
				const departments = await prisma.department.findMany({
					where: {
						hospitalId
					}
				});
				res.status(200).json(new ApiResponse("Departments retrieved successfully", departments));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Failed to retrieve departments"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async addDepartmentInHospital(req: Request, res: Response) {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User ain't linked to any hospital", 400);

				const { name } = req.body as Pick<Department, "name">;

				if (!hospitalId || !name) {
					throw new AppError(
						"Hospital ID and Department name are required",
						400
					);
				}

				const dept = await this.hospitalRepository.addDepartmentInHospital(
					{
						hospitalId,
						name
					}
				);

				res
					.status(200)
					.json(
						new ApiResponse("Department added to hospital successfully", dept)
					);
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(
						new ApiResponse(
							error.message || "Failed to add department in hospital"
						)
					);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}
}
