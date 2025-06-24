import { Request, Response } from "express";
import { SuperAdminRepository } from "../repositories/SuperAdmin.repository";
import AppError from "../utils/AppError";

export class SuperAdminController {
	private superAdminRepository: SuperAdminRepository;

	constructor() {
		this.superAdminRepository = new SuperAdminRepository();
	}

	// Hospital Management
	async getAllHospitals(req: Request, res: Response) {
		try {
			const hospitals = await this.superAdminRepository.getAllHospitals();
			res.json(hospitals);
		} catch (error) {
			console.error("Error fetching hospitals:", error);
			throw new AppError("Error fetching hospitals", 500);
		}
	}

	async createHospital(req: Request, res: Response) {
		try {
			const hospital = await this.superAdminRepository.createHospital(req.body);
			res.status(201).json(hospital);
		} catch (error) {
			console.error("Error creating hospital:", error);
			throw new AppError("Error creating hospital", 500);
		}
	}

	async updateHospital(req: Request, res: Response) {
		try {
			const hospital = await this.superAdminRepository.updateHospital(
				req.params.id,
				req.body
			);
			res.json(hospital);
		} catch (error) {
			console.error("Error updating hospital:", error);
			throw new AppError("Error updating hospital", 500);
		}
	}

	async deleteHospital(req: Request, res: Response) {
		try {
			await this.superAdminRepository.deleteHospital(req.params.id);
			res.status(204).send();
		} catch (error) {
			console.error("Error deleting hospital:", error);
			throw new AppError("Error deleting hospital", 500);
		}
	}

	// Admin Management
	async getAllAdmins(req: Request, res: Response) {
		try {
			const admins = await this.superAdminRepository.getAllAdmins();
			res.json(admins);
		} catch (error) {
			console.error("Error fetching admins:", error);
			throw new AppError("Error fetching admins", 500);
		}
	}

	async createHospitalAdmin(req: Request, res: Response) {
		try {
			const admin = await this.superAdminRepository.createHospitalAdmin(
				req.body
			);
			res.status(201).json(admin);
		} catch (error) {
			console.error("Error creating hospital admin:", error);
			throw new AppError("Error creating hospital admin", 500);
		}
	}

	async updateHospitalAdmin(req: Request, res: Response) {
		try {
			const admin = await this.superAdminRepository.updateHospitalAdmin(
				req.params.id,
				req.body
			);
			res.json(admin);
		} catch (error) {
			console.error("Error updating hospital admin:", error);
			throw new AppError("Error updating hospital admin", 500);
		}
	}

	async deleteHospitalAdmin(req: Request, res: Response) {
		try {
			await this.superAdminRepository.deleteHospitalAdmin(req.params.id);
			res.status(204).send();
		} catch (error) {
			console.error("Error deleting hospital admin:", error);
			throw new AppError("Error deleting hospital admin", 500);
		}
	}

	// KPI Endpoints
	async getSystemKPIs(req: Request, res: Response) {
		try {
			const kpis = await this.superAdminRepository.getSystemKPIs();
			res.json(kpis);
		} catch (error) {
			console.error("Error fetching system KPIs:", error);
			throw new AppError("Error fetching system KPIs", 500);
		}
	}

	async getHospitalKPIs(req: Request, res: Response) {
		try {
			const kpis = await this.superAdminRepository.getSystemKPIs();
			res.json(kpis);
		} catch (error) {
			res.status(500).json({ message: "Error fetching hospital KPIs" });
		}
	}
}
