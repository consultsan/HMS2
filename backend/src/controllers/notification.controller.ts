import { Request, Response } from "express";
import prisma from "../utils/dbConfig";
import ApiResponse from "../utils/ApiResponse";
import errorHandler from "../utils/errorHandler";
import AppError from "../utils/AppError";
import {
	sendLabReportNotification,
	sendDiagnosisRecordNotification,
	sendAppointmentNotification,
	sendLabTestCompletionNotification
} from "../services/whatsapp.service";
import { PDFService } from "../services/pdf.service";
import s3 from "../services/s3client";

export class NotificationController {
	// Appointmnet notification
	async sendAppointmentNotification(req: Request, res: Response) {
		try {
			const {
				phoneNumber,
				patientName,
				doctorName,
				appointmentDate,
				appointmentTime,
				hospitalName
			} = req.body;

			if (
				!phoneNumber ||
				!patientName ||
				!doctorName ||
				!appointmentDate ||
				!appointmentTime ||
				!hospitalName
			) {
				return res.status(400).json({
					success: false,
					message: "All fields are required"
				});
			}
			
			const result = await sendAppointmentNotification(phoneNumber, {
				patientName,
				doctorName,
				appointmentDate: new Date(appointmentDate),
				appointmentTime,
				hospitalName
			});

			if (result.success) {
				res.status(200).json({
					success: true,
					message: "Appointment notification sent successfully",
					data: result.data
				});
			} else {
				res.status(500).json({
					success: false,
					message: "Failed to send appointment notification",
					error: result.error
				});
			}
		} catch (error: any) {
			res.status(500).json({
				success: false,
				message: "Error sending appointment notification",
				error: error.message
			});
		}
	}

	async sendLabTestComplitionNotification(req : Request, res : Response){
	try {
		const { phoneNumber, patientName, testName, completionDate, hospitalName } =
			req.body;

		if (
			!phoneNumber ||
			!patientName ||
			!testName ||
			!completionDate ||
			!hospitalName
		) {
			return res.status(400).json({
				success: false,
				message: "All fields are required"
			});
		}

		const result = await sendLabTestCompletionNotification(phoneNumber, {
			patientName,
			testName,
			completionDate: new Date(completionDate),
			hospitalName
		});

		if (result.success) {
			res.status(200).json({
				success: true,
				message: "Lab test completion notification sent successfully",
				data: result.data
			});
		} else {
			res.status(500).json({
				success: false,
				message: "Failed to send lab test completion notification",
				error: result.error
			});
		}
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: "Error sending lab test completion notification",
			error: error.message
		});
		}
	}
	// Send lab report to patient
	async sendLabReport(req: Request, res: Response) {
		try {
			const { appointmentLabTestId } = req.params;
			const { sendWhatsApp = true } = req.body;

			// Get lab test details with patient and hospital info
			const labTest = await prisma.appointmentLabTest.findUnique({
				where: { id: appointmentLabTestId },
				include: {
					labTest: true,
					appointment: {
						include: {
							patient: true,
							hospital: true
						}
					},
					patient: true,
					results: {
						include: {
							parameter: true
						}
					}
				}
			});

			if (!labTest) {
				throw new AppError("Lab test not found", 404);
			}

			if (labTest.status !== "COMPLETED") {
				throw new AppError("Lab test is not completed yet", 400);
			}

			// Generate PDF report
			const pdfBuffer = await PDFService.generateLabReport(labTest);

			// Upload PDF to S3
			const fileName = `lab-report-${appointmentLabTestId}-${Date.now()}.pdf`;
			const s3Url = await s3.uploadStream(
				pdfBuffer,
				fileName,
				"application/pdf"
			);

			// Save attachment record
			const attachment = await prisma.appointmentLabTestAttachment.create({
				data: {
					appointmentLabTestId,
					url: s3Url
				}
			});

			// Send WhatsApp notification if requested
			if (sendWhatsApp) {
				const patientData = labTest.appointment?.patient || labTest.patient;
				const hospitalData = labTest.appointment?.hospital;

				if (patientData?.phone) {
					try {
						await sendLabReportNotification(patientData.phone, {
							patientName: patientData.name,
							testName: labTest.labTest.name,
							completionDate: new Date(),
							hospitalName: hospitalData?.name || "Hospital",
							reportUrl: s3Url
						});
					} catch (whatsappError) {
						console.error("WhatsApp notification failed:", whatsappError);
						// Continue even if WhatsApp fails
					}
				}
			}

			res.status(200).json(
				new ApiResponse("Lab report sent successfully", {
					attachment,
					reportUrl: s3Url
				})
			);
		} catch (error: any) {
			errorHandler(error, res);
		}
	}
	// Send diagnosis record to patient
	async sendDiagnosisRecord(req: Request, res: Response) {
		try {
			const { appointmentId } = req.params;
			const { sendWhatsApp = true } = req.body;

			// Get diagnosis record with all related data
			const diagnosisRecord = await prisma.diagnosisRecord.findUnique({
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

			// Generate PDF
			const pdfBuffer = await PDFService.generateDiagnosisRecord(
				diagnosisRecord,
				diagnosisRecord.appointment.labTests,
				surgicalInfo
			);

			// Upload PDF to S3
			const fileName = `diagnosis-record-${appointmentId}-${Date.now()}.pdf`;
			const s3Url = await s3.uploadStream(
				pdfBuffer,
				fileName,
				"application/pdf"
			);

			// Save attachment record
			const attachment = await prisma.appointmentAttachment.create({
				data: {
					appointmentId,
					url: s3Url,
					type: "MEDICAL_REPORT"
				}
			});

			// Send WhatsApp notification if requested
			if (sendWhatsApp) {
				const { patient, doctor, hospital } = diagnosisRecord.appointment;

				if (patient.phone) {
					try {
						await sendDiagnosisRecordNotification(patient.phone, {
							patientName: patient.name,
							doctorName: doctor.name,
							diagnosisDate: diagnosisRecord.createdAt,
							hospitalName: hospital.name,
							reportUrl: s3Url
						});
					} catch (whatsappError) {
						console.error("WhatsApp notification failed:", whatsappError);
						// Continue even if WhatsApp fails
					}
				}
			}

			res.status(200).json(
				new ApiResponse("Diagnosis record sent successfully", {
					attachment,
					reportUrl: s3Url
				})
			);
		} catch (error: any) {
			errorHandler(error, res);
		}
	}

	// Get notification history for a patient
	async getNotificationHistory(req: Request, res: Response) {
		try {
			const { patientId } = req.params;

			// Get lab test attachments (reports)
			const labReports = await prisma.appointmentLabTestAttachment.findMany({
				where: {
					appointmentLabTest: {
						OR: [{ patientId }, { appointment: { patientId } }]
					}
				},
				include: {
					appointmentLabTest: {
						include: {
							labTest: true,
							appointment: {
								include: {
									patient: true,
									hospital: true
								}
							}
						}
					}
				},
				orderBy: {
					createdAt: "desc"
				}
			});

			// Get diagnosis record attachments
			const diagnosisRecords = await prisma.appointmentAttachment.findMany({
				where: {
					appointment: { patientId },
					type: "MEDICAL_REPORT"
				},
				include: {
					appointment: {
						include: {
							patient: true,
							doctor: true,
							hospital: true
						}
					}
				},
				orderBy: {
					createdAt: "desc"
				}
			});

			res.status(200).json(
				new ApiResponse("Notification history retrieved successfully", {
					labReports,
					diagnosisRecords
				})
			);
		} catch (error: any) {
			errorHandler(error, res);
		}
	}

	// Resend notification for a specific report
	async resendNotification(req: Request, res: Response) {
		try {
			const { attachmentId, type } = req.params;
			const { phoneNumber } = req.body;

			let notificationData: any;
			let patientPhone: string;

			if (type === "LAB_REPORT") {
				const attachment = await prisma.appointmentLabTestAttachment.findUnique(
					{
						where: { id: attachmentId },
						include: {
							appointmentLabTest: {
								include: {
									labTest: true,
									appointment: {
										include: {
											patient: true,
											hospital: true
										}
									},
									patient: true
								}
							}
						}
					}
				);

				if (!attachment) {
					throw new AppError("Lab report attachment not found", 404);
				}

				const patientData =
					attachment.appointmentLabTest.appointment?.patient ||
					attachment.appointmentLabTest.patient;
				const hospitalData =
					attachment.appointmentLabTest.appointment?.hospital;

				if (!patientData) {
					throw new AppError("Patient data not found", 404);
				}

				patientPhone = phoneNumber || patientData.phone;

				await sendLabReportNotification(patientPhone, {
					patientName: patientData.name,
					testName: attachment.appointmentLabTest.labTest.name,
					completionDate: new Date(),
					hospitalName: hospitalData?.name || "Hospital",
					reportUrl: attachment.url
				});
			} else if (type === "DIAGNOSIS_RECORD") {
				const attachment = await prisma.appointmentAttachment.findUnique({
					where: { id: attachmentId },
					include: {
						appointment: {
							include: {
								patient: true,
								doctor: true,
								hospital: true
							}
						}
					}
				});

				if (!attachment) {
					throw new AppError("Diagnosis record attachment not found", 404);
				}

				patientPhone = phoneNumber || attachment.appointment.patient.phone;

				await sendDiagnosisRecordNotification(patientPhone, {
					patientName: attachment.appointment.patient.name,
					doctorName: attachment.appointment.doctor.name,
					diagnosisDate: new Date(),
					hospitalName: attachment.appointment.hospital.name,
					reportUrl: attachment.url
				});
			} else {
				throw new AppError("Invalid notification type", 400);
			}

			res.status(200).json(
				new ApiResponse("Notification resent successfully", {
					phoneNumber: patientPhone,
					type
				})
			);
		} catch (error: any) {
			errorHandler(error, res);
		}
	}


}
