import { Request, Response } from "express";
import { PatientRepository } from "../repositories/Patient.repository";
import fs from "fs";
import prisma from "../utils/dbConfig";
import s3 from "../services/s3client";
import {
	Patient,
	Vital,
	PatientDoc,
	PatientFamilyLink,
	UserRole
} from "@prisma/client";
import ApiResponse from "../utils/ApiResponse";
import AppError from "../utils/AppError";
import errorHandler from "../utils/errorHandler";
import { maskPatientsDataForDoctor, maskPatientDataForDoctor } from "../utils/mobileMasker";

interface Document {
	type: PatientDoc;
}

const roles: string[] = [
	UserRole.SUPER_ADMIN,
	UserRole.HOSPITAL_ADMIN,
	UserRole.RECEPTIONIST,
	UserRole.SALES_PERSON,
	UserRole.DOCTOR
];

export class PatientController {
	private patientRepository: PatientRepository;

	constructor() {
		this.patientRepository = new PatientRepository();
	}

	async getAllPatients(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { hospitalId, role, id } = req.user as { hospitalId: string; role: string; id: string };
				if (!hospitalId)
					throw new AppError("User ain't linked to any hospital", 400);

				let patients;

				// Role-based patient filtering
				if (role === "SALES_PERSON") {
					// Sales person can see:
					// 1. Patients created by themselves
					// 2. Follow-up patients (regardless of who created them)
					// 3. Surgery patients (regardless of who created them)
					patients = await this.patientRepository.findFollowUpAndSurgeryPatientsByHospital(id, hospitalId);
				} else if (role === "RECEPTIONIST") {
					// Receptionist can see all patients in the hospital (including those created by sales persons)
					patients = await prisma.patient.findMany({
						where: {
							hospitalId
						},
						include: {
							appointments: {
								include: {
									diagnosisRecord: {
										include: {
											followUpAppointment: true
										}
									},
									surgery: true
								},
								orderBy: {
									scheduledAt: "desc"
								}
							}
						},
						orderBy: {
							createdAt: "desc"
						}
					});
				} else {
					// Other roles (Hospital Admin, Doctor, etc.) see all patients in the hospital
					patients = await prisma.patient.findMany({
						where: {
							hospitalId
						},
						include: {
							appointments: {
								include: {
									diagnosisRecord: {
										include: {
											followUpAppointment: true
										}
									},
									surgery: true
								},
								orderBy: {
									scheduledAt: "desc"
								}
							}
						},
						orderBy: {
							createdAt: "desc"
						}
					});
				}

				// Mask mobile numbers for doctors
				const maskedPatients = role === "DOCTOR" ? maskPatientsDataForDoctor(patients) : patients;

				res.json(new ApiResponse("Patients fetched successfully", maskedPatients));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async getPatientById(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params as Pick<Patient, "id">;
				const { role, id: userId, hospitalId } = req.user as { role: string; id: string; hospitalId: string };
				
				const patient = await this.patientRepository.findById(id);
				if (!patient) {
					return res.status(404).json({ message: "Patient not found" });
				}

				// Sales Person access control
				if (role === "SALES_PERSON") {
					// Check if patient was created by this sales person
					if (patient.createdBy !== userId) {
						return res.status(403).json({ message: "Access denied: Patient not created by you" });
					}
					
					// Check if patient has follow-up or surgery appointments
					const hasFollowUpOrSurgery = patient.appointments?.some((apt: any) => 
						apt.visitType === "FOLLOW_UP" || 
						apt.surgery !== null ||
						apt.diagnosisRecord?.followUpAppointment !== null
					);
					
					if (!hasFollowUpOrSurgery) {
						return res.status(403).json({ message: "Access denied: Patient is not a follow-up or surgery patient" });
					}
				}

				// Check hospital access
				if (patient.hospitalId !== hospitalId) {
					return res.status(403).json({ message: "Access denied: Patient belongs to different hospital" });
				}

				// Mask mobile number for doctors
				const maskedPatient = role === "DOCTOR" ? maskPatientDataForDoctor(patient) : patient;

				res.json(new ApiResponse("Patient fetched successfully", maskedPatient));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async getPatientByName(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { name } = req.query as Pick<Patient, "name">;
				if (!name) return res.status(401).json({ message: "Name is missing" });

				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User ain't linked to any hospital", 400);

				const patient = await this.patientRepository.findByName({
					name,
					hospitalId
				});

				// Mask mobile numbers for doctors
				const { role } = req.user as { role: string };
				const maskedPatient = role === "DOCTOR" ? maskPatientsDataForDoctor(patient) : patient;

				res.json(new ApiResponse("Patient fetched successfully", maskedPatient));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async getPatientByPhone(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { phone } = req.query as Pick<Patient, "phone">;
				if (!phone)
					return res.status(400).json({ message: "Phone is required" });

				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User ain't linked to any hospital", 400);

				const patient = await this.patientRepository.findByPhone({
					phone,
					hospitalId
				});
				if (!patient)
					res
						.status(200)
						.json(new ApiResponse("No patient found with this phone number"));

				// Mask mobile numbers for doctors
				const { role } = req.user as { role: string };
				const maskedPatient = role === "DOCTOR" ? maskPatientsDataForDoctor(patient) : patient;

				res
					.status(200)
					.json(new ApiResponse("Patient fetched successfully", maskedPatient));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async getPatientByUniqueId(req: Request, res: Response) {
		try {
			const { patientUniqueId } = req.query;
			if (!patientUniqueId)
				return res.status(400).json({ message: "PatientUniqueId is required" });
			const patient = await this.patientRepository.findByUniqueId(
				patientUniqueId as string
			);
			if (!patient)
				return res.status(404).json({ message: "Patient not found" });
			res.json(patient);
		} catch (error: any) {
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Internal Server Error"));
		}
	}

	async getPatientByUHID(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { uhid } = req.query;
				if (!uhid) return res.status(400).json({ message: "UHID is required" });

				const patient = await this.patientRepository.findByUHID(uhid as string);
				if (!patient)
					return res.status(404).json({ message: "Patient not found" });

				// Mask mobile number for doctors
				const { role } = req.user as { role: string };
				const maskedPatient = role === "DOCTOR" ? maskPatientDataForDoctor(patient) : patient;

				res.json(new ApiResponse("Patient fetched successfully", maskedPatient));
			} catch (error: any) {
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async createPatient(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const {
					name,
					dob,
					gender,
					phone,
					email,
					registrationMode,
					registrationSource,
					registrationSourceDetails
				} = req.body as Pick<
					Patient,
					| "name"
					| "dob"
					| "gender"
					| "phone"
					| "email"
					| "registrationMode"
					| "registrationSource"
					| "registrationSourceDetails"
				>;
				const hospitalId = req.user.hospitalId;
				if (!hospitalId)
					throw new AppError("User ain't linked to any hospital", 400);

				// Check if user exists in HospitalStaff table
				const userExists = await prisma.hospitalStaff.findUnique({
					where: { id: req.user.id },
					select: { id: true }
				});

				const patient = await this.patientRepository.create({
					name,
					dob,
					gender,
					phone,
					email,
					registrationMode,
					registrationSource,
					registrationSourceDetails,
					hospitalId,
					createdBy: userExists ? req.user.id : null // Only set if user exists in HospitalStaff
				});

				res
					.status(201)
					.json(new ApiResponse("Patient created successfully", patient));
			} catch (error: any) {
				console.error("Error creating patient:", error);
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async updatePatientDetails(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params as Pick<Patient, "id">;
				const body = req.body as Omit<
					Patient,
					| "id"
					| "createdAt"
					| "updatedAt"
					| "hospitalId"
					| "patientUniqueId"
					| "documents"
				>;
				
				// Filter out nested relations that shouldn't be updated directly
				const { appointments, ...updateData } = body as any;
				
				const patient = await this.patientRepository.update(id, updateData);
				res
					.status(200)
					.json(new ApiResponse("Patient updated successfully", patient));
			} catch (error: any) {
				console.error(error);

				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async deletePatient(req: Request, res: Response) {
		try {
			await this.patientRepository.delete(req.params.id);
			res.status(204).send();
		} catch (error: any) {
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Internal Server Error"));
		}
	}

	// Upload patient document
	async uploadDocument(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				// For multipart/form-data, fields are in req.body
				const { patientId, type } = req.body as {
					patientId: string;
					type: string;
				};
				if (!patientId) throw new AppError("Patient ID is required", 400);
				if (!type) throw new AppError("Document type is required", 400);

				const file = req.file;
				if (!file) {
					return res.status(400).json({ error: "No file uploaded" });
				}

				const url = await s3.uploadStream(
					file.buffer,
					file.originalname,
					file.mimetype
				);

				file.buffer = Buffer.alloc(0);

				// if (!url) throw new AppError("Unable to upload file", 500);

				const doc = await prisma.patientDocument.create({
					data: {
						patientId,
						type: type as PatientDoc,
						url
					}
				});
				res
					.status(201)
					.json(new ApiResponse("Document uploaded successfully", doc));
			} catch (error: any) {
				let statusCode = 500;
				if (error instanceof AppError) {
					statusCode = error.code || 400;
				} else if (error.code?.startsWith("P")) {
					// Handle Prisma errors
					switch (error.code) {
						case "P2003": // Foreign key constraint failed
							statusCode = 400;
							break;
						default:
							statusCode = 500;
					}
				}
				res
					.status(statusCode)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async deleteDocument(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { documentId } = req.params;
				if (!documentId) throw new AppError("Document ID is required", 400);

				const document = await prisma.patientDocument.findUnique({
					where: { id: documentId }
				});
				if (!document) throw new AppError("Document not found", 404);

				await s3.deleteFile(document.url);
				await prisma.patientDocument.delete({ where: { id: documentId } });

				res.status(200).json(new ApiResponse("Document deleted successfully"));
			} catch (error: any) {
				console.error("Error deleting document:", error);
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	async addVitals(req: Request, res: Response) {
		if (req.user && req.user.role !== "NURSE") {
			try {
				const { appointmentId } = req.params;
				const { type, value, unit, notes } = req.body as Omit<
					Vital,
					"appointment"
				>;
				if (!type || !value)
					throw new AppError("Type and Value of vital are required", 401);

				const appointment = await prisma.appointment.findUnique({
					where: { id: appointmentId }
				});
				if (!appointment) throw new AppError("Invalid Appointment ID", 401);
				const vital = await prisma.vital.create({
					data: {
						type,
						value,
						unit,
						notes,
						appointmentId
					}
				});
				res
					.status(200)
					.json(new ApiResponse("Vitals added successfully", vital));
			} catch (error: any) {
				console.error("Add visit error:", error);
				res
					.status(error.code || 500)
					.json(new ApiResponse(error.message || "Internal Server Error"));
			}
		} else {
			res.status(403).json(new ApiResponse("Unauthorized access"));
		}
	}

	// List patient documents
	async listDocuments(req: Request, res: Response) {
		try {
			const { patientId } = req.params;
			const docs = await prisma.patientDocument.findMany({
				where: { patientId: patientId },
				orderBy: { uploadedAt: "desc" }
			});

			res
				.status(200)
				.json(new ApiResponse("Documents retrieved successfully", docs));
		} catch (error: any) {
			console.error("Error listing documents:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Internal Server Error"));
		}
	}

	async deleteAttachment(req: Request, res: Response) {
		try {
			const { documentId } = req.params;

			const attachment = await prisma.patientDocument.findUnique({
				where: { id: documentId },
				select: { url: true }
			});
			if (!attachment) throw new AppError("Attachment not found", 404);
			await s3.deleteFile(attachment.url);
			await prisma.appointmentAttachment.delete({ where: { id: documentId } });

			res.status(200).json(new ApiResponse("Attachment deleted successfully"));
		} catch (error: any) {
			errorHandler(error, res);
		}
	}
	// Add family link
	async addFamilyLink(req: Request, res: Response) {
		try {
			const { patientId, relativeId, relationship } = req.body as Pick<
				PatientFamilyLink,
				"relativeId" | "relationship" | "patientId"
			>;
			if (!relativeId || !relationship)
				return res
					.status(400)
					.json({ message: "relatedId and relationType are required" });
			const link = await prisma.patientFamilyLink.create({
				data: {
					patientId,
					relativeId,
					relationship
				}
			});
			res.status(201).json(link);
		} catch (error: any) {
			console.error("Error adding family link:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Internal Server Error"));
		}
	}

	// List family links
	async listFamilyLinks(req: Request, res: Response) {
		try {
			const { patientId } = req.query as { patientId: string };
			const links_from = await prisma.patientFamilyLink.findMany({
				where: { patientId },
				select: {
					relative: true,
					relationship: true
				}
			});
			const links_to = await prisma.patientFamilyLink.findMany({
				where: { relativeId: patientId },
				select: {
					patient: true,
					relationship: true
				}
			});
			res.json(
				new ApiResponse("Family links fetched successfully", [
					...links_from,
					...links_to
				])
			);
		} catch (error: any) {
			console.error("Error listing family links:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Internal Server Error"));
		}
	}

	// Get patient billing history
	async getPatientBillingHistory(req: Request, res: Response) {
		try {
			const { patientId } = req.params;
			const { status, page = 1, limit = 10 } = req.query;

			const skip = (Number(page) - 1) * Number(limit);

			const where: any = { patientId };
			if (status) {
				where.status = status;
			}

			const [bills, total] = await Promise.all([
				prisma.bill.findMany({
					where,
					include: {
						hospital: {
							select: {
								id: true,
								name: true
							}
						},
						billItems: true,
						payments: {
							select: {
								amount: true,
								status: true,
								paymentDate: true
							}
						}
					},
					orderBy: {
						billDate: "desc"
					},
					skip,
					take: Number(limit)
				}),
				prisma.bill.count({ where })
			]);

			res.status(200).json(
				new ApiResponse("Patient billing history retrieved successfully", {
					bills,
					pagination: {
						page: Number(page),
						limit: Number(limit),
						total,
						pages: Math.ceil(total / Number(limit))
					}
				})
			);
		} catch (error: any) {
			console.error("Error getting patient billing history:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(error.message || "Failed to retrieve billing history")
				);
		}
	}

	// Get patient outstanding bills
	async getPatientOutstandingBills(req: Request, res: Response) {
		try {
			const { patientId } = req.params;

			const bills = await prisma.bill.findMany({
				where: {
					patientId,
					status: {
						in: ["GENERATED", "SENT", "OVERDUE", "PARTIALLY_PAID"]
					}
				},
				include: {
					hospital: {
						select: {
							id: true,
							name: true
						}
					},
					billItems: true
				},
				orderBy: {
					dueDate: "asc"
				}
			});

			const totalOutstanding = bills.reduce(
				(sum, bill) => sum + bill.dueAmount,
				0
			);

			res.status(200).json(
				new ApiResponse("Outstanding bills retrieved successfully", {
					bills,
					totalOutstanding
				})
			);
		} catch (error: any) {
			console.error("Error getting patient outstanding bills:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(
						error.message || "Failed to retrieve outstanding bills"
					)
				);
		}
	}

	// Get patient payment history
	async getPatientPaymentHistory(req: Request, res: Response) {
		try {
			const { patientId } = req.params;
			const { page = 1, limit = 10 } = req.query;

			const skip = (Number(page) - 1) * Number(limit);

			const [payments, total] = await Promise.all([
				prisma.payment.findMany({
					where: {
						bill: { patientId }
					},
					include: {
						bill: {
							select: {
								id: true,
								billNumber: true,
								totalAmount: true
							}
						}
					},
					orderBy: {
						paymentDate: "desc"
					},
					skip,
					take: Number(limit)
				}),
				prisma.payment.count({
					where: {
						bill: { patientId }
					}
				})
			]);

			res.status(200).json(
				new ApiResponse("Payment history retrieved successfully", {
					payments,
					pagination: {
						page: Number(page),
						limit: Number(limit),
						total,
						pages: Math.ceil(total / Number(limit))
					}
				})
			);
		} catch (error: any) {
			console.error("Error getting patient payment history:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(error.message || "Failed to retrieve payment history")
				);
		}
	}

	// Get patient insurance
	async getPatientInsurance(req: Request, res: Response) {
		try {
			const { patientId } = req.params;
			const { isActive } = req.query;

			const where: any = { patientId };
			if (isActive !== undefined) {
				where.isActive = isActive === "true";
			}

			const insurance = await prisma.insurance.findMany({
				where,
				orderBy: {
					validFrom: "desc"
				}
			});

			res
				.status(200)
				.json(
					new ApiResponse("Patient insurance retrieved successfully", insurance)
				);
		} catch (error: any) {
			console.error("Error getting patient insurance:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(
						error.message || "Failed to retrieve patient insurance"
					)
				);
		}
	}
}
