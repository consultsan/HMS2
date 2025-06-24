import { Request, Response } from "express";
import { ShiftRepository } from "../repositories/Shift.repository";
import AppError from "../utils/AppError";
import { Shift, TempShift } from "@prisma/client";
import ApiResponse from "../utils/ApiResponse";
import prisma from "../utils/dbConfig";

export class ShiftController {
	private shiftRepo: ShiftRepository;

	constructor() {
		this.shiftRepo = new ShiftRepository();
	}

	createShift = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { shiftName, day, startTime, endTime, staffId } =
					req.body as Pick<
						Shift,
						"shiftName" | "day" | "startTime" | "endTime" | "staffId"
					>;

				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User isn't linked to any hospital", 403);

				const data: Pick<
					Shift,
					| "shiftName"
					| "day"
					| "startTime"
					| "endTime"
					| "staffId"
					| "hospitalId"
				> = {
					shiftName,
					day,
					startTime,
					endTime,
					staffId,
					hospitalId
				};

				const shift = await this.shiftRepo.create(data);

				res
					.status(201)
					.json(new ApiResponse("Shift created successfully", shift));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse("Failed to create shift"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	createTempShift = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { startTime, endTime, staffId } = req.body as Pick<TempShift, "startTime" | "endTime" | "staffId">;
				const shift = await prisma.tempShift.create({
					data: {
						startTime,
						endTime,
						staffId,
						hospitalId: req.user.hospitalId ?? ""
					}
				});
				res.status(201).json(new ApiResponse("Shift created successfully", shift));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse("Failed to create shift"));
			}
		}
		else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	}

	updateShift = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { id } = req.params as Pick<Shift, "id">;
				const { shiftName, startTime, endTime, day, status } =
					req.body as Partial<Shift>;

				const shift = await this.shiftRepo.update(id, {
					shiftName,
					startTime,
					endTime,
					day,
					status
				});

				res.json(shift);
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse("Failed to create shift"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	deleteShift = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { id } = req.params as Pick<Shift, "id">;
				await this.shiftRepo.delete(id);
				res.status(204).json(new ApiResponse("Shift deleted successfully"));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse("Failed to create shift"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	getShiftsByHospital = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("Hospital ID is required", 400);
				}

				const shifts = await this.shiftRepo.getByHospital(hospitalId);
				res.json(
					new ApiResponse("Shifts fetched successfully", shifts)
				);
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse("Failed to create shift"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	getTempShiftsByHospital = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const hospitalId = req.user.hospitalId;
				if (!hospitalId) {
					throw new AppError("Hospital ID is required", 400);
				}
				const shifts = await prisma.tempShift.findMany({
					where: {
						hospitalId
					}
				});
				res.json(
					new ApiResponse("Temp shifts fetched successfully", shifts)
				);
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse("Failed to create shift"));
			}
		}
		else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	}
	getTempShiftByStaff = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { staffId } = req.params;
				const shifts = await prisma.tempShift.findMany({
					where: {
						staffId
					}
				});
				res.json(new ApiResponse("Temp shifts fetched successfully", shifts));
			} catch (error: any) {
				res	
					.status(error.code || 500)
					.json(new ApiResponse("Failed to create shift"));
			}
		}
		else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	}
	getShiftsByStaff = async (req: Request, res: Response) => {
		try {
			const { staffId } = req.params;
			const shifts = await this.shiftRepo.getByStaff(staffId);
			res.json(shifts);
		} catch (error: any) {
			res
				.status(error.code || 500)
				.json(new ApiResponse("Failed to create shift"));
		}
	};
	getStaffById = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const staff = await prisma.hospitalStaff.findUnique({
				where: {
					id
				},
				include: {
					shifts: true
				}
			});
			res.json(
				new ApiResponse("Staff fetched successfully", staff)
			);
		} catch (error: any) {
			res.status(error.code || 500).json(new ApiResponse("Failed to create shift"));
		}
	}
}
