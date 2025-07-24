import e, { Request, Response } from "express";
import { HospitalRepository } from "../repositories/Hospital.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import { AppointmentStatus, Department, Hospital } from "@prisma/client";
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
	async getHospitalKpis(req: Request, res: Response) {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const hospitalId = req.user.hospitalId;
				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				// Get all appointments for the hospital
				const appointments = await prisma.appointment.findMany({
					where: { hospitalId },
					include: {
						bills: {
							include: {
								billItems: true
							}
						},
						diagnosisRecord: {
							include: {
								followUpAppointment: true
							}
						}
					}
				});

				// Get total patients count
				const totalPatients = await prisma.patient.count({
					where: { hospitalId }
				});

				// Get hospital staff count
				const totalStaff = await prisma.hospitalStaff.count({
					where: { hospitalId }
				});

				// Get lab tests count
				const totalLabTests = await prisma.appointmentLabTest.count({
					where: {
						appointment: { hospitalId }
					}
				});

				// Get pending lab tests count
				const pendingLabTests = await prisma.appointmentLabTest.count({
					where: {
						appointment: { hospitalId },
						status: 'PENDING'
					}
				});

				// Calculate KPIs from appointments
				const totalAppointments = appointments.length;

				// Count completed appointments (diagnosed status)
				const totalCompletedAppointments = appointments.filter(
					apt => apt.status === 'DIAGNOSED'
				).length;

				// Count cancelled appointments
				const totalCancelledAppointments = appointments.filter(
					apt => apt.status === 'CANCELLED'
				).length;

				// Calculate total revenue from bills
				const totalRevenue = appointments.reduce((sum, apt) => {
					const billTotal = apt.bills.reduce((billSum, bill) => billSum + bill.totalAmount, 0);
					return sum + billTotal;
				}, 0);

				// Count follow-up appointments
				const totalFollowUps = appointments.filter(
					apt => apt.diagnosisRecord?.followUpAppointment
				).length;

				// Calculate average revenue per appointment
				const averageRevenuePerAppointment = totalAppointments > 0
					? Math.round(totalRevenue / totalAppointments)
					: 0;

				// Count unique patients from appointments (active patients)
				const uniquePatients = new Set(appointments.map(apt => apt.patientId));
				const activePatients = uniquePatients.size;

				const hospitalKpis = {
					id: `hospital-${hospitalId}`,
					hospitalId,
					totalAppointments,
					totalRevenue,
					totalPatients,
					activePatients,
					totalStaff,
					totalLabTests,
					pendingLabTests,
					totalFollowUps,
					totalCancelledAppointments,
					totalCompletedAppointments,
					averageRevenuePerAppointment
				};

				res.status(200).json(new ApiResponse("Hospital KPIs retrieved successfully", hospitalKpis));
			} catch (error: any) {
				res.status(error.code || 500).json(new ApiResponse(error.message || "Failed to retrieve hospital KPIs"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}
	async getHospitalKpisByInterval(req: Request, res: Response) {
		if (req.user && req.user.role == "HOSPITAL_ADMIN") {
			try {
				const hospitalId = req.user.hospitalId;
				const { startDate, endDate } = req.query;

				if (!hospitalId) {
					throw new AppError("Hospital ID is required", 400);
				}

				if (!startDate || !endDate) {
					throw new AppError("Start date and end date are required", 400);
				}

				const startDateTime = new Date(startDate as string);
				const endDateTime = new Date(endDate as string);

				// Set end time to end of day
				endDateTime.setHours(23, 59, 59, 999);

				// Get all appointments for the hospital within date range
				const appointments = await prisma.appointment.findMany({
					where: {
						hospitalId,
						scheduledAt: {
							gte: startDateTime,
							lte: endDateTime
						}
					},
					include: {
						bills: {
							include: {
								billItems: true,
								payments: true
							}
						},
						diagnosisRecord: {
							include: {
								followUpAppointment: true
							}
						},
						patient: true,
						doctor: true,
						labTests: {
							include: {
								labTest: true,
								results: true
							}
						}
					}
				});

				// Get all patients registered in the date range
				const patients = await prisma.patient.findMany({
					where: {
						hospitalId,
						createdAt: {
							gte: startDateTime,
							lte: endDateTime
						}
					}
				});

				// Get all staff members
				const staff = await prisma.hospitalStaff.findMany({
					where: { hospitalId }
				});

				// Get all lab tests in the date range
				const labTests = await prisma.appointmentLabTest.findMany({
					where: {
						appointment: {
							hospitalId,
							scheduledAt: {
								gte: startDateTime,
								lte: endDateTime
							}
						}
					},
					include: {
						labTest: true,
						results: true
					}
				});

				// Calculate KPIs
				const totalAppointments = appointments.length;
				const totalPatients = patients.length;
				const activePatients = new Set(appointments.map(apt => apt.patientId)).size;
				const totalStaff = staff.length;
				const totalLabTests = labTests.length;
				const pendingLabTests = labTests.filter(test => test.results.length === 0).length;

				// Calculate appointment statistics
				const completedAppointments = appointments.filter(
					apt => apt.status === "DIAGNOSED"
				).length;
				const cancelledAppointments = appointments.filter(
					apt => apt.status === "CANCELLED"
				).length;
				const followUps = appointments.filter(
					apt => apt.diagnosisRecord?.followUpAppointment
				).length;

				// Calculate revenue
				const totalRevenue = appointments.reduce((sum, apt) => {
					const billTotal = apt.bills.reduce((billSum: number, bill) => {
						return billSum + (bill.status === "PAID" ? bill.totalAmount : 0);
					}, 0);
					return sum + billTotal;
				}, 0);

				// Calculate average revenue per appointment
				const averageRevenuePerAppointment = totalAppointments > 0
					? totalRevenue / totalAppointments
					: 0;

				const kpis = {
					totalAppointments,
					totalPatients,
					activePatients,
					totalStaff,
					totalRevenue,
					averageRevenuePerAppointment,
					totalLabTests,
					pendingLabTests,
					totalCompletedAppointments: completedAppointments,
					totalCancelledAppointments: cancelledAppointments,
					totalFollowUps: followUps,
					period: {
						start: startDateTime,
						end: endDateTime
					}
				};

				res.status(200).json(
					new ApiResponse("Hospital KPIs retrieved successfully", kpis)
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
