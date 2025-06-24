import { Request, Response } from "express";
import {
	AppointmentAttachment,
	VisitType,
	Vital,
	AppointmentStatus,
	Appointment,
	UserRole,
	Surgery,
	SurgicalStatus
} from "@prisma/client";
// import { PDFService, VisitWithRelations } from "../services/pdf.service";
import s3 from "../services/s3client";
import AppError from "../utils/AppError";
import prisma from "../utils/dbConfig";
import redisClient from "../utils/redisClient";
import ApiResponse from "../utils/ApiResponse";
import errorHandler from "../utils/errorHandler";

const roles: string[] = [
	UserRole.SUPER_ADMIN,
	UserRole.HOSPITAL_ADMIN,
	UserRole.DOCTOR,
	UserRole.RECEPTIONIST,
	UserRole.NURSE,
	UserRole.LAB_TECHNICIAN
];

interface Status {
	status: AppointmentStatus;
}

export class AppointmentController {
	async getAppointmentByDateAndDoctor(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { doctorId, date } = req.query;
				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User isn't linked to any hospital", 403);

				const queryDate = new Date(date as string);
				const startOfDay = new Date(Date.UTC(
					queryDate.getUTCFullYear(),
					queryDate.getUTCMonth(),
					queryDate.getUTCDate(),
					0, 0, 0, 0
				));
				const endOfDay = new Date(Date.UTC(
					queryDate.getUTCFullYear(),
					queryDate.getUTCMonth(),
					queryDate.getUTCDate(),
					23, 59, 59, 999
				));

				console.log(startOfDay, endOfDay);
				const appointments = await prisma.appointment.findMany({
					where: {
						hospitalId,
						scheduledAt: {
							gte: startOfDay,
							lte: endOfDay
						},
						doctorId: doctorId as string
					},
					include: {
						patient: true,
						attachments: true,
						vitals: true
					},
					orderBy: {
						scheduledAt: "desc"
					}
				});

				// Return 200 even if no appointments found
				res.status(200).json(new ApiResponse(
					appointments.length ? "Fetched appointments" : "No appointments found",
					appointments
				));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getSurgeyByAppointmentId(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { appointmentId } = req.query as { appointmentId: string };
				const surgery = await prisma.surgery.findUnique({
					where: { appointmentId },
					include: {
						appointment: true
					}
				});
				if (!surgery) res.status(200).json(new ApiResponse("Surgery not found", null));
				res.status(200).json(new ApiResponse("Fetched surgery", surgery));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getSurgeryByHospitalId(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;
				const surgeries = await prisma.surgery.findMany({
					where: { appointment: { hospitalId } },
					include: {
						appointment: {
							include: {
								patient: true,
								doctor: true
							}
						}
					}
				});
				res.status(200).json(new ApiResponse("Fetched surgeries", surgeries));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async addSurgery(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { appointmentId, category, scheduledAt, description, status } =
					req.body as Pick<
						Surgery,
						| "appointmentId"
						| "category"
						| "scheduledAt"
						| "description"
						| "status"
					>;

				// Validate required fields
				if (!appointmentId || !category) {
					throw new AppError("Missing required fields", 400);
				}

				// Check if appointment exists
				const appointment = await prisma.appointment.findUnique({
					where: { id: appointmentId }
				});

				if (!appointment) {
					throw new AppError("Appointment not found", 404);
				}

				const surgery = await prisma.surgery.create({
					data: {
						appointmentId,
						category,
						scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
						description: description || "No description provided",
						status: status || "NOT_CONFIRMED"
					}
				});
				res.status(200).json(new ApiResponse("Surgery added", surgery));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getAppointmentsByDateAndPatient(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId, date } = req.query;
				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User isn't linked to any hospital", 403);

				const data = {
					patientId: patientId as string,
					scheduleAt: new Date(date as string)
				};

				const appointment = await prisma.appointment.findMany({
					where: {
						hospitalId,
						scheduledAt: data.scheduleAt,
						patientId: data.patientId
					},
					include: {
						doctor: true,
						attachments: true,
						vitals: true
					}
				});
				if (!appointment) throw new AppError("Appointment not found", 404);
				res
					.status(200)
					.json(new ApiResponse("Fetched appointments", appointment));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async bookAppointment(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId, visitType, doctorId, scheduledAt, status } =
					req.body as Pick<
						Appointment,
						"patientId" | "visitType" | "doctorId" | "scheduledAt" | "status"
					>;

				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User isn't linked to any hospital", 403);

				const visit = await prisma.appointment.create({
					data: {
						patientId,
						scheduledAt,
						hospitalId,	
						visitType,
						doctorId,
						status: status || AppointmentStatus.SCHEDULED,
						vitals: {
							create: new Array<Vital>()
						},
						attachments: { create: new Array<AppointmentAttachment>() }
					}
				});
				redisClient.lPush(`${hospitalId}_${doctorId}`, JSON.stringify(visit));
				res
					.status(200)
					.json(new ApiResponse("Appointment booked successfully", visit));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getPatientHistory(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId } = req.query;

				const visits = await prisma.appointment.findMany({
					where: { patientId: patientId as string },
					include: {
						diagnosisRecord: true,
						vitals: true,
						attachments: true,
						doctor: true,
						patient: true
					},
					orderBy: {
						scheduledAt: "desc"
					}
				});

				res
					.status(200)
					.json(new ApiResponse("Patient history fetched", visits));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getAppointmentByDate(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { scheduledAt } = req.body as Pick<Appointment, "scheduledAt">;
				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User isn't linked to any hospital", 403);
				const visit = await prisma.appointment.findMany({
					where: { scheduledAt, hospitalId },
					include: {
						diagnosisRecord: true,
						vitals: true,
						attachments: true,
						doctor: true
					}
				});

				if (!visit) throw new AppError("Visit not found", 404);

				res.status(200).json(new ApiResponse("Fetched appointments", visit));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getAppointmentsByHospital(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { hospitalId } = req.user;
				const { visitType } = req.query;
				const appointments = await prisma.appointment.findMany({
					where: { hospitalId, visitType: visitType as VisitType },
					orderBy: {
						scheduledAt: "desc"
					},
					include: {
						patient: true,
						doctor: true,
						diagnosisRecord: true
					}
				});
				res
					.status(200)
					.json(new ApiResponse("Fetched appointments", appointments));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async updateAppointmentSchedule(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const { scheduledAt } = req.body as Pick<Appointment, "scheduledAt">;

				const appointment = await prisma.appointment.update({
					where: { id },
					data: { scheduledAt }
				});

				res.status(200).json(new ApiResponse("Appointment schedule updated", appointment));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async updateAppointmentStatus(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const { status } = req.body as Status;

				if (!status)
					throw new AppError("New status is required to update", 403);

				const visit = await prisma.appointment.update({
					where: { id },
					data: { status }
				});

				res.status(200).json(new ApiResponse("Status updated", visit));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async uploadAttachment(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.query;
				const { type } = req.body as Pick<AppointmentAttachment, "type">;
				const file = req.file;

				if (!file) {
					return res.status(400).json({ error: "No file uploaded" });
				}
				const s3Url = await s3.uploadStream(
					file.buffer,
					file.originalname,
					file.mimetype
				);

				// Clear the buffer to free memory
				// TypeScript: file.buffer is Buffer, so set to Buffer.alloc(0) instead of null
				file.buffer = Buffer.alloc(0);

				const attachment = await prisma.appointmentAttachment.create({
					data: {
						appointmentId: id as string,
						type,
						url: s3Url
					}
				});

				res
					.status(200)
					.json(
						new ApiResponse("Attachments uploaded successfully", attachment)
					);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getAttachments(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const attachments = await prisma.appointmentAttachment.findUnique({
					where: { id },
					select: {
						url: true
					}
				});
				if (!attachments) throw new AppError("Attachments not found", 404);
				res.status(200).json(new ApiResponse("Attachments fetched", attachments));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async deleteAttachment(req: Request, res: Response) {
		try {
			const { id } = req.params;

			const attachment = await prisma.appointmentAttachment.findUnique({
				where: { id }
			});
			if (!attachment) throw new AppError("Attachment not found", 404);
			await s3.deleteFile(attachment.url);
			await prisma.appointmentAttachment.delete({ where: { id } });

			res.status(200).json(new ApiResponse("Attachment deleted successfully"));
		} catch (error: any) {
			errorHandler(error, res);
		}
	}

	async updateSurgeryStatus(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { surgeryId } = req.params;
				const { status, scheduledAt } = req.body as {
					status: SurgicalStatus;
					scheduledAt?: string;
				};

				if (status === "CONFIRMED" && !scheduledAt) {
					throw new AppError(
						"Surgery date is required when confirming a surgery",
						400
					);
				}

				const surgery = await prisma.surgery.update({
					where: { id: surgeryId },
					data: {
						status,
						scheduledAt: scheduledAt ? new Date(scheduledAt) : null
					}
				});

				res
					.status(200)
					.json(new ApiResponse("Surgery status updated", surgery));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	/*
	async generateClinicalSummary(req: Request, res: Response) {
		try {
			const { id } = req.params;

			const visit = (await prisma.appointment.findUnique({
				where: {
					id,
					hospitalId: this.hospitalId
				},
				include: {
					diagnosisRecord: true,
					vitals: true,
					attachments: true,
					doctor: true,
					patient: {
						select: {
							name: true,
							dob: true,
							gender: true,
							bloodGroup: true,
							address: true,
							phone: true
						}
					}
				}
			})) as VisitWithRelations;

			if (!visit) return res.status(404).json({ error: "Visit not found" });

			const pdfBuffer = await PDFService.generateClinicalSummary(visit);

			res.setHeader("Content-Type", "application/pdf");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=clinical-summary-${id}.pdf`
			);
			res.send(pdfBuffer);
			res.send("OK");
		} catch (error) {
			console.error("Generate clinical summary error:", error);
			res.status(500).json({ error: "Failed to generate clinical summary" });
		}
	}
	*/
}
