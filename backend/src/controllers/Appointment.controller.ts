import { Request, Response } from "express";
import { startOfDay, endOfDay } from "date-fns";
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
import { sendAppointmentNotification } from "../services/whatsapp.service";
import { UhidGenerator } from "../utils/uhidGenerator";

const roles: string[] = [
	UserRole.SUPER_ADMIN,
	UserRole.HOSPITAL_ADMIN,
	UserRole.DOCTOR,
	UserRole.RECEPTIONIST,
	UserRole.NURSE,
	UserRole.LAB_TECHNICIAN,
	UserRole.SALES_PERSON
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
				// Convert input date string to Date in UTC, then apply IST offset
				const queryDateUTC = new Date(date as string);
				// Create IST start and end of day
				const startOfDayIST = new Date(queryDateUTC);
				startOfDayIST.setHours(0, 0, 0, 0);

				const endOfDayIST = new Date(queryDateUTC);
				endOfDayIST.setHours(23, 59, 59, 999);

				// Convert IST start/end back to UTC timestamps for DB query
				const startOfDayUTC = new Date(startOfDayIST.getTime());
				const endOfDayUTC = new Date(endOfDayIST.getTime());

				const appointments = await prisma.appointment.findMany({
					where: {
						hospitalId,
						scheduledAt: {
							gte: startOfDayUTC,
							lte: endOfDayUTC
						},
						doctorId: doctorId as string
					},
					include: {
						patient: true,
						attachments: true,
						vitals: true,
						bills: true
					},
					orderBy: {
						scheduledAt: "desc"
					}
				});

				res
					.status(200)
					.json(
						new ApiResponse(
							appointments.length
								? "Fetched appointments"
								: "No appointments found",
							appointments
						)
					);
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
								doctor: true,
								bills: true
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

	async getSurgeryByAppointmentId(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const surgery = await prisma.surgery.findMany({
					where: { appointmentId: id },
					include: {
						appointment: true
					}
				});
				res.status(200).json(new ApiResponse("Fetched surgery", surgery));
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
				if (!appointmentId) {
					return res
						.status(400)
						.json(new ApiResponse("Appointment ID is required", null));
				}

				if (!category) {
					return res
						.status(400)
						.json(new ApiResponse("Surgery category is required", null));
				}

				// Check if appointment exists and belongs to the hospital
				const appointment = await prisma.appointment.findFirst({
					where: {
						id: appointmentId,
						hospitalId: req.user.hospitalId
					}
				});

				if (!appointment) {
					return res
						.status(404)
						.json(
							new ApiResponse("Appointment not found or unauthorized", null)
						);
				}

				// Check if surgery already exists for this appointment
				const existingSurgery = await prisma.surgery.findFirst({
					where: { appointmentId }
				});

				if (existingSurgery) {
					return res
						.status(400)
						.json(
							new ApiResponse(
								"Surgery already exists for this appointment",
								null
							)
						);
				}

				// Create surgery data object
				const surgeryData = {
					appointmentId,
					category,
					description: description?.trim() || "No description provided",
					status: status || "NOT_CONFIRMED"
				} as any; // Using any temporarily to avoid TS errors

				// Add scheduledAt if provided and valid
				if (scheduledAt) {
					const parsedDate = new Date(scheduledAt);
					if (!isNaN(parsedDate.getTime())) {
						surgeryData.scheduledAt = parsedDate;
					} else {
						return res
							.status(400)
							.json(new ApiResponse("Invalid surgery date", null));
					}
				}

				const surgery = await prisma.surgery.create({
					data: surgeryData,
					include: {
						appointment: {
							include: {
								patient: {
									select: {
										id: true,
										name: true,
										patientUniqueId: true
									}
								},
								doctor: {
									select: {
										id: true,
										name: true,
										specialisation: true
									}
								}
							}
						}
					}
				});

				return res
					.status(201)
					.json(new ApiResponse("Surgery added successfully", surgery));
			} catch (error: any) {
				console.error("Error adding surgery:", error);
				errorHandler(error, res);
			}
		} else {
			return res.status(403).json(new ApiResponse("Unauthorized access", null));
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

				const appointments = await prisma.appointment.findMany({
					where: {
						hospitalId,
						scheduledAt: data.scheduleAt,
						patientId: data.patientId
					},
					include: {
						doctor: true,
						attachments: true,
						vitals: true,
						bills: true
					}
				});
				res
					.status(200)
					.json(
						new ApiResponse(
							appointments.length
								? "Fetched appointments"
								: "No appointments found",
							appointments
						)
					);
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

				// Get patient to check if UHID exists
				const patient = await prisma.patient.findUnique({
					where: { id: patientId },
					select: { uhid: true }
				});

				if (!patient) {
					throw new AppError("Patient not found", 404);
				}

				if (!patient.uhid) {
					throw new AppError(
						"Patient UHID not found. Please ensure patient has a valid UHID.",
						400
					);
				}

				// Generate Visit ID
				const visitId = await UhidGenerator.generateVisitID(
					patient.uhid,
					visitType === VisitType.OPD ? "OPD" : "IPD"
				);

				const visit = await prisma.appointment.create({
					data: {
						patientId,
						scheduledAt,
						hospitalId,
						visitType,
						doctorId,
						status: status || AppointmentStatus.SCHEDULED,
						createdBy: req.user.id as string,
						visitId, // Add Visit ID
						vitals: {
							create: new Array<Vital>()
						},
						attachments: { create: new Array<AppointmentAttachment>() }
					},
					include: {
						patient: true,
						doctor: true,
						hospital: true
					}
				});

				redisClient.lPush(`${hospitalId}_${doctorId}`, JSON.stringify(visit));

				// Send WhatsApp notification to patient
				try {
					if (visit.patient.phone) {
						const appointmentTime = new Date(
							visit.scheduledAt
						).toLocaleTimeString("en-IN", {
							hour: "2-digit",
							minute: "2-digit",
							hour12: true
						});

						await sendAppointmentNotification(visit.patient.phone, {
							patientName: visit.patient.name,
							doctorName: visit.doctor.name,
							appointmentDate: visit.scheduledAt,
							appointmentTime: appointmentTime,
							hospitalName: visit.hospital.name
						});
					}
				} catch (whatsappError) {
					console.error("WhatsApp notification failed:", whatsappError);
					// Don't fail the appointment booking if WhatsApp fails
				}

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
						doctor: true,
						bills: true
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
				const appointments = await prisma.appointment.findMany({
					where: { hospitalId },
					orderBy: {
						scheduledAt: "desc"
					},
					include: {
						patient: true,
						doctor: true,
						diagnosisRecord: true,
						bills: true,
						labTests: true
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
	async getCreatedAppointments(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const userId = req.user.id as string;
				const appointments = await prisma.appointment.findMany({
					where: { createdBy: userId },
					orderBy: {
						scheduledAt: "desc"
					},
					include: {
						patient: true,
						doctor: true,
						diagnosisRecord: true,
						bills: true,
						labTests: true
					}
				});
				if (!appointments) throw new AppError("No appointments found", 404);
				res
					.status(200)
					.json(new ApiResponse("Fetched appointments", appointments));
			} catch (error: any) {
				errorHandler(error, res);
			}
		}
	}

	async getCreatedAppointmentsByDate(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { date } = req.query;
				const userId = req.user.id as string;
				let startOfDay, endOfDay;
				if (typeof date === "string") {
					let queryDate;
					// Try to parse as dd/MM/yyyy
					const parts = date.split("/");
					if (parts.length === 3) {
						const [day, month, year] = parts;
						queryDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
					} else {
						// Try to parse as ISO or fallback
						queryDate = new Date(date);
					}
					if (isNaN(queryDate.getTime())) {
						return res
							.status(400)
							.json(new ApiResponse("Invalid date format", null));
					}
					startOfDay = new Date(
						Date.UTC(
							queryDate.getUTCFullYear(),
							queryDate.getUTCMonth(),
							queryDate.getUTCDate(),
							0,
							0,
							0,
							0
						)
					);
					endOfDay = new Date(
						Date.UTC(
							queryDate.getUTCFullYear(),
							queryDate.getUTCMonth(),
							queryDate.getUTCDate(),
							23,
							59,
							59,
							999
						)
					);
				} else {
					return res
						.status(400)
						.json(new ApiResponse("Date is required", null));
				}

				try {
					const appointments = await prisma.appointment.findMany({
						where: {
							createdBy: userId,
							scheduledAt: {
								gte: startOfDay,
								lte: endOfDay
							}
						},
						orderBy: {
							scheduledAt: "desc"
						},
						include: {
							patient: {
								select: {
									id: true,
									name: true,
									patientUniqueId: true,
									phone: true
								}
							},
							doctor: {
								select: {
									id: true,
									name: true,
									specialisation: true
								}
							},
							diagnosisRecord: true,
							bills: true,
							labTests: true
						}
					});

					return res
						.status(200)
						.json(
							new ApiResponse(
								appointments.length
									? "Fetched appointments"
									: "No appointments found",
								appointments
							)
						);
				} catch (dbError) {
					console.error("Database error:", dbError);
					throw new AppError("Failed to fetch appointments from database", 500);
				}
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getAppointmentsByDate(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { date } = req.query;
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				// Create proper date range for the specific day
				let startOfDay, endOfDay;
				if (typeof date === "string") {
					let queryDate;
					// Try to parse as dd/MM/yyyy
					const parts = date.split("/");
					if (parts.length === 3) {
						const [day, month, year] = parts;
						queryDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
					} else {
						// Try to parse as ISO or fallback
						queryDate = new Date(date);
					}
					if (isNaN(queryDate.getTime())) {
						return res
							.status(400)
							.json(new ApiResponse("Invalid date format", null));
					}
					startOfDay = new Date(
						Date.UTC(
							queryDate.getUTCFullYear(),
							queryDate.getUTCMonth(),
							queryDate.getUTCDate(),
							0,
							0,
							0,
							0
						)
					);
					endOfDay = new Date(
						Date.UTC(
							queryDate.getUTCFullYear(),
							queryDate.getUTCMonth(),
							queryDate.getUTCDate(),
							23,
							59,
							59,
							999
						)
					);
				} else {
					return res
						.status(400)
						.json(new ApiResponse("Date is required", null));
				}
				const appointments = await prisma.appointment.findMany({
					where: {
						hospitalId,
						scheduledAt: {
							gte: startOfDay,
							lte: endOfDay
						}
					},
					include: {
						patient: {
							select: {
								id: true,
								name: true,
								patientUniqueId: true,
								phone: true
							}
						},
						doctor: {
							select: {
								id: true,
								name: true,
								specialisation: true
							}
						},
						labTests: {
							include: {
								labTest: {
									select: {
										id: true,
										name: true,
										code: true
									}
								}
							}
						},
						bills: true
					},
					orderBy: {
						scheduledAt: "asc"
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

				res
					.status(200)
					.json(new ApiResponse("Appointment schedule updated", appointment));
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
				res
					.status(200)
					.json(new ApiResponse("Attachments fetched", attachments));
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

	// Generate bill for appointment
	async generateAppointmentBill(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { appointmentId } = req.params;
				const {
					items,
					dueDate,
					notes,
					paidAmount,
					dueAmount,
					status,
					billDate
				} = req.body;

				// Get appointment details
				const appointment = await prisma.appointment.findUnique({
					where: { id: appointmentId },
					include: {
						patient: true,
						doctor: true,
						hospital: true
					}
				});

				if (!appointment) {
					throw new AppError("Appointment not found", 404);
				}

				// Check if bill already exists
				const existingBill = await prisma.bill.findFirst({
					where: { appointmentId }
				});

				if (existingBill) {
					throw new AppError("Bill already exists for this appointment", 400);
				}

				// Calculate totals

				const billItems = [];
				let totalAmount = 0;
				for (const item of items) {
					const itemTotal =
						item.unitPrice * item.quantity - item.discountAmount;
					totalAmount += itemTotal;
					billItems.push({
						itemType: item.itemType,
						description: item.description,
						quantity: item.quantity,
						unitPrice: item.unitPrice,
						totalPrice: itemTotal,
						discountAmount: item.discountAmount,
						notes: item.notes,
						labTestId: item.labTestId,
						surgeryId: item.surgeryId
					});
				}

				// Generate bill number
				const timestamp = Date.now().toString();
				const random = Math.random().toString(36).substring(2, 8).toUpperCase();
				const billNumber = `BILL-${timestamp}-${random}`;

				// Create bill
				const bill = await prisma.bill.create({
					data: {
						billNumber,
						patientId: appointment.patientId,
						hospitalId: appointment.hospitalId,
						appointmentId,
						totalAmount: totalAmount,
						dueAmount: dueAmount,
						paidAmount: paidAmount,
						status: status,
						billDate: billDate ? new Date(billDate) : new Date(),
						dueDate: dueDate ? new Date(dueDate) : new Date(),
						notes,
						billItems: {
							create: billItems
						}
					},
					include: {
						patient: {
							select: {
								id: true,
								name: true,
								patientUniqueId: true
							}
						},
						hospital: {
							select: {
								id: true,
								name: true
							}
						},
						billItems: true
					}
				});

				res
					.status(201)
					.json(new ApiResponse("Bill generated successfully", bill));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	// Get appointment by ID
	async getAppointmentById(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const appointment = await prisma.appointment.findUnique({
					where: { id },
					include: {
						patient: true,
						doctor: true,
						hospital: true,
						vitals: true,
						attachments: true,
						diagnosisRecord: true,
						surgery: true,
						bills: true,
						labTests: {
							include: {
								labTest: true,
								results: {
									include: {
										parameter: true
									}
								}
							}
						}
					}
				});

				if (!appointment) {
					return res.status(404).json(new ApiResponse("Appointment not found"));
				}

				res
					.status(200)
					.json(
						new ApiResponse("Appointment fetched successfully", appointment)
					);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	async getAppointmentByVisitID(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { visitId } = req.params;
				const appointment = await prisma.appointment.findUnique({
					where: { visitId },
					include: {
						patient: true,
						doctor: true,
						hospital: true,
						vitals: true,
						attachments: true,
						diagnosisRecord: true,
						surgery: true,
						bills: true,
						labTests: {
							include: {
								labTest: true,
								results: {
									include: {
										parameter: true
									}
								}
							}
						}
					}
				});

				if (!appointment) {
					return res.status(404).json(new ApiResponse("Appointment not found"));
				}

				res
					.status(200)
					.json(
						new ApiResponse("Appointment fetched successfully", appointment)
					);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}

	// Get appointment billing information
	async getAppointmentBilling(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { appointmentId } = req.params;

				const bill = await prisma.bill.findFirst({
					where: { appointmentId },
					include: {
						patient: {
							select: {
								id: true,
								name: true,
								patientUniqueId: true
							}
						},
						hospital: {
							select: {
								id: true,
								name: true
							}
						},
						billItems: {
							include: {
								labTest: {
									include: {
										labTest: true
									}
								},
								surgery: true
							}
						},
						payments: {
							orderBy: {
								paymentDate: "desc"
							}
						}
					}
				});

				if (!bill) {
					return res
						.status(200)
						.json(new ApiResponse("No bill found for this appointment", null));
				}

				res
					.status(200)
					.json(
						new ApiResponse("Appointment billing retrieved successfully", bill)
					);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async getDoctorKpis(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { doctorId } = req.params;
				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User isn't linked to any hospital", 403);

				// Get all appointments for the doctor
				const appointments = await prisma.appointment.findMany({
					where: { doctorId, hospitalId },
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

				// Calculate KPIs
				const totalAppointments = appointments.length;

				// Count completed appointments (diagnosed status)
				const totalCompletedAppointments = appointments.filter(
					(apt) => apt.status === AppointmentStatus.DIAGNOSED
				).length;

				// Count cancelled appointments
				const totalCancelledAppointments = appointments.filter(
					(apt) => apt.status === AppointmentStatus.CANCELLED
				).length;

				// Calculate total revenue from bills
				const totalRevenue = appointments.reduce((sum, apt) => {
					const billTotal = apt.bills.reduce(
						(billSum, bill) => billSum + bill.totalAmount,
						0
					);
					return sum + billTotal;
				}, 0);

				// Count unique patients
				const uniquePatients = new Set(
					appointments.map((apt) => apt.patientId)
				);
				const totalPatients = uniquePatients.size;

				// Count follow-up appointments (appointments that have a diagnosis with follow-up)
				const totalFollowUps = appointments.filter(
					(apt) => apt.diagnosisRecord?.followUpAppointment
				).length;

				const kpis = {
					id: `${doctorId}-${hospitalId}`, // Composite ID
					doctorId,
					hospitalId,
					totalAppointments,
					totalRevenue,
					totalPatients,
					totalFollowUps,
					totalCancelledAppointments,
					totalCompletedAppointments
				};

				res
					.status(200)
					.json(new ApiResponse("Doctor KPIs retrieved successfully", kpis));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}
	async getDoctorKpisByInterval(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { doctorId } = req.params;
				const { startDate, endDate } = req.query;
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				if (!startDate || !endDate) {
					throw new AppError("Start date and end date are required", 400);
				}

				const startDateTime = new Date(startDate as string);
				const endDateTime = new Date(endDate as string);

				// Set end time to end of day
				endDateTime.setHours(23, 59, 59, 999);

				// Get all appointments for the doctor within date range
				const appointments = await prisma.appointment.findMany({
					where: {
						doctorId,
						hospitalId,
						scheduledAt: {
							gte: startDateTime,
							lte: endDateTime
						}
					},
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

				// Calculate KPIs
				const totalAppointments = appointments.length;

				// Count completed appointments (diagnosed status)
				const totalCompletedAppointments = appointments.filter(
					(apt) => apt.status === AppointmentStatus.DIAGNOSED
				).length;

				// Count cancelled appointments
				const totalCancelledAppointments = appointments.filter(
					(apt) => apt.status === AppointmentStatus.CANCELLED
				).length;

				// Calculate total revenue from bills
				const totalRevenue = appointments.reduce((sum, apt) => {
					const billTotal = apt.bills.reduce(
						(billSum, bill) => billSum + bill.totalAmount,
						0
					);
					return sum + billTotal;
				}, 0);

				// Count unique patients
				const uniquePatients = new Set(
					appointments.map((apt) => apt.patientId)
				);
				const totalPatients = uniquePatients.size;

				// Count follow-up appointments (appointments that have a diagnosis with follow-up)
				const totalFollowUps = appointments.filter(
					(apt) => apt.diagnosisRecord?.followUpAppointment
				).length;

				const kpis = {
					id: `${doctorId}-${hospitalId}-${startDateTime.toISOString()}-${endDateTime.toISOString()}`, // Composite ID with date range
					doctorId,
					hospitalId,
					totalAppointments,
					totalRevenue,
					totalPatients,
					totalFollowUps,
					totalCancelledAppointments,
					totalCompletedAppointments,
					period: {
						start: startDateTime,
						end: endDateTime
					}
				};

				res
					.status(200)
					.json(new ApiResponse("Doctor KPIs retrieved successfully", kpis));
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access", null));
		}
	}
}
