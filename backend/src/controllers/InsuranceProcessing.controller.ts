import { Request, Response } from "express";
import { InsuranceVerificationStatus, InsuranceDocumentType, UserRole } from "@prisma/client";
import { InsuranceProcessingRepository } from "../repositories/InsuranceProcessing.repository";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import errorHandler from "../utils/errorHandler";
import multer from "multer";
import s3 from "../services/s3client";

const roles: string[] = [
	UserRole.SUPER_ADMIN,
	UserRole.HOSPITAL_ADMIN,
	UserRole.DOCTOR,
	UserRole.RECEPTIONIST,
	UserRole.NURSE
];

// Configure multer for file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
	fileFilter: (req, file, cb) => {
		// Allow common document types
		const allowedTypes = [
			'application/pdf',
			'image/jpeg',
			'image/png',
			'image/jpg',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		];
		
		if (allowedTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new AppError('Invalid file type. Only PDF, DOC, DOCX, JPG, PNG files are allowed.', 400));
		}
	}
});

export class InsuranceProcessingController {
	private insuranceRepository: InsuranceProcessingRepository;

	constructor() {
		this.insuranceRepository = new InsuranceProcessingRepository();
	}

	// Insurance Document Upload
	async uploadInsuranceDocument(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId, documentType } = req.body;
				const uploadedById = req.user.id;

				if (!admissionId || !documentType) {
					throw new AppError("Admission ID and document type are required", 400);
				}

				if (!Object.values(InsuranceDocumentType).includes(documentType)) {
					throw new AppError("Invalid document type", 400);
				}

				if (!req.file) {
					throw new AppError("No file uploaded", 400);
				}

				// Upload file to S3
				const fileUrl = await s3.uploadStream(req.file.buffer, req.file.originalname, req.file.mimetype);

				// Save document record to database
				const document = await this.insuranceRepository.uploadInsuranceDocument({
					admissionId,
					uploadedById,
					fileName: req.file.originalname,
					fileUrl: fileUrl,
					fileSize: req.file.size,
					mimeType: req.file.mimetype,
					documentType
				});

				res.status(201).json(
					new ApiResponse("Insurance document uploaded successfully", document)
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

	// Get Insurance Documents
	async getInsuranceDocuments(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;

				const documents = await this.insuranceRepository.getInsuranceDocuments(admissionId);

				res.status(200).json(
					new ApiResponse("Insurance documents retrieved successfully", documents)
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

	// Delete Insurance Document
	async deleteInsuranceDocument(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { documentId } = req.params;

				await this.insuranceRepository.deleteInsuranceDocument(documentId);

				res.status(200).json(
					new ApiResponse("Insurance document deleted successfully", null)
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

	// Create Insurance Verification
	async createInsuranceVerification(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const {
					admissionId,
					policyValidFrom,
					policyValidTo,
					coverageAmount,
					deductibleAmount,
					coPaymentPercentage,
					preAuthorizationRequired,
					preAuthorizationNumber,
					preAuthorizationDate,
					preAuthorizationExpiry
				} = req.body;

				if (!admissionId) {
					throw new AppError("Admission ID is required", 400);
				}

				const verification = await this.insuranceRepository.createInsuranceVerification({
					admissionId,
					policyValidFrom: policyValidFrom ? new Date(policyValidFrom) : undefined,
					policyValidTo: policyValidTo ? new Date(policyValidTo) : undefined,
					coverageAmount: coverageAmount ? parseFloat(coverageAmount) : undefined,
					deductibleAmount: deductibleAmount ? parseFloat(deductibleAmount) : undefined,
					coPaymentPercentage: coPaymentPercentage ? parseFloat(coPaymentPercentage) : undefined,
					preAuthorizationRequired: preAuthorizationRequired === 'true' || preAuthorizationRequired === true,
					preAuthorizationNumber,
					preAuthorizationDate: preAuthorizationDate ? new Date(preAuthorizationDate) : undefined,
					preAuthorizationExpiry: preAuthorizationExpiry ? new Date(preAuthorizationExpiry) : undefined
				});

				res.status(201).json(
					new ApiResponse("Insurance verification created successfully", verification)
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

	// Get Insurance Verification
	async getInsuranceVerification(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;

				const verification = await this.insuranceRepository.getInsuranceVerification(admissionId);

				if (!verification) {
					throw new AppError("Insurance verification not found", 404);
				}

				res.status(200).json(
					new ApiResponse("Insurance verification retrieved successfully", verification)
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

	// Update Insurance Verification
	async updateInsuranceVerification(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;
				const {
					verificationStatus,
					verificationDate,
					verifiedBy,
					verificationNotes,
					policyValidFrom,
					policyValidTo,
					coverageAmount,
					deductibleAmount,
					coPaymentPercentage,
					preAuthorizationRequired,
					preAuthorizationNumber,
					preAuthorizationDate,
					preAuthorizationExpiry
				} = req.body;

				if (verificationStatus && !Object.values(InsuranceVerificationStatus).includes(verificationStatus)) {
					throw new AppError("Invalid verification status", 400);
				}

				const updateData: any = {};
				
				if (verificationStatus) updateData.verificationStatus = verificationStatus;
				if (verificationDate) updateData.verificationDate = new Date(verificationDate);
				if (verifiedBy) updateData.verifiedBy = verifiedBy;
				if (verificationNotes) updateData.verificationNotes = verificationNotes;
				if (policyValidFrom) updateData.policyValidFrom = new Date(policyValidFrom);
				if (policyValidTo) updateData.policyValidTo = new Date(policyValidTo);
				if (coverageAmount) updateData.coverageAmount = parseFloat(coverageAmount);
				if (deductibleAmount) updateData.deductibleAmount = parseFloat(deductibleAmount);
				if (coPaymentPercentage) updateData.coPaymentPercentage = parseFloat(coPaymentPercentage);
				if (preAuthorizationRequired !== undefined) updateData.preAuthorizationRequired = preAuthorizationRequired === 'true' || preAuthorizationRequired === true;
				if (preAuthorizationNumber) updateData.preAuthorizationNumber = preAuthorizationNumber;
				if (preAuthorizationDate) updateData.preAuthorizationDate = new Date(preAuthorizationDate);
				if (preAuthorizationExpiry) updateData.preAuthorizationExpiry = new Date(preAuthorizationExpiry);
				
				// Set verified by staff if status is being updated
				if (verificationStatus && (verificationStatus === 'VERIFIED' || verificationStatus === 'REJECTED')) {
					updateData.verifiedByStaffId = req.user.id;
					updateData.verificationDate = new Date();
				}

				const updatedVerification = await this.insuranceRepository.updateInsuranceVerification(admissionId, updateData);

				res.status(200).json(
					new ApiResponse("Insurance verification updated successfully", updatedVerification)
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

	// Get Insurance Verifications by Status
	async getInsuranceVerificationsByStatus(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;
				const { status } = req.query;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const verifications = await this.insuranceRepository.getInsuranceVerificationsByStatus(
					hospitalId,
					status as InsuranceVerificationStatus
				);

				res.status(200).json(
					new ApiResponse("Insurance verifications retrieved successfully", verifications)
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

	// Get Insurance Processing Dashboard Stats
	async getInsuranceProcessingStats(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const stats = await this.insuranceRepository.getInsuranceProcessingStats(hospitalId);

				res.status(200).json(
					new ApiResponse("Insurance processing statistics retrieved successfully", stats)
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

	// Get Admissions with Incomplete Insurance
	async getAdmissionsWithIncompleteInsurance(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const hospitalId = req.user.hospitalId;

				if (!hospitalId) {
					throw new AppError("User isn't linked to any hospital", 403);
				}

				const admissions = await this.insuranceRepository.getAdmissionsWithIncompleteInsurance(hospitalId);

				res.status(200).json(
					new ApiResponse("Admissions with incomplete insurance retrieved successfully", admissions)
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

	// Check Policy Validity
	async checkPolicyValidity(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;

				const validity = await this.insuranceRepository.checkPolicyValidity(admissionId);

				res.status(200).json(
					new ApiResponse("Policy validity checked successfully", validity)
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

	// Get multer upload middleware
	getUploadMiddleware() {
		return upload.single('document');
	}
}
