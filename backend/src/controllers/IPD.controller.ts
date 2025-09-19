import { Request, Response } from "express";
import { IPDStatus, InsuranceType, WardType, UserRole } from "@prisma/client";
import { IPDRepository } from "../repositories/IPD.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import errorHandler from "../utils/errorHandler";
import IPDWebSocketService from "../services/ipdWebSocket.service";

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
					wardType,
					roomNumber,
					bedNumber,
					chiefComplaint,
					admissionNotes
				} = req.body;

				if (!queueId || !assignedDoctorId || !wardType) {
					throw new AppError("Queue ID, assigned doctor ID, and ward type are required", 400);
				}

				if (!Object.values(InsuranceType).includes(insuranceType)) {
					throw new AppError("Invalid insurance type", 400);
				}

				if (!Object.values(WardType).includes(wardType)) {
					throw new AppError("Invalid ward type", 400);
				}

				const admission = await this.ipdRepository.createIPDAdmission({
					queueId,
					assignedDoctorId,
					insuranceType,
					insuranceCompany,
					policyNumber,
					tpaName,
					wardType,
					roomNumber,
					bedNumber,
					chiefComplaint,
					admissionNotes
				});

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
				const { name, type, totalBeds } = req.body;
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

				const ward = await this.ipdRepository.createWard({
					name,
					type,
					totalBeds: parseInt(totalBeds),
					hospitalId
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
}
