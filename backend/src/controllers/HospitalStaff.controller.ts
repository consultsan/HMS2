import { Request, Response } from "express";
import { HospitalStaffRepository } from "../repositories/HospitalStaff.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import { HospitalStaff, UserRole, WeekDay } from "@prisma/client";
import prisma from "../utils/dbConfig";
import { addMinutes, isBefore } from "date-fns";

const roles: string[] = [
	UserRole.SUPER_ADMIN,
	UserRole.HOSPITAL_ADMIN,
	UserRole.RECEPTIONIST,
	UserRole.SALES_PERSON
];

export class HospitalStaffController {
	private staffRepo: HospitalStaffRepository;

	constructor() {
		this.staffRepo = new HospitalStaffRepository();
	}

	createStaff = async (req: Request, res: Response) => {
		// Apply the SAME SUCCESSFUL PATTERN as patient creation
		if (req.user && roles.includes(req.user.role)) {
			try {
				const body = req.body as HospitalStaff;
				
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

				const staff = await this.staffRepo.create({ 
					...body, 
					hospitalId,
					createdBy: userExists ? req.user.id : null // Same pattern as patient creation
				});

				res.status(201).json(new ApiResponse("Staff created successfully", staff));
			} catch (error: any) {
				console.error("Error creating staff:", error);
				res.status(error.code || 500).json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	};

	updateStaff = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { id } = req.params;
				const { email, password, name, status, specialisation } =
					req.body as Partial<HospitalStaff>;
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const staff = await this.staffRepo.update(id, {
					email,
					password,
					name,
					status,
					specialisation
				});

				res.json(new ApiResponse("Staff updated successfully", staff));
			} catch (error: any) {
				console.error("Error in updateStaff:", error);
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	deleteStaff = async (req: Request, res: Response) => {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const { id } = req.params as Pick<HospitalStaff, "id">;
				await this.staffRepo.delete(id);
				res.status(204).json(new ApiResponse("Staff deleted successfully"));
			} catch (error: any) {
				console.error("Error in deleteStaff:", error);
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	getDoctorByHospital = async (req: Request, res: Response) => {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User isn't part of any Hospital", 400);

				const doctor = await this.staffRepo.getDoctorsByHospital(hospitalId);
				res.json(new ApiResponse("Doctors fetched successfully", doctor));
			} catch (error: any) {
				console.error("Error in getStaffByHospital:", error);
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};

	getDoctorAvailability = async (req: Request, res: Response) => {
		if (!req.user || roles.includes(req.user.role)) {
			try {
				let { doctorId, date } = req.query as {
					doctorId: string;
					date: string | Date;
				};

				if (!date || !doctorId)
					throw new AppError("Doctor ID and date are required", 400);

				// Ensure proper date parsing
				const queryDate = new Date(date);
				if (isNaN(queryDate.getTime())) {
					throw new AppError("Invalid date format. Please use YYYY-MM-DD format", 400);
				}

				const day = new Intl.DateTimeFormat("en-US", { weekday: "long" })
					.format(queryDate)
					.toUpperCase() as WeekDay;

				const shifts = await prisma.shift.findMany({
					where: {
						staffId: doctorId,
						day
					}
				});

				if (shifts.length === 0)
					throw new AppError(
						"No shift found for this doctor on the given date",
						400
					);

				// Create proper start and end of day timestamps
				const startOfDay = new Date(queryDate);
				startOfDay.setUTCHours(0, 0, 0, 0);

				const endOfDay = new Date(queryDate);
				endOfDay.setUTCHours(23, 59, 59, 999);

				const appointments = await prisma.appointment.findMany({
					where: {
						doctorId,
						scheduledAt: {
							gte: startOfDay,
							lt: endOfDay
						}
					}
				});

				const bookedSlots = new Set(
					appointments.map((appt: any) =>
						new Date(appt.scheduledAt).toISOString()
					)
				);

				const availableSlots: string[] = [];

				shifts.forEach((shift) => {
					const start = new Date(`${queryDate.toISOString().split('T')[0]}T${shift.startTime}:00.000Z`);
					const end = new Date(`${queryDate.toISOString().split('T')[0]}T${shift.endTime}:00.000Z`);
					let current = new Date(start);

					while (isBefore(current, end)) {
						if (!bookedSlots.has(current.toISOString())) {
							availableSlots.push(current.toISOString());
						}
						current = addMinutes(current, 15);
					}
				});

				res
					.status(200)
					.json(
						new ApiResponse(
							"These are the slots of required doctor",
							availableSlots
						)
					);
			} catch (error: any) {
				console.error("Doctor availability error:", error);
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Forbidden: Access denied"));
		}
	};
}
