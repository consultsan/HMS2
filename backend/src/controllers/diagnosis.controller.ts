import { Request, Response } from "express";
import prisma from "../utils/dbConfig";
import {
	DiagnosisRecord,
	DiseaseTemplate,
	LabTestStatus,
	Prisma,
	Surgery,
	SurgicalStatus
} from "@prisma/client";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import s3client from "../services/s3client";
import { PDFService } from "../services/pdf.service";
import { readFileSync } from "fs";
import { format } from 'date-fns';
import Handlebars from "handlebars";
import { sendAppointmentNotification, sendDiagnosisRecordNotification } from "../services/whatsapp.service";
import { join } from "path";

const calculateAge = (dob: Date): number => {
	const today = new Date();
	const birthDate = new Date(dob);
	let age = today.getFullYear() - birthDate.getFullYear();
	const m = today.getMonth() - birthDate.getMonth();
	if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}
	return age;
};

interface SurgeryStatus {
	status: SurgicalStatus;
}

export const getHtmlTemplate = async (req: Request, res: Response) => {
	try {
		const { appointmentId } = req.params;
		// Get diagnosis record with all related data
		const diagnosisRecord = await prisma.diagnosisRecord.findFirst({
			where: { appointmentId },
			include: {
				appointment: {
					include: {
						patient: true,
						doctor: true,
						hospital: true,
						labTests: {
							include: {
								labTest: true
							}
						}
					}
				},
				followUpAppointment: {
					include: {
						doctor: true
					}
				}
			}
		});

		if (!diagnosisRecord) {
			throw new AppError("Diagnosis record not found", 404);
		}

		// Get surgical information
		const surgicalInfo = await prisma.surgery.findFirst({
			where: { appointmentId }
		});

		// Read the template file
		const templatePath = join(__dirname, "../templates/diagnosis-template.html");
		let templateContent = readFileSync(templatePath, "utf-8");

		// Add print-specific styles to hide header and footer
		const printStyles = `
		<style>
			@page {
				margin-top: 5.08cm;
				margin-bottom: 2.54cm;
				margin-left:1cm;
				margin-right:2cm;
			}
			.header,
			.footer {
				display: none !important;
			}
		</style>`;

		// Insert print styles before </head>
		templateContent = templateContent.replace('</head>', `${printStyles}</head>`);

		// Register helper functions
		Handlebars.registerHelper('formatDate', function (date: Date) {
			return new Date(date).toLocaleDateString('en-IN');
		});

		Handlebars.registerHelper('formatDateTime', function (date: Date) {
			return new Date(date).toLocaleString('en-IN');
		});
		Handlebars.registerHelper('formatDateTimeUTC', (date: Date | string) => {
			if (!date) return 'N/A';

			const d = new Date(date); // input is assumed to be in ISO UTC like '2025-08-04T09:15:00.000Z'

			const yyyy = d.getUTCFullYear();
			const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
			const dd = String(d.getUTCDate()).padStart(2, '0');
			const hours = String(d.getUTCHours()).padStart(2, '0');
			const minutes = String(d.getUTCMinutes()).padStart(2, '0');

			return `${dd} ${format(d, 'MMM')} ${yyyy}, ${hours}:${minutes}`;
		});

		Handlebars.registerHelper('inc', function (value: number) {
			return value + 1;
		});

		Handlebars.registerHelper('eq', function (a: any, b: any) {
			return a === b;
		});

		Handlebars.registerHelper('ne', function (a: any, b: any) {
			return a !== b;
		});

		Handlebars.registerHelper('lowercase', function (str: string) {
			return str.toLowerCase();
		});

		// Compile template
		const template = Handlebars.compile(templateContent);

		// Prepare data for template
		const data = {
			hospital: diagnosisRecord.appointment.hospital,
			isPrinting: true, // Flag to indicate print view
			patient: {
				...diagnosisRecord.appointment.patient,
				age: calculateAge(diagnosisRecord.appointment.patient.dob)
			},
			medicines: diagnosisRecord.medicines,
			diagnosis: diagnosisRecord.diagnosis,
			notes: diagnosisRecord.notes,
			labTests: diagnosisRecord.appointment.labTests,
			followUpAppointment: diagnosisRecord.followUpAppointment,
			surgicalInfo,
			doctor: diagnosisRecord.appointment.doctor,
			createdAt: diagnosisRecord.createdAt,
			logoUrl: "/True-Hospital-Logo(White).png"
		};

		// Generate HTML
		const html = template(data);

		// Send HTML response
		res.setHeader('Content-Type', 'text/html');
		res.send(html);

	} catch (error: any) {
		console.error("Error generating HTML:", error);
		res.status(error.statusCode || 500).json(
			new ApiResponse(error.message || "Error generating HTML")
		);
	}
};

export const createDiagnosisRecord = async (req: Request, res: Response) => {
	if (req.user && req.user.role == "DOCTOR") {
		try {
			const { appointmentId } = req.query as { appointmentId: string };
			const { diagnosis, medicines, notes, labTests, followUpAppointmentId } = req.body as Pick<
				DiagnosisRecord,
				"diagnosis" | "medicines" | "notes" | "followUpAppointmentId"
			> & { labTests: { id: string }[] };

			if (!diagnosis) throw new AppError("Diagnosis is required", 401);

			const appointment = await prisma.appointment.findUnique({
				where: { id: appointmentId }
			});
			if (!appointment) throw new AppError("Invalid Appointment ID", 401);

			// Use transaction to ensure data consistency
			const result = await prisma.$transaction(async (prisma) => {
				// Create diagnosis record
				const record = await prisma.diagnosisRecord.create({
					data: {
						diagnosis,
						medicines: medicines as Prisma.InputJsonValue,
						notes,
						appointmentId,
						followUpAppointmentId
					}
				});

				// Create lab test orders if any
				if (labTests && labTests.length > 0) {
					// Create individual lab test orders
					const createdLabTests = await Promise.all(
						labTests.map((test) =>
							prisma.appointmentLabTest.create({
								data: {
									appointmentId,
									labTestId: test.id,
									status: LabTestStatus.PENDING,
									patientId: appointment.patientId // Ensure patientId is set
								},
							})
						)
					);

					// Create a lab order to group these tests
					const labOrder = await prisma.labOrder.create({
						data: {
							patientId: appointment.patientId,
							appointmentId,
							orderedBy: "Doctor",
							notes: `Lab tests ordered during diagnosis: ${diagnosis}`,
							urgentOrder: false
						}
					});

					// Link the created lab tests to the lab order
					await prisma.appointmentLabTest.updateMany({
						where: {
							id: {
								in: createdLabTests.map(test => test.id)
							}
						},
						data: {
							labOrderId: labOrder.id
						}
					});
				}

				return record;
			});
			res
				.status(200)
				.json(new ApiResponse("Diagnosis record created successfully", result));
		} catch (error: any) {
			console.error("create visit error:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Internal Server Error"));
		}
	} else {
		res.status(403).json(new ApiResponse("Unauthorized access", null));
	}
};

export const getDiagnosisRecord = async (req: Request, res: Response) => {
	if (req.user && req.user.role == "DOCTOR") {
		try {
			const { appointmentId } = req.params as { appointmentId: string };
			const record = await prisma.diagnosisRecord.findUnique({
				where: { appointmentId },
				include: {
					appointment: {
						include: {
							patient: true,
							surgery: true,
						}
					},
					followUpAppointment: {
						include: {
							patient: true,
							surgery: true,
						}
					}
				}
			});
			res.status(200).json(new ApiResponse("Diagnosis record fetched successfully", record));
		} catch (error: any) {
			console.error("Get diagnosis record error:", error);
		}
	}
	else {
		res.status(403).json(new ApiResponse("Unauthorized access", null));
	}
}
export const getDiagnosisByDate = async (req: Request, res: Response) => {
	if (req.user && req.user.role == "DOCTOR") {
		try {
			const { date } = req.query;
			const diagnosis = await prisma.diagnosisRecord.findMany({
				where: {
					appointment: {
						scheduledAt: { gte: new Date(date as string) }
					}
				},
				include: {
					appointment: {
						include: {
							patient: true,
							surgery: true,
						}
					}
				}
			});
			res.status(200).json(new ApiResponse("Diagnosis records fetched successfully", diagnosis));
		} catch (error: any) {
			console.error("Get diagnosis by date error:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Internal Server Error"));
		}
	}
}

export const addDiseaseTemplate = async (req: Request, res: Response) => {
	if (req.user && req.user.role == "DOCTOR") {
		try {
			const doctorId = req.user.id;
			const { medicines, labTests, name, clinicalNotes } = req.body as {
				medicines: Pick<DiseaseTemplate, "medicines">[];
				labTests: { id: string }[];
				name: string;
				clinicalNotes: Pick<DiseaseTemplate, "clinicalNotes">[];
			};

			if (
				(!Array.isArray(medicines) && !Array.isArray(labTests)) ||
				((!Array.isArray(medicines) || medicines.length === 0) && (!Array.isArray(labTests) || labTests.length === 0)) ||
				!name
			)
				throw new AppError("Partial or Missing Input Info", 400);

			const template = await prisma.diseaseTemplate.create({
				data: {
					medicines: medicines as Prisma.InputJsonValue,
					clinicalNotes: clinicalNotes as Prisma.InputJsonValue,
					labTests: {
						connect: labTests
					},
					doctorId,
					name
				}
			});

			res
				.status(201)
				.json(
					new ApiResponse("Disease template created successfully", template)
				);
		} catch (error: any) {
			console.error("Add disease template error:", error);
			res
				.status(error.statusCode || 500)
				.json(new ApiResponse(error.message || "Internal Server Error", null));
		}
	} else {
		res.status(403).json(new ApiResponse("Unauthorized access", null));
	}
};

export const getDiseaseTemplates = async (req: Request, res: Response) => {
	if (req.user && req.user.role == "DOCTOR") {
		try {
			const templates = await prisma.diseaseTemplate.findMany({
				include: {
					labTests: true
				}
			});

			res
				.status(200)
				.json(new ApiResponse("Templates fetched successfully", templates));
		} catch (error: any) {
			console.error("Get disease templates error:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Internal Server Error"));
		}
	} else {
		res.status(403).json(new ApiResponse("Unauthorized access", null));
	}
};

export const updateDiseaseTemplate = async (req: Request, res: Response) => {
	if (req.user && req.user.role == "DOCTOR") {
		try {
			const { id } = req.params as Pick<DiseaseTemplate, "id">;
			const { name, medicines, labTests } = req.body as {
				name: string;
				medicines: Pick<DiseaseTemplate, "medicines">[];
				labTests: { id: string }[];
			};

			// Use transaction to handle the update properly
			const updatedTemplate = await prisma.$transaction(async (tx) => {
				// Get current lab tests
				const currentTemplate = await tx.diseaseTemplate.findUnique({
					where: { id },
					include: { labTests: true }
				});

				if (!currentTemplate) {
					throw new AppError("Template not found", 404);
				}

				// Disconnect existing lab tests
				const currentLabTestIds = currentTemplate.labTests.map(test => ({ id: test.id }));
				if (currentLabTestIds.length > 0) {
					await tx.diseaseTemplate.update({
						where: { id },
						data: {
							labTests: {
								disconnect: currentLabTestIds
							}
						}
					});
				}

				// Connect new lab tests
				return await tx.diseaseTemplate.update({
					where: { id },
					data: {
						name,
						medicines: medicines as Prisma.InputJsonValue,
						labTests: {
							connect: labTests
						}
					},
					include: {
						labTests: true
					}
				});
			});

			res.status(200).json(new ApiResponse("Template updated successfully", updatedTemplate));
		} catch (error: any) {
			console.error("Update disease template error:", error);
			
			// Handle specific PostgreSQL replica identity error
			if (error.message && error.message.includes("REPLICA IDENTITY")) {
				res.status(500).json(new ApiResponse(
					"Database configuration error. Please contact administrator to fix replica identity settings.", 
					null
				));
				return;
			}
			
			res
				.status(error.statusCode || 500)
				.json(new ApiResponse(error.message || "Internal Server Error", null));
		}
	} else {
		res.status(403).json(new ApiResponse("Unauthorized access", null));
	}
};

export const createSurgerySchedule = async (req: Request, res: Response) => {
	try {
		const { appointmentId } = req.params;
		const { scheduledAt, category } = req.body as Pick<
			Surgery,
			"scheduledAt" | "category"
		>;

		if (!scheduledAt || !category) {
			throw new AppError("Surgery category and date are required", 400);
		}

		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId }
		});
		if (!appointment) throw new AppError("Invalid Appointment ID", 401);

		const record = await prisma.surgery.create({
			data: {
				appointmentId,
				scheduledAt,
				category
			}
		});

		res
			.status(200)
			.json(new ApiResponse("Surgery details added successfully", record));
	} catch (error: any) {
		console.error("Add surgery error:", error);
		res
			.status(error.code || 500)
			.json(new ApiResponse(error.message || "Internal Server Error"));
	}
};

export const downloadDiagnosisPDF = async (req: Request, res: Response) => {
	try {
		const { appointmentId } = req.params;

		const diagnosisRecord = await prisma.diagnosisRecord.findUnique({
			where: { appointmentId },
			include: {
				appointment: {
					include: {
						patient: {
							select: {
								name: true,
								uhid: true,
								dob: true,
								gender: true,
								bloodGroup: true,
								address: true,
								phone: true,
								patientUniqueId: true,
								allergy: true,
								chronicDisease: true,
								preExistingCondition: true,
								registrationMode: true,
								registrationSource: true,
								status: true
							}
						},
						doctor: true,
						vitals: true,
						attachments: true,
						hospital: {
							select: {
								name: true,
								address: true,
								contactNumber: true
							}
						}
					}
				},
				followUpAppointment: {
					include: {
						patient: true,
						surgery: true,
					}
				}
			}
		});



		if (!diagnosisRecord) {
			throw new AppError("Diagnosis record not found", 404);
		}

		// Get lab tests for this appointment
		const labTests = await prisma.appointmentLabTest.findMany({
			where: { appointmentId },
			include: {
				labTest: {
					select: {
						name: true
					}
				}
			}
		});

		// Get surgical info for this appointment
		const surgicalInfo = await prisma.surgery.findUnique({
			where: { appointmentId }
		});

		const pdfBuffer = await PDFService.generateDiagnosisRecord(
			diagnosisRecord,
			labTests,
			surgicalInfo
		);

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=diagnosis-record-${appointmentId}.pdf`
		);
		res.send(pdfBuffer);
	} catch (error: any) {
		console.error("Generate diagnosis PDF error:", error);
		res.status(error.statusCode || 500)
			.json(new ApiResponse(error.message || "Failed to generate PDF", null));
	}
};
