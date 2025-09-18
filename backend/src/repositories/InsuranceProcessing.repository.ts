import { PrismaClient, InsuranceVerificationStatus, InsuranceDocumentType } from "@prisma/client";
import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";

export class InsuranceProcessingRepository {
	// Insurance Document Operations
	async uploadInsuranceDocument(data: {
		admissionId: string;
		uploadedById: string;
		fileName: string;
		fileUrl: string;
		fileSize: number;
		mimeType: string;
		documentType: InsuranceDocumentType;
	}) {
		try {
			return await prisma.insuranceDocument.create({
				data,
				include: {
					admission: {
						include: {
							queue: {
								include: {
									patient: {
										select: {
											id: true,
											name: true,
											phone: true,
											uhid: true
										}
									}
								}
							}
						}
					},
					uploadedBy: {
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

	async getInsuranceDocuments(admissionId: string) {
		try {
			return await prisma.insuranceDocument.findMany({
				where: { admissionId },
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
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async deleteInsuranceDocument(documentId: string) {
		try {
			return await prisma.insuranceDocument.delete({
				where: { id: documentId }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Insurance Verification Operations
	async createInsuranceVerification(data: {
		admissionId: string;
		policyValidFrom?: Date;
		policyValidTo?: Date;
		coverageAmount?: number;
		deductibleAmount?: number;
		coPaymentPercentage?: number;
		preAuthorizationRequired?: boolean;
		preAuthorizationNumber?: string;
		preAuthorizationDate?: Date;
		preAuthorizationExpiry?: Date;
	}) {
		try {
			return await prisma.insuranceVerification.create({
				data,
				include: {
					admission: {
						include: {
							queue: {
								include: {
									patient: {
										select: {
											id: true,
											name: true,
											phone: true,
											uhid: true
										}
									}
								}
							}
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getInsuranceVerification(admissionId: string) {
		try {
			return await prisma.insuranceVerification.findUnique({
				where: { admissionId },
				include: {
					admission: {
						include: {
							queue: {
								include: {
									patient: {
										select: {
											id: true,
											name: true,
											phone: true,
											uhid: true
										}
									}
								}
							}
						}
					},
					verifiedByStaff: {
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

	async updateInsuranceVerification(admissionId: string, data: {
		verificationStatus?: InsuranceVerificationStatus;
		verificationDate?: Date;
		verifiedBy?: string;
		verificationNotes?: string;
		policyValidFrom?: Date;
		policyValidTo?: Date;
		coverageAmount?: number;
		deductibleAmount?: number;
		coPaymentPercentage?: number;
		preAuthorizationRequired?: boolean;
		preAuthorizationNumber?: string;
		preAuthorizationDate?: Date;
		preAuthorizationExpiry?: Date;
		verifiedByStaffId?: string;
	}) {
		try {
			return await prisma.insuranceVerification.update({
				where: { admissionId },
				data,
				include: {
					admission: {
						include: {
							queue: {
								include: {
									patient: {
										select: {
											id: true,
											name: true,
											phone: true,
											uhid: true
										}
									}
								}
							}
						}
					},
					verifiedByStaff: {
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

	async getInsuranceVerificationsByStatus(hospitalId: string, status?: InsuranceVerificationStatus) {
		try {
			const whereClause: any = {
				admission: {
					queue: {
						hospitalId
					}
				}
			};

			if (status) {
				whereClause.verificationStatus = status;
			}

			return await prisma.insuranceVerification.findMany({
				where: whereClause,
				include: {
					admission: {
						include: {
							queue: {
								include: {
									patient: {
										select: {
											id: true,
											name: true,
											phone: true,
											uhid: true
										}
									}
								}
							},
							assignedDoctor: {
								select: {
									id: true,
									name: true,
									specialisation: true
								}
							}
						}
					},
					verifiedByStaff: {
						select: {
							id: true,
							name: true,
							role: true
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

	// Insurance Processing Dashboard Stats
	async getInsuranceProcessingStats(hospitalId: string) {
		try {
			const [
				totalPending,
				totalVerified,
				totalRejected,
				totalUnderReview,
				totalExpired
			] = await Promise.all([
				prisma.insuranceVerification.count({
					where: {
						admission: {
							queue: { hospitalId }
						},
						verificationStatus: 'PENDING'
					}
				}),
				prisma.insuranceVerification.count({
					where: {
						admission: {
							queue: { hospitalId }
						},
						verificationStatus: 'VERIFIED'
					}
				}),
				prisma.insuranceVerification.count({
					where: {
						admission: {
							queue: { hospitalId }
						},
						verificationStatus: 'REJECTED'
					}
				}),
				prisma.insuranceVerification.count({
					where: {
						admission: {
							queue: { hospitalId }
						},
						verificationStatus: 'UNDER_REVIEW'
					}
				}),
				prisma.insuranceVerification.count({
					where: {
						admission: {
							queue: { hospitalId }
						},
						verificationStatus: 'EXPIRED'
					}
				})
			]);

			return {
				totalPending,
				totalVerified,
				totalRejected,
				totalUnderReview,
				totalExpired,
				totalProcessed: totalVerified + totalRejected + totalExpired,
				totalInProgress: totalPending + totalUnderReview
			};
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Get admissions with incomplete insurance verification
	async getAdmissionsWithIncompleteInsurance(hospitalId: string) {
		try {
			return await prisma.iPDAdmission.findMany({
				where: {
					queue: { hospitalId },
					insuranceType: {
						not: 'NA'
					},
					insuranceVerification: null
				},
				include: {
					queue: {
						include: {
							patient: {
								select: {
									id: true,
									name: true,
									phone: true,
									uhid: true
								}
							}
						}
					},
					assignedDoctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					}
				},
				orderBy: {
					admissionDate: 'desc'
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Check if policy is valid
	async checkPolicyValidity(admissionId: string) {
		try {
			const verification = await prisma.insuranceVerification.findUnique({
				where: { admissionId }
			});

			if (!verification) {
				return { isValid: false, reason: 'No verification record found' };
			}

			const now = new Date();
			
			if (verification.policyValidTo && verification.policyValidTo < now) {
				// Update status to expired
				await prisma.insuranceVerification.update({
					where: { admissionId },
					data: { 
						verificationStatus: 'EXPIRED',
						verificationNotes: 'Policy expired on ' + verification.policyValidTo.toISOString()
					}
				});
				return { isValid: false, reason: 'Policy has expired' };
			}

			if (verification.verificationStatus === 'VERIFIED') {
				return { isValid: true, reason: 'Policy is valid and verified' };
			}

			return { isValid: false, reason: 'Policy verification pending' };
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
