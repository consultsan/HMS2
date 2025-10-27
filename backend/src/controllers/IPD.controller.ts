import { Request, Response } from "express";
import { IPDStatus, InsuranceType, WardType, WardSubType, UserRole, PatientDocumentCategory } from "@prisma/client";
import { IPDRepository } from "../repositories/IPD.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import errorHandler from "../utils/errorHandler";
import IPDWebSocketService from "../services/ipdWebSocket.service";
import s3 from "../services/s3client";

const roles: string[] = [
	UserRole.SUPER_ADMIN,
	UserRole.HOSPITAL_ADMIN,
	UserRole.DOCTOR,
	UserRole.RECEPTIONIST,
	UserRole.NURSE
];

export class IPDController {
	private ipdRepository: IPDRepository;

	constructor() {
		this.ipdRepository = new IPDRepository();
	}

	// Generate unique IPD number
	private generateIPDNumber(): string {
		const timestamp = Date.now().toString().slice(-6);
		const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
		return `IPD${timestamp}${random}`;
	}

	// IPD Queue Management
	async createIPDQueue(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId } = req.body;
				const hospitalId = req.user.hospitalId;
				const createdById = req.user.id;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				if (!patientId) {
					throw new AppError("Patient ID is required", 400);
				}

				const ipdNumber = this.generateIPDNumber();

				const ipdQueue = await this.ipdRepository.createIPDQueue({
					patientId,
					hospitalId,
					createdById,
					ipdNumber
				});

				res.status(201).json(
					new ApiResponse("IPD queue created successfully", ipdQueue)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDQueues(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;
				const { status } = req.query;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const queues = await this.ipdRepository.getIPDQueues(
					hospitalId,
					status as IPDStatus
				);

				res.status(200).json(
					new ApiResponse("IPD queues retrieved successfully", queues)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDQueueById(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;

				const queue = await this.ipdRepository.getIPDQueueById(id);

				if (!queue) {
					throw new AppError("IPD queue not found", 404);
				}

				res.status(200).json(
					new ApiResponse("IPD queue retrieved successfully", queue)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async updateIPDQueueStatus(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const { status } = req.body;

				if (!Object.values(IPDStatus).includes(status)) {
					throw new AppError("Invalid status", 400);
				}

				const updatedQueue = await this.ipdRepository.updateIPDQueueStatus(id, status);

				res.status(200).json(
					new ApiResponse("IPD queue status updated successfully", updatedQueue)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// IPD Admission Management
	async createIPDAdmission(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const {
					queueId,
					assignedDoctorId,
					insuranceType,
					insuranceCompany,
					policyNumber,
					tpaName,
					insuranceNumber: rawInsuranceNumber,
					wardType,
					wardSubType,
					wardId,
					bedId,
					roomNumber,
					bedNumber,
					chiefComplaint,
					admissionNotes
				} = req.body;

				// Handle null/undefined insurance number
				const insuranceNumber = rawInsuranceNumber || undefined;

				if (!queueId || !assignedDoctorId || !wardType) {
					throw new AppError("Queue ID, assigned doctor ID, and ward type are required", 400);
				}

				if (!Object.values(InsuranceType).includes(insuranceType)) {
					throw new AppError("Invalid insurance type", 400);
				}

				if (!Object.values(WardType).includes(wardType)) {
					throw new AppError("Invalid ward type", 400);
				}

				if (wardSubType && !Object.values(WardSubType).includes(wardSubType)) {
					throw new AppError("Invalid ward sub type", 400);
				}

				// Handle insurance card upload if provided
				let insuranceCardUrl: string | undefined = undefined;
				if (req.file && insuranceType !== 'NA') {
					insuranceCardUrl = await s3.uploadStream(req.file.buffer, req.file.originalname, req.file.mimetype);
				}

				const admission = await this.ipdRepository.createIPDAdmission({
					queueId,
					assignedDoctorId,
					insuranceType,
					insuranceCompany,
					policyNumber,
					tpaName,
					insuranceNumber,
					insuranceCardUrl,
					wardType,
					wardSubType,
					roomNumber,
					bedNumber,
					chiefComplaint,
					admissionNotes
				});

				// Assign bed if bedId is provided
				if (bedId) {
					await this.ipdRepository.assignBedToAdmission(bedId, admission.id);
				}

				// Update queue status to ADMITTED
				await this.ipdRepository.updateIPDQueueStatus(queueId, IPDStatus.ADMITTED);

				// Send WebSocket notification for admission
				try {
					const hospitalId = req.user.hospitalId;
					if (hospitalId) {
						await IPDWebSocketService.sendAdmissionNotification(
							hospitalId,
							admission.queue.patientId,
							admission.id,
							admission.wardType,
							admission
						);
					}
				} catch (wsError) {
					console.error("WebSocket notification error:", wsError);
					// Don't fail the request if WebSocket fails
				}

				res.status(201).json(
					new ApiResponse("IPD admission created successfully", admission)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDAdmissions(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;
				const { status } = req.query;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const admissions = await this.ipdRepository.getIPDAdmissions(
					hospitalId,
					status as IPDStatus
				);

				res.status(200).json(
					new ApiResponse("IPD admissions retrieved successfully", admissions)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDAdmissionById(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;

				const admission = await this.ipdRepository.getIPDAdmissionById(id);

				if (!admission) {
					throw new AppError("IPD admission not found", 404);
				}

				res.status(200).json(
					new ApiResponse("IPD admission retrieved successfully", admission)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async updateIPDAdmission(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const updateData = req.body;

				const updatedAdmission = await this.ipdRepository.updateIPDAdmission(id, updateData);

				res.status(200).json(
					new ApiResponse("IPD admission updated successfully", updatedAdmission)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// IPD Visit Management
	async createIPDVisit(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const {
					admissionId,
					visitNotes,
					clinicalObservations,
					treatmentGiven,
					medicationChanges,
					patientResponse,
					nextVisitPlan,
					vitals
				} = req.body;

				const doctorId = req.user.id;

				if (!admissionId || !visitNotes) {
					throw new AppError("Admission ID and visit notes are required", 400);
				}

				const visit = await this.ipdRepository.createIPDVisit({
					admissionId,
					doctorId,
					visitNotes,
					clinicalObservations,
					treatmentGiven,
					medicationChanges,
					patientResponse,
					nextVisitPlan
				});

				// Add vitals if provided
				if (vitals && vitals.length > 0) {
					await this.ipdRepository.addVisitVitals(visit.id, vitals);
				}

				// Get updated visit with vitals
				const updatedVisit = await this.ipdRepository.getIPDVisits(admissionId);

				// Send WebSocket notification for visit completion
				try {
					const hospitalId = req.user.hospitalId;
					const admission = await this.ipdRepository.getIPDAdmissionById(admissionId);
					
					if (admission && hospitalId) {
						await IPDWebSocketService.sendVisitCompletionNotification(
							hospitalId,
							doctorId,
							admission.queue.patientId,
							admissionId,
							admission.wardType,
							updatedVisit[0]
						);
					}
				} catch (wsError) {
					console.error("WebSocket notification error:", wsError);
					// Don't fail the request if WebSocket fails
				}

				res.status(201).json(
					new ApiResponse("IPD visit created successfully", updatedVisit[0])
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDVisits(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;

				const visits = await this.ipdRepository.getIPDVisits(admissionId);

				res.status(200).json(
					new ApiResponse("IPD visits retrieved successfully", visits)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// IPD Discharge Summary
	async createDischargeSummary(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const {
					admissionId,
					dischargeDate,
					finalDiagnosis,
					treatmentSummary,
					proceduresPerformed,
					medicationsPrescribed,
					followUpInstructions,
					doctorSignature,
					hospitalStamp
				} = req.body;

				if (!admissionId || !dischargeDate || !finalDiagnosis || !treatmentSummary || !medicationsPrescribed || !followUpInstructions) {
					throw new AppError("All required fields must be provided", 400);
				}

				// Get admission details
				const admission = await this.ipdRepository.getIPDAdmissionById(admissionId);
				if (!admission) {
					throw new AppError("Admission not found", 404);
				}

				const admissionDate = admission.admissionDate;
				const dischargeDateObj = new Date(dischargeDate);
				const totalStayDuration = Math.ceil((dischargeDateObj.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));

				const dischargeSummary = await this.ipdRepository.createDischargeSummary({
					admissionId,
					admissionDate,
					dischargeDate: dischargeDateObj,
					totalStayDuration,
					chiefComplaint: admission.chiefComplaint || "Not specified",
					finalDiagnosis,
					treatmentSummary,
					proceduresPerformed,
					medicationsPrescribed,
					followUpInstructions,
					doctorSignature,
					hospitalStamp
				});

				// Update admission status to DISCHARGED
				await this.ipdRepository.updateIPDAdmission(admissionId, {
					status: IPDStatus.DISCHARGED,
					dischargeDate: dischargeDateObj,
					dischargeNotes: treatmentSummary
				});

				// Update queue status to DISCHARGED
				await this.ipdRepository.updateIPDQueueStatus(admission.queueId, IPDStatus.DISCHARGED);

				// Send WebSocket notification for discharge
				try {
					const hospitalId = req.user.hospitalId;
					if (hospitalId) {
						await IPDWebSocketService.sendDischargeNotification(
							hospitalId,
							admission.queue.patientId,
							admissionId,
							admission.wardType,
							{
								...dischargeSummary,
								patient: admission.queue.patient,
								ipdNumber: admission.queue.ipdNumber,
								bedNumber: admission.bedNumber
							}
						);
					}
				} catch (wsError) {
					console.error("WebSocket notification error:", wsError);
					// Don't fail the request if WebSocket fails
				}

				res.status(201).json(
					new ApiResponse("Discharge summary created successfully", dischargeSummary)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getDischargeSummary(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;

				const dischargeSummary = await this.ipdRepository.getDischargeSummary(admissionId);

				if (!dischargeSummary) {
					throw new AppError("Discharge summary not found", 404);
				}

				res.status(200).json(
					new ApiResponse("Discharge summary retrieved successfully", dischargeSummary)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// Insurance Company Management
	async createInsuranceCompany(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { name, isPartnered, tpaName, contactInfo } = req.body;
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				if (!name) {
					throw new AppError("Insurance company name is required", 400);
				}

				const insuranceCompany = await this.ipdRepository.createInsuranceCompany({
					name,
					hospitalId,
					isPartnered: isPartnered || false,
					tpaName,
					contactInfo
				});

				res.status(201).json(
					new ApiResponse("Insurance company created successfully", insuranceCompany)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getInsuranceCompanies(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const insuranceCompanies = await this.ipdRepository.getInsuranceCompanies(hospitalId);

				res.status(200).json(
					new ApiResponse("Insurance companies retrieved successfully", insuranceCompanies)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// Ward Management
	async createWard(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { name, type, subType, totalBeds, pricePerDay, description } = req.body;
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				if (!name || !type || !totalBeds) {
					throw new AppError("Ward name, type, and total beds are required", 400);
				}

				if (!Object.values(WardType).includes(type)) {
					throw new AppError("Invalid ward type", 400);
				}

				if (subType && !Object.values(WardSubType).includes(subType)) {
					throw new AppError("Invalid ward sub type", 400);
				}

				const ward = await this.ipdRepository.createWard({
					name,
					type,
					subType,
					totalBeds: parseInt(totalBeds),
					hospitalId,
					pricePerDay: pricePerDay ? parseFloat(pricePerDay) : undefined,
					description
				});

				res.status(201).json(
					new ApiResponse("Ward created successfully", ward)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getWards(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;
				const { type } = req.query;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const wards = await this.ipdRepository.getWards(
					hospitalId,
					type as WardType
				);

				res.status(200).json(
					new ApiResponse("Wards retrieved successfully", wards)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async updateWardBedCount(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const { occupiedBeds } = req.body;

				if (occupiedBeds === undefined) {
					throw new AppError("Occupied beds count is required", 400);
				}

				const updatedWard = await this.ipdRepository.updateWardBedCount(id, parseInt(occupiedBeds));

				// Send WebSocket notification for bed availability change
				try {
					const hospitalId = req.user.hospitalId;
					if (hospitalId && updatedWard) {
						await IPDWebSocketService.sendBedAvailabilityUpdate(
							hospitalId,
							updatedWard.type,
							updatedWard.totalBeds - updatedWard.occupiedBeds,
							updatedWard.totalBeds
						);
					}
				} catch (wsError) {
					console.error("WebSocket notification error:", wsError);
					// Don't fail the request if WebSocket fails
				}

				res.status(200).json(
					new ApiResponse("Ward bed count updated successfully", updatedWard)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// Dashboard Statistics
	async getIPDDashboardStats(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const stats = await this.ipdRepository.getIPDDashboardStats(hospitalId);

				res.status(200).json(
					new ApiResponse("IPD dashboard statistics retrieved successfully", stats)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// Bed Management
	async getAvailableBeds(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { wardId } = req.params;

				if (!wardId) {
					throw new AppError("Ward ID is required", 400);
				}

				const beds = await this.ipdRepository.getAvailableBeds(wardId);

				res.status(200).json(
					new ApiResponse("Available beds retrieved successfully", beds)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async assignBed(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { bedId, admissionId } = req.body;

				if (!bedId || !admissionId) {
					throw new AppError("Bed ID and admission ID are required", 400);
				}

				const bed = await this.ipdRepository.assignBedToAdmission(bedId, admissionId);

				res.status(200).json(
					new ApiResponse("Bed assigned successfully", bed)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async releaseBed(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { bedId } = req.params;

				if (!bedId) {
					throw new AppError("Bed ID is required", 400);
				}

				const bed = await this.ipdRepository.releaseBed(bedId);

				res.status(200).json(
					new ApiResponse("Bed released successfully", bed)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// IPD Patient Document Management
	async uploadIPDPatientDocument(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId, category, description } = req.body;
				const uploadedById = req.user.id;

				if (!admissionId || !category) {
					throw new AppError("Admission ID and category are required", 400);
				}

				if (!Object.values(PatientDocumentCategory).includes(category)) {
					throw new AppError("Invalid document category", 400);
				}

				if (!req.file) {
					throw new AppError("No file uploaded", 400);
				}

				// Upload file to S3
				const fileUrl = await s3.uploadStream(req.file.buffer, req.file.originalname, req.file.mimetype);

				// Save document record to database
				const document = await this.ipdRepository.uploadIPDPatientDocument({
					admissionId,
					uploadedById,
					fileName: req.file.originalname,
					fileUrl: fileUrl,
					fileSize: req.file.size,
					mimeType: req.file.mimetype,
					category,
					description
				});

				res.status(201).json(
					new ApiResponse("IPD patient document uploaded successfully", document)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDPatientDocuments(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;

				if (!admissionId) {
					throw new AppError("Admission ID is required", 400);
				}

				const documents = await this.ipdRepository.getIPDPatientDocuments(admissionId);

				res.status(200).json(
					new ApiResponse("IPD patient documents retrieved successfully", documents)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async deleteIPDPatientDocument(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;

				if (!id) {
					throw new AppError("Document ID is required", 400);
				}

				await this.ipdRepository.deleteIPDPatientDocument(id);

				res.status(200).json(
					new ApiResponse("IPD patient document deleted successfully", null)
				);
			} catch (error) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// IPD Lab Test Management
	async createIPDLabTest(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const {
					admissionId,
					testName,
					testCode,
					category,
					priority,
					instructions,
					fastingRequired,
					fastingHours,
					specialInstructions,
					testCost,
					labTestId
				} = req.body;

				if (!admissionId || !testName || !priority) {
					throw new AppError("Admission ID, test name, and priority are required", 400);
				}

				const labTest = await this.ipdRepository.createIPDLabTest({
					admissionId,
					orderedById: req.user.id,
					testName,
					testCode,
					category,
					priority,
					instructions,
					fastingRequired,
					fastingHours,
					specialInstructions,
					testCost,
					labTestId
				});

				res.status(201).json(
					new ApiResponse("Lab test ordered successfully", labTest)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDLabTests(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;
				const { status } = req.query;

				if (!admissionId) {
					throw new AppError("Admission ID is required", 400);
				}

				const labTests = await this.ipdRepository.getIPDLabTests(admissionId, status as string);

				res.status(200).json(
					new ApiResponse("Lab tests retrieved successfully", labTests)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async updateIPDLabTest(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const updateData = req.body;

				if (!id) {
					throw new AppError("Lab test ID is required", 400);
				}

				const labTest = await this.ipdRepository.updateIPDLabTest(id, updateData);

				res.status(200).json(
					new ApiResponse("Lab test updated successfully", labTest)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async uploadIPDLabTestAttachment(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { labTestId } = req.body;
				const { attachmentType, description } = req.body;

				if (!req.file || !labTestId || !attachmentType) {
					throw new AppError("File, lab test ID, and attachment type are required", 400);
				}

				// Upload file to S3
				const fileUrl = await s3.uploadStream(req.file.buffer, req.file.originalname, req.file.mimetype);

				const attachment = await this.ipdRepository.uploadIPDLabTestAttachment({
					labTestId,
					uploadedById: req.user.id,
					fileName: req.file.originalname,
					fileUrl,
					fileSize: req.file.size,
					mimeType: req.file.mimetype,
					attachmentType,
					description
				});

				res.status(201).json(
					new ApiResponse("Lab test attachment uploaded successfully", attachment)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// IPD Surgery Management
	async createIPDSurgery(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const {
					admissionId,
					surgeryName,
					surgeryCode,
					category,
					priority,
					scheduledAt,
					estimatedDuration,
					procedureDescription,
					preoperativeDiagnosis,
					postoperativeDiagnosis,
					anesthesiaType,
					anesthesiaNotes,
					surgicalNotes,
					complications,
					bloodLoss,
					bloodTransfusion,
					bloodUnits,
					primarySurgeon,
					assistantSurgeon,
					anesthesiologist,
					scrubNurse,
					circulatingNurse,
					surgeryCost,
					anesthesiaCost,
					totalCost,
					primarySurgeonId
				} = req.body;

				if (!admissionId || !surgeryName || !priority) {
					throw new AppError("Admission ID, surgery name, and priority are required", 400);
				}

				const surgery = await this.ipdRepository.createIPDSurgery({
					admissionId,
					orderedById: req.user.id,
					surgeryName,
					surgeryCode,
					category,
					priority,
					scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
					estimatedDuration,
					procedureDescription,
					preoperativeDiagnosis,
					postoperativeDiagnosis,
					anesthesiaType,
					anesthesiaNotes,
					surgicalNotes,
					complications,
					bloodLoss,
					bloodTransfusion,
					bloodUnits,
					primarySurgeon,
					assistantSurgeon,
					anesthesiologist,
					scrubNurse,
					circulatingNurse,
					surgeryCost,
					anesthesiaCost,
					totalCost,
					primarySurgeonId
				});

				res.status(201).json(
					new ApiResponse("Surgery scheduled successfully", surgery)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDSurgeries(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;
				const { status } = req.query;

				if (!admissionId) {
					throw new AppError("Admission ID is required", 400);
				}

				const surgeries = await this.ipdRepository.getIPDSurgeries(admissionId, status as string);

				res.status(200).json(
					new ApiResponse("Surgeries retrieved successfully", surgeries)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async updateIPDSurgery(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const updateData = req.body;

				if (!id) {
					throw new AppError("Surgery ID is required", 400);
				}

				// Convert date strings to Date objects
				if (updateData.scheduledAt) {
					updateData.scheduledAt = new Date(updateData.scheduledAt);
				}
				if (updateData.actualStartTime) {
					updateData.actualStartTime = new Date(updateData.actualStartTime);
				}
				if (updateData.actualEndTime) {
					updateData.actualEndTime = new Date(updateData.actualEndTime);
				}

				const surgery = await this.ipdRepository.updateIPDSurgery(id, updateData);

				res.status(200).json(
					new ApiResponse("Surgery updated successfully", surgery)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async uploadIPDSurgeryAttachment(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { surgeryId } = req.body;
				const { attachmentType, description } = req.body;

				if (!req.file || !surgeryId || !attachmentType) {
					throw new AppError("File, surgery ID, and attachment type are required", 400);
				}

				// Upload file to S3
				const fileUrl = await s3.uploadStream(req.file.buffer, req.file.originalname, req.file.mimetype);

				const attachment = await this.ipdRepository.uploadIPDSurgeryAttachment({
					surgeryId,
					uploadedById: req.user.id,
					fileName: req.file.originalname,
					fileUrl,
					fileSize: req.file.size,
					mimeType: req.file.mimetype,
					attachmentType,
					description
				});

				res.status(201).json(
					new ApiResponse("Surgery attachment uploaded successfully", attachment)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	// IPD Transfer Management
	async createIPDTransfer(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const {
					admissionId,
					transferType,
					transferReason,
					transferNotes,
					fromWardType,
					fromWardSubType,
					fromRoomNumber,
					fromBedNumber,
					fromDoctorId,
					toWardType,
					toWardSubType,
					toRoomNumber,
					toBedNumber,
					toDoctorId
				} = req.body;

				if (!admissionId || !transferType || !transferReason || !toWardType) {
					throw new AppError("Admission ID, transfer type, transfer reason, and destination ward type are required", 400);
				}

				const transfer = await this.ipdRepository.createIPDTransfer({
					admissionId,
					transferType,
					transferReason,
					transferNotes,
					fromWardType,
					fromWardSubType,
					fromRoomNumber,
					fromBedNumber,
					fromDoctorId,
					toWardType,
					toWardSubType,
					toRoomNumber,
					toBedNumber,
					toDoctorId,
					requestedByStaffId: req.user.id
				});

				res.status(201).json(
					new ApiResponse("Transfer request created successfully", transfer)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async getIPDTransfers(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;
				const { status } = req.query;

				if (!admissionId) {
					throw new AppError("Admission ID is required", 400);
				}

				const transfers = await this.ipdRepository.getIPDTransfers(admissionId, status as string);

				res.status(200).json(
					new ApiResponse("Transfers retrieved successfully", transfers)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}

	async updateIPDTransfer(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { id } = req.params;
				const updateData = req.body;

				if (!id) {
					throw new AppError("Transfer ID is required", 400);
				}

				// Convert date strings to Date objects
				if (updateData.approvedAt) {
					updateData.approvedAt = new Date(updateData.approvedAt);
				}
				if (updateData.completedAt) {
					updateData.completedAt = new Date(updateData.completedAt);
				}

				const transfer = await this.ipdRepository.updateIPDTransfer(id, updateData);

				res.status(200).json(
					new ApiResponse("Transfer updated successfully", transfer)
				);
			} catch (error: any) {
				errorHandler(error, res);
			}
		} else {
			res.status(403).json(
				new ApiResponse("Access denied", null)
			);
		}
	}
}
