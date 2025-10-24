import { PrismaClient, IPDStatus, InsuranceType, WardType, WardSubType, PatientDocumentCategory } from "@prisma/client";
import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";

export class IPDRepository {
	// IPD Queue Operations
	async createIPDQueue(data: {
		patientId: string;
		hospitalId: string;
		createdById: string;
		ipdNumber: string;
	}) {
		try {
			return await prisma.iPDQueue.create({
				data,
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							phone: true,
							uhid: true,
							gender: true,
							dob: true
						}
					},
					createdBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					hospital: {
						select: {
							id: true,
							name: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getIPDQueues(hospitalId: string, status?: IPDStatus) {
		try {
			const whereClause: any = { hospitalId };
			if (status) {
				whereClause.status = status;
			}

			return await prisma.iPDQueue.findMany({
				where: whereClause,
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							phone: true,
							uhid: true,
							gender: true,
							dob: true
						}
					},
					createdBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					admission: {
						include: {
							assignedDoctor: {
								select: {
									id: true,
									name: true,
									specialisation: true
								}
							}
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

	async getIPDQueueById(id: string) {
		try {
			return await prisma.iPDQueue.findUnique({
				where: { id },
				include: {
					patient: true,
					createdBy: true,
					hospital: true,
					admission: {
						include: {
							assignedDoctor: true,
							visits: {
								include: {
									doctor: true,
									vitals: true
								},
								orderBy: {
									visitDate: 'desc'
								}
							},
							dischargeSummary: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateIPDQueueStatus(id: string, status: IPDStatus) {
		try {
			return await prisma.iPDQueue.update({
				where: { id },
				data: { status },
				include: {
					patient: true,
					admission: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// IPD Admission Operations
	async createIPDAdmission(data: {
		queueId: string;
		assignedDoctorId: string;
		insuranceType: InsuranceType;
		insuranceCompany?: string;
		policyNumber?: string;
		tpaName?: string;
		insuranceNumber?: string;
		insuranceCardUrl?: string;
		wardType: WardType;
		wardSubType?: WardSubType;
		roomNumber?: string;
		bedNumber?: string;
		chiefComplaint?: string;
		admissionNotes?: string;
	}) {
		try {
			return await prisma.iPDAdmission.create({
				data,
				include: {
					queue: {
						include: {
							patient: true
						}
					},
					assignedDoctor: true,
					visits: true,
					dischargeSummary: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getIPDAdmissions(hospitalId: string, status?: IPDStatus) {
		try {
			const whereClause: any = {
				queue: {
					hospitalId
				}
			};
			if (status) {
				whereClause.status = status;
			}

			return await prisma.iPDAdmission.findMany({
				where: whereClause,
				include: {
					queue: {
						include: {
							patient: {
								select: {
									id: true,
									name: true,
									phone: true,
									uhid: true,
									gender: true,
									dob: true
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
					},
					visits: {
						include: {
							doctor: {
								select: {
									id: true,
									name: true
								}
							}
						},
						orderBy: {
							visitDate: 'desc'
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

	async getIPDAdmissionById(id: string) {
		try {
			return await prisma.iPDAdmission.findUnique({
				where: { id },
				include: {
					queue: {
						include: {
							patient: true,
							hospital: true
						}
					},
					assignedDoctor: true,
					visits: {
						include: {
							doctor: true,
							vitals: true
						},
						orderBy: {
							visitDate: 'desc'
						}
					},
					dischargeSummary: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateIPDAdmission(id: string, data: any) {
		try {
			return await prisma.iPDAdmission.update({
				where: { id },
				data,
				include: {
					queue: {
						include: {
							patient: true
						}
					},
					assignedDoctor: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// IPD Visit Operations
	async createIPDVisit(data: {
		admissionId: string;
		doctorId: string;
		visitNotes: string;
		clinicalObservations?: string;
		treatmentGiven?: string;
		medicationChanges?: string;
		patientResponse?: string;
		nextVisitPlan?: string;
	}) {
		try {
			return await prisma.iPDVisit.create({
				data,
				include: {
					admission: {
						include: {
							queue: {
								include: {
									patient: true
								}
							}
						}
					},
					doctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					vitals: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getIPDVisits(admissionId: string) {
		try {
			return await prisma.iPDVisit.findMany({
				where: { admissionId },
				include: {
					doctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					vitals: true
				},
				orderBy: {
					visitDate: 'desc'
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async addVisitVitals(visitId: string, vitals: Array<{
		type: string;
		value: number;
		unit?: string;
		notes?: string;
	}>) {
		try {
			const vitalData = vitals.map(vital => ({
				...vital,
				type: vital.type as any,
				visitId
			}));

			return await prisma.iPDVisitVital.createMany({
				data: vitalData
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// IPD Discharge Summary Operations
	async createDischargeSummary(data: {
		admissionId: string;
		admissionDate: Date;
		dischargeDate: Date;
		totalStayDuration: number;
		chiefComplaint: string;
		finalDiagnosis: string;
		treatmentSummary: string;
		proceduresPerformed?: string;
		medicationsPrescribed: string;
		followUpInstructions: string;
		doctorSignature?: string;
		hospitalStamp?: string;
	}) {
		try {
			return await prisma.iPDDischargeSummary.create({
				data,
				include: {
					admission: {
						include: {
							queue: {
								include: {
									patient: true,
									hospital: true
								}
							},
							assignedDoctor: true,
							visits: {
								include: {
									doctor: true,
									vitals: true
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

	async getDischargeSummary(admissionId: string) {
		try {
			return await prisma.iPDDischargeSummary.findUnique({
				where: { admissionId },
				include: {
					admission: {
						include: {
							queue: {
								include: {
									patient: true,
									hospital: true
								}
							},
							assignedDoctor: true,
							visits: {
								include: {
									doctor: true,
									vitals: true
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

	// Insurance Company Operations
	async createInsuranceCompany(data: {
		name: string;
		hospitalId: string;
		isPartnered: boolean;
		tpaName?: string;
		contactInfo?: string;
	}) {
		try {
			return await prisma.insuranceCompany.create({
				data,
				include: {
					hospital: {
						select: {
							id: true,
							name: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getInsuranceCompanies(hospitalId: string) {
		try {
			return await prisma.insuranceCompany.findMany({
				where: { hospitalId },
				orderBy: {
					name: 'asc'
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Ward Operations
	async createWard(data: {
		name: string;
		type: WardType;
		subType?: WardSubType;
		totalBeds: number;
		hospitalId: string;
		pricePerDay?: number;
		description?: string;
	}) {
		try {
			const ward = await prisma.ward.create({
				data: {
					...data,
					availableBeds: data.totalBeds
				},
				include: {
					hospital: {
						select: {
							id: true,
							name: true
						}
					}
				}
			});

			// Create all beds in a single operation for better performance
			const bedData = Array.from({ length: data.totalBeds }, (_, i) => ({
				bedNumber: (i + 1).toString(),
				wardId: ward.id,
				pricePerDay: data.pricePerDay
			}));

			await prisma.bed.createMany({
				data: bedData
			});

			// Fetch the created beds to return them
			const createdBeds = await prisma.bed.findMany({
				where: { wardId: ward.id },
				orderBy: { bedNumber: 'asc' }
			});

			return { ...ward, beds: createdBeds };
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getWards(hospitalId: string, type?: WardType) {
		try {
			const whereClause: any = { hospitalId };
			if (type) {
				whereClause.type = type;
			}

			return await prisma.ward.findMany({
				where: whereClause,
				orderBy: [
					{ type: 'asc' },
					{ name: 'asc' }
				]
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateWardBedCount(id: string, occupiedBeds: number) {
		try {
			const ward = await prisma.ward.findUnique({
				where: { id }
			});

			if (!ward) {
				throw new AppError("Ward not found");
			}

			const availableBeds = ward.totalBeds - occupiedBeds;

			return await prisma.ward.update({
				where: { id },
				data: {
					occupiedBeds,
					availableBeds
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Dashboard Statistics
	async getIPDDashboardStats(hospitalId: string) {
		try {
			const [
				totalQueued,
				totalAdmitted,
				totalDischarged,
				wardOccupancy
			] = await Promise.all([
				prisma.iPDQueue.count({
					where: {
						hospitalId,
						status: 'QUEUED'
					}
				}),
				prisma.iPDAdmission.count({
					where: {
						queue: { hospitalId },
						status: 'ADMITTED'
					}
				}),
				prisma.iPDAdmission.count({
					where: {
						queue: { hospitalId },
						status: 'DISCHARGED'
					}
				}),
				prisma.ward.findMany({
					where: { hospitalId },
					select: {
						name: true,
						type: true,
						totalBeds: true,
						occupiedBeds: true,
						availableBeds: true
					}
				})
			]);

			return {
				totalQueued,
				totalAdmitted,
				totalDischarged,
				wardOccupancy
			};
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Bed Operations
	async getAvailableBeds(wardId: string) {
		try {
			const beds = await prisma.bed.findMany({
				where: {
					wardId,
					isOccupied: false
				}
			});

			// Sort beds numerically by bed number
			return beds.sort((a, b) => {
				const numA = parseInt(a.bedNumber) || 0;
				const numB = parseInt(b.bedNumber) || 0;
				return numA - numB;
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async assignBedToAdmission(bedId: string, admissionId: string) {
		try {
			// Update the bed status
			const updatedBed = await prisma.bed.update({
				where: { id: bedId },
				data: {
					isOccupied: true,
					admissions: {
						connect: { id: admissionId }
					}
				},
				include: {
					ward: true
				}
			});

			// Update ward bed counts
			const ward = updatedBed.ward;
			const newOccupiedBeds = ward.occupiedBeds + 1;
			const newAvailableBeds = ward.totalBeds - newOccupiedBeds;

			await prisma.ward.update({
				where: { id: ward.id },
				data: {
					occupiedBeds: newOccupiedBeds,
					availableBeds: newAvailableBeds
				}
			});

			return updatedBed;
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async releaseBed(bedId: string) {
		try {
			// Update the bed status
			const updatedBed = await prisma.bed.update({
				where: { id: bedId },
				data: {
					isOccupied: false,
					admissions: {
						set: []
					}
				},
				include: {
					ward: true
				}
			});

			// Update ward bed counts
			const ward = updatedBed.ward;
			const newOccupiedBeds = Math.max(0, ward.occupiedBeds - 1);
			const newAvailableBeds = ward.totalBeds - newOccupiedBeds;

			await prisma.ward.update({
				where: { id: ward.id },
				data: {
					occupiedBeds: newOccupiedBeds,
					availableBeds: newAvailableBeds
				}
			});

			return updatedBed;
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// IPD Patient Document Operations
	async uploadIPDPatientDocument(data: {
		admissionId: string;
		uploadedById: string;
		fileName: string;
		fileUrl: string;
		fileSize: number;
		mimeType: string;
		category: PatientDocumentCategory;
		description?: string;
	}) {
		try {
			return await prisma.iPDPatientDocument.create({
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

	async getIPDPatientDocuments(admissionId: string) {
		try {
			return await prisma.iPDPatientDocument.findMany({
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

	async deleteIPDPatientDocument(id: string) {
		try {
			return await prisma.iPDPatientDocument.delete({
				where: { id }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
