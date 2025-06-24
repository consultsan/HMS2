import { Request, Response } from "express";
import { HospitalAdminRepository } from "../repositories/HospitalAdmin.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import { HospitalAdmin } from "@prisma/client";

export class AdminController {
	private adminRepository: HospitalAdminRepository;

	constructor() {
		this.adminRepository = new HospitalAdminRepository();
	}

	async getAllAdmins(req: Request, res: Response) {
		if (req.user && req.user.role == "SUPER_ADMIN") {
			try {
				const admins = await this.adminRepository.getAllAdmins();
				res.status(200).json(new ApiResponse("Fetched successfully", admins));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	}

	async getAdminById(req: Request, res: Response) {
		if (req.user && req.user.role == "SUPER_ADMIN") {
			try {
				const { id } = req.params as Pick<HospitalAdmin, "id">;
				const admin = await this.adminRepository.getAdminById(id);
				res
					.status(200)
					.json(
						new ApiResponse("Fetched the require admin successfully", admin)
					);
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	}

	async createAdmin(req: Request, res: Response) {
		if (req.user && req.user.role == "SUPER_ADMIN") {
			try {
				const body = req.body as Pick<
					HospitalAdmin,
					"name" | "email" | "password" | "hospitalId"
				>;

				if (!body.name || !body.email || !body.password || !body.hospitalId)
					throw new AppError("All fields are required", 400);

				const admin = await this.adminRepository.createAdmin(body);

				res
					.status(201)
					.json(new ApiResponse("Created new admin successfully", admin));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	}

	async updateAdmin(req: Request, res: Response) {
		if (req.user && req.user.role == "SUPER_ADMIN") {
			try {
				const { id } = req.params as Pick<HospitalAdmin, "id">;
				const { name, email, password, status } =
					req.body as Partial<HospitalAdmin>;
				const hospitalId = req.user.hospitalId;

				if (!name && !email && !password && !hospitalId && !status)
					throw new AppError("At least one field is required for update", 400);

				const admin = await this.adminRepository.updateAdmin(id, {
					name,
					email,
					password,
					hospitalId,
					status
				});

				res.status(200).json(new ApiResponse("Made the asked updates", admin));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	}

	async deleteAdmin(req: Request, res: Response) {
		if (req.user && req.user.role == "SUPER_ADMIN") {
			try {
				const { id } = req.params;
				await this.adminRepository.deleteAdmin(id);
				res.status(204).json(new ApiResponse("Deleted the admin successfully"));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	}
}
