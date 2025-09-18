import { PrismaClient, PatientDocumentCategory, DocumentStatus } from "@prisma/client";
import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";

export class PatientDocumentRepository {
	// Patient Document Folder Operations
	async createDocumentFolder(data: {
		patientId: string;
		createdById: string;
		folderName: string;
		description?: string;
	}) {
		try {
			return await prisma.patientDocumentFolder.create({
				data,
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							phone: true,
							uhid: true
						}
					},
					createdBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					},
					documents: {
						orderBy: {
							uploadedAt: 'desc'
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getDocumentFolders(patientId: string) {
		try {
			return await prisma.patientDocumentFolder.findMany({
				where: { 
					patientId,
					isActive: true
				},
				include: {
					createdBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					},
					documents: {
						orderBy: {
							uploadedAt: 'desc'
						},
						take: 5 // Show only recent 5 documents
					},
					_count: {
						select: {
							documents: true
						}
					}
				},
				orderBy: {
					createdAt: 'desc'
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getDocumentFolderById(folderId: string) {
		try {
			return await prisma.patientDocumentFolder.findUnique({
				where: { id: folderId },
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							phone: true,
							uhid: true
						}
					},
					createdBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					},
					documents: {
						include: {
							uploadedBy: {
								select: {
									id: true,
									name: true,
									role: true
								}
							}
						},
						orderBy: {
							uploadedAt: 'desc'
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateDocumentFolder(folderId: string, data: {
		folderName?: string;
		description?: string;
		isActive?: boolean;
	}) {
		try {
			return await prisma.patientDocumentFolder.update({
				where: { id: folderId },
				data,
				include: {
					patient: true,
					createdBy: true,
					documents: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Patient Document Operations
	async uploadPatientDocument(data: {
		patientId: string;
		uploadedById: string;
		fileName: string;
		fileUrl: string;
		fileSize: number;
		mimeType: string;
		category: PatientDocumentCategory;
		description?: string;
		tags?: string[];
		folderId?: string;
		admissionId?: string;
	}) {
		try {
			return await prisma.patientDocumentFile.create({
				data,
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							phone: true,
							uhid: true
						}
					},
					folder: {
						select: {
							id: true,
							folderName: true
						}
					},
					uploadedBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					},
					admission: {
						select: {
							id: true,
							admissionDate: true,
							status: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getPatientDocuments(patientId: string, filters?: {
		category?: PatientDocumentCategory;
		status?: DocumentStatus;
		folderId?: string;
		admissionId?: string;
	}) {
		try {
			const whereClause: any = { patientId };
			
			if (filters?.category) {
				whereClause.category = filters.category;
			}
			if (filters?.status) {
				whereClause.status = filters.status;
			}
			if (filters?.folderId) {
				whereClause.folderId = filters.folderId;
			}
			if (filters?.admissionId) {
				whereClause.admissionId = filters.admissionId;
			}

			return await prisma.patientDocumentFile.findMany({
				where: whereClause,
				include: {
					folder: {
						select: {
							id: true,
							folderName: true
						}
					},
					uploadedBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					},
					admission: {
						select: {
							id: true,
							admissionDate: true,
							status: true
						}
					}
				},
				orderBy: {
					uploadedAt: 'desc'
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getDocumentById(documentId: string) {
		try {
			return await prisma.patientDocumentFile.findUnique({
				where: { id: documentId },
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							phone: true,
							uhid: true
						}
					},
					folder: {
						select: {
							id: true,
							folderName: true
						}
					},
					uploadedBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					},
					admission: {
						select: {
							id: true,
							admissionDate: true,
							status: true
						}
					},
					previousVersion: true,
					nextVersions: {
						orderBy: {
							uploadedAt: 'desc'
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateDocumentStatus(documentId: string, status: DocumentStatus, notes?: string) {
		try {
			return await prisma.patientDocumentFile.update({
				where: { id: documentId },
				data: {
					status,
					description: notes ? `${notes} (Status: ${status})` : undefined
				},
				include: {
					patient: true,
					uploadedBy: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async createDocumentVersion(data: {
		originalDocumentId: string;
		patientId: string;
		uploadedById: string;
		fileName: string;
		fileUrl: string;
		fileSize: number;
		mimeType: string;
		category: PatientDocumentCategory;
		description?: string;
		tags?: string[];
		folderId?: string;
		admissionId?: string;
	}) {
		try {
			// Get the original document to get the next version number
			const originalDoc = await prisma.patientDocumentFile.findUnique({
				where: { id: data.originalDocumentId }
			});

			if (!originalDoc) {
				throw new AppError("Original document not found");
			}

			const newVersion = originalDoc.version + 1;

			// Create new version
			const newDocument = await prisma.patientDocumentFile.create({
				data: {
					...data,
					version: newVersion,
					previousVersionId: data.originalDocumentId
				},
				include: {
					patient: true,
					uploadedBy: true,
					previousVersion: true
				}
			});

			// Update original document to point to new version
			await prisma.patientDocumentFile.update({
				where: { id: data.originalDocumentId },
				data: {
					status: 'ARCHIVED'
				}
			});

			return newDocument;
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async deleteDocument(documentId: string) {
		try {
			return await prisma.patientDocumentFile.delete({
				where: { id: documentId }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Document Access Logging
	async logDocumentAccess(data: {
		documentId: string;
		accessedById: string;
		action: string;
		ipAddress?: string;
		userAgent?: string;
	}) {
		try {
			return await prisma.documentAccessLog.create({
				data,
				include: {
					document: {
						select: {
							id: true,
							fileName: true,
							category: true
						}
					},
					accessedBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getDocumentAccessLogs(documentId: string) {
		try {
			return await prisma.documentAccessLog.findMany({
				where: { documentId },
				include: {
					accessedBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					}
				},
				orderBy: {
					accessedAt: 'desc'
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Dashboard and Analytics
	async getPatientDocumentStats(patientId: string) {
		try {
			const [
				totalDocuments,
				documentsByCategory,
				documentsByStatus,
				recentDocuments
			] = await Promise.all([
				prisma.patientDocumentFile.count({
					where: { patientId }
				}),
				prisma.patientDocumentFile.groupBy({
					by: ['category'],
					where: { patientId },
					_count: {
						category: true
					}
				}),
				prisma.patientDocumentFile.groupBy({
					by: ['status'],
					where: { patientId },
					_count: {
						status: true
					}
				}),
				prisma.patientDocumentFile.findMany({
					where: { patientId },
					include: {
						uploadedBy: {
							select: {
								name: true,
								role: true
							}
						}
					},
					orderBy: {
						uploadedAt: 'desc'
					},
					take: 10
				})
			]);

			return {
				totalDocuments,
				documentsByCategory,
				documentsByStatus,
				recentDocuments
			};
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async searchDocuments(patientId: string, searchTerm: string) {
		try {
			return await prisma.patientDocumentFile.findMany({
				where: {
					patientId,
					OR: [
						{
							fileName: {
								contains: searchTerm,
								mode: 'insensitive'
							}
						},
						{
							description: {
								contains: searchTerm,
								mode: 'insensitive'
							}
						},
						{
							tags: {
								has: searchTerm
							}
						}
					]
				},
				include: {
					folder: {
						select: {
							id: true,
							folderName: true
						}
					},
					uploadedBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					}
				},
				orderBy: {
					uploadedAt: 'desc'
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Get documents by admission
	async getDocumentsByAdmission(admissionId: string) {
		try {
			return await prisma.patientDocumentFile.findMany({
				where: { admissionId },
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							phone: true,
							uhid: true
						}
					},
					folder: {
						select: {
							id: true,
							folderName: true
						}
					},
					uploadedBy: {
						select: {
							id: true,
							name: true,
							role: true
						}
					}
				},
				orderBy: {
					uploadedAt: 'desc'
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}