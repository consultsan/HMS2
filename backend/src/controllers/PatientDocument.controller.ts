import { Request, Response } from "express";
import { PatientDocumentCategory, DocumentStatus, UserRole } from "@prisma/client";
import { PatientDocumentRepository } from "../repositories/PatientDocument.repository";
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
		fileSize: 50 * 1024 * 1024, // 50MB limit for medical documents
	},
	fileFilter: (req, file, cb) => {
		// Allow common document types for medical files
		const allowedTypes = [
			'application/pdf',
			'image/jpeg',
			'image/png',
			'image/jpg',
			'image/tiff',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'text/plain'
		];
		
		if (allowedTypes.includes(file.mimetype)) {
			cb(null, true);
		} else {
			cb(new AppError('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TIFF, TXT files are allowed.', 400));
		}
	}
});

export class PatientDocumentController {
	private patientDocumentRepository: PatientDocumentRepository;

	constructor() {
		this.patientDocumentRepository = new PatientDocumentRepository();
	}

	// Document Folder Management
	async createDocumentFolder(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId, folderName, description } = req.body;
				const createdById = req.user.id;

				if (!patientId || !folderName) {
					throw new AppError("Patient ID and folder name are required", 400);
				}

				const folder = await this.patientDocumentRepository.createDocumentFolder({
					patientId,
					createdById,
					folderName,
					description
				});

				res.status(201).json(
					new ApiResponse("Document folder created successfully", folder)
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

	async getDocumentFolders(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId } = req.params;

				const folders = await this.patientDocumentRepository.getDocumentFolders(patientId);

				res.status(200).json(
					new ApiResponse("Document folders retrieved successfully", folders)
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

	async getDocumentFolderById(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { folderId } = req.params;

				const folder = await this.patientDocumentRepository.getDocumentFolderById(folderId);

				if (!folder) {
					throw new AppError("Document folder not found", 404);
				}

				res.status(200).json(
					new ApiResponse("Document folder retrieved successfully", folder)
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

	async updateDocumentFolder(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { folderId } = req.params;
				const { folderName, description, isActive } = req.body;

				const updatedFolder = await this.patientDocumentRepository.updateDocumentFolder(folderId, {
					folderName,
					description,
					isActive
				});

				res.status(200).json(
					new ApiResponse("Document folder updated successfully", updatedFolder)
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

	// Document Upload and Management
	async uploadPatientDocument(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { 
					patientId, 
					category, 
					description, 
					tags, 
					folderId, 
					admissionId 
				} = req.body;
				const uploadedById = req.user.id;

				if (!patientId || !category) {
					throw new AppError("Patient ID and document category are required", 400);
				}

				if (!Object.values(PatientDocumentCategory).includes(category)) {
					throw new AppError("Invalid document category", 400);
				}

				if (!req.file) {
					throw new AppError("No file uploaded", 400);
				}

				// Upload file to S3
				const fileExtension = req.file.originalname.split('.').pop();
				const fileName = `patient-docs/${patientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
				
				const fileUrl = await s3.uploadStream(req.file.buffer, fileName, req.file.mimetype);

				// Parse tags if provided as string
				let parsedTags: string[] = [];
				if (tags) {
					if (typeof tags === 'string') {
						parsedTags = tags.split(',').map(tag => tag.trim());
					} else if (Array.isArray(tags)) {
						parsedTags = tags;
					}
				}

				// Save document record to database
				const document = await this.patientDocumentRepository.uploadPatientDocument({
					patientId,
					uploadedById,
					fileName: req.file.originalname,
					fileUrl: fileUrl,
					fileSize: req.file.size,
					mimeType: req.file.mimetype,
					category,
					description,
					tags: parsedTags,
					folderId: folderId || undefined,
					admissionId: admissionId || undefined
				});

				res.status(201).json(
					new ApiResponse("Patient document uploaded successfully", document)
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

	async getPatientDocuments(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId } = req.params;
				const { category, status, folderId, admissionId } = req.query;

				const filters: any = {};
				if (category) filters.category = category;
				if (status) filters.status = status;
				if (folderId) filters.folderId = folderId;
				if (admissionId) filters.admissionId = admissionId;

				const documents = await this.patientDocumentRepository.getPatientDocuments(patientId, filters);

				res.status(200).json(
					new ApiResponse("Patient documents retrieved successfully", documents)
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

	async getDocumentById(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { documentId } = req.params;

				const document = await this.patientDocumentRepository.getDocumentById(documentId);

				if (!document) {
					throw new AppError("Document not found", 404);
				}

				// Log document access
				await this.patientDocumentRepository.logDocumentAccess({
					documentId,
					accessedById: req.user.id,
					action: 'VIEW',
					ipAddress: req.ip,
					userAgent: req.get('User-Agent')
				});

				res.status(200).json(
					new ApiResponse("Document retrieved successfully", document)
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

	async updateDocumentStatus(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { documentId } = req.params;
				const { status, notes } = req.body;

				if (!Object.values(DocumentStatus).includes(status)) {
					throw new AppError("Invalid document status", 400);
				}

				const updatedDocument = await this.patientDocumentRepository.updateDocumentStatus(
					documentId, 
					status, 
					notes
				);

				res.status(200).json(
					new ApiResponse("Document status updated successfully", updatedDocument)
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

	async createDocumentVersion(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { originalDocumentId } = req.params;
				const { 
					patientId, 
					category, 
					description, 
					tags, 
					folderId, 
					admissionId 
				} = req.body;
				const uploadedById = req.user.id;

				if (!patientId || !category) {
					throw new AppError("Patient ID and document category are required", 400);
				}

				if (!Object.values(PatientDocumentCategory).includes(category)) {
					throw new AppError("Invalid document category", 400);
				}

				if (!req.file) {
					throw new AppError("No file uploaded", 400);
				}

				// Upload file to S3
				const fileExtension = req.file.originalname.split('.').pop();
				const fileName = `patient-docs/${patientId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
				
				const fileUrl = await s3.uploadStream(req.file.buffer, fileName, req.file.mimetype);

				// Parse tags if provided as string
				let parsedTags: string[] = [];
				if (tags) {
					if (typeof tags === 'string') {
						parsedTags = tags.split(',').map(tag => tag.trim());
					} else if (Array.isArray(tags)) {
						parsedTags = tags;
					}
				}

				// Create new version
				const newDocument = await this.patientDocumentRepository.createDocumentVersion({
					originalDocumentId,
					patientId,
					uploadedById,
					fileName: req.file.originalname,
					fileUrl: fileUrl,
					fileSize: req.file.size,
					mimeType: req.file.mimetype,
					category,
					description,
					tags: parsedTags,
					folderId: folderId || undefined,
					admissionId: admissionId || undefined
				});

				res.status(201).json(
					new ApiResponse("Document version created successfully", newDocument)
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

	async deleteDocument(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { documentId } = req.params;

				await this.patientDocumentRepository.deleteDocument(documentId);

				res.status(200).json(
					new ApiResponse("Document deleted successfully", null)
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

	// Document Access Logging
	async getDocumentAccessLogs(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { documentId } = req.params;

				const accessLogs = await this.patientDocumentRepository.getDocumentAccessLogs(documentId);

				res.status(200).json(
					new ApiResponse("Document access logs retrieved successfully", accessLogs)
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

	// Dashboard and Analytics
	async getPatientDocumentStats(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId } = req.params;

				const stats = await this.patientDocumentRepository.getPatientDocumentStats(patientId);

				res.status(200).json(
					new ApiResponse("Patient document statistics retrieved successfully", stats)
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

	async searchDocuments(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { patientId } = req.params;
				const { q: searchTerm } = req.query;

				if (!searchTerm) {
					throw new AppError("Search term is required", 400);
				}

				const documents = await this.patientDocumentRepository.searchDocuments(
					patientId, 
					searchTerm as string
				);

				res.status(200).json(
					new ApiResponse("Document search completed successfully", documents)
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

	// Get documents by admission
	async getDocumentsByAdmission(req: Request, res: Response) {
		if (req.user && roles.includes(req.user.role)) {
			try {
				const { admissionId } = req.params;

				const documents = await this.patientDocumentRepository.getDocumentsByAdmission(admissionId);

				res.status(200).json(
					new ApiResponse("Admission documents retrieved successfully", documents)
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
