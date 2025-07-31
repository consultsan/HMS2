import { Request, Response } from "express";
import { SuperAdminRepository } from "../repositories/SuperAdmin.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import prisma from "../utils/dbConfig";
import { previousSaturday } from "date-fns";
import { fetchHospitalKpisByInterval } from "../utils/hospitalKpiHelper";

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
	async countAllAdmins(req: Request, res: Response) {
		try {
			const adminCount = await prisma.hospitalAdmin.count();
			return res.status(200).json({ count: adminCount });
		} catch (error) {
			console.error("Failed to count hospital admins:", error);
			// Send a proper error response instead of throwing
			return res.status(500).json({
				message: "Internal Server Error: Unable to fetch admin count",
				error: error instanceof Error ? error.message : error
			});
		}
	}


	async getKpisByInterval(req: Request, res: Response) {
  if (req.user && req.user.role === "SUPER_ADMIN") {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new AppError("Start date and end date are required", 400);
      }

      const startDateTime = new Date(startDate as string);
      const endDateTime = new Date(endDate as string);
      endDateTime.setHours(23, 59, 59, 999);

      const totalAdmins = await prisma.hospitalAdmin.count();
      const hospitals = await prisma.hospital.findMany();
      const hospitalDetailsList: Record<string, any> = {};

      for (const hospital of hospitals) {
        const kpis = await fetchHospitalKpisByInterval(hospital.id, startDateTime, endDateTime);
        hospitalDetailsList[hospital.name] = kpis;
      }

      res.status(200).json(
        new ApiResponse("Super Admin KPIs retrieved successfully", {
          totalAdmins,
          hospitalDetails: hospitalDetailsList,
          period: { start: startDateTime, end: endDateTime }
        })
      );
    } catch (error: any) {
      res.status(error.code || 500).json(
        new ApiResponse(error.message || "Failed to retrieve hospital KPIs by date")
      );
    }
  } else {
    res.status(403).json(new ApiResponse("Unauthorized access", null));
  }
}
}
