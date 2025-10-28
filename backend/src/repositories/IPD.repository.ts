import { PrismaClient, IPDStatus, InsuranceType, WardType, WardSubType, PatientDocumentCategory, TestPriority, TestStatus, SurgeryPriority, SurgicalStatus, TransferType, TransferStatus, LabTestAttachmentType, SurgeryAttachmentType, BillType } from "@prisma/client";
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

	// IPD Lab Test Management
	async createIPDLabTest(data: {
		admissionId: string;
		orderedById: string;
		testName: string;
		testCode?: string;
		category?: string;
		priority: TestPriority;
		instructions?: string;
		fastingRequired?: boolean;
		fastingHours?: number;
		specialInstructions?: string;
		testCost?: number;
		labTestId?: string;
	}) {
		try {
			return await prisma.iPDLabTest.create({
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
											uhid: true,
											phone: true
										}
									}
								}
							}
						}
					},
					orderedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					performedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					labTest: true,
					attachments: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getIPDLabTests(admissionId: string, status?: string) {
		try {
			const whereClause: any = { admissionId };
			if (status) {
				whereClause.status = status;
			}

			return await prisma.iPDLabTest.findMany({
				where: whereClause,
				include: {
					orderedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					performedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					labTest: true,
					attachments: true
				},
				orderBy: { orderedAt: 'desc' }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateIPDLabTest(id: string, data: {
		status?: TestStatus;
		scheduledAt?: Date;
		completedAt?: Date;
		resultDate?: Date;
		resultValue?: string;
		resultUnit?: string;
		normalRange?: string;
		abnormalFlag?: boolean;
		resultNotes?: string;
		performedById?: string;
	}) {
		try {
			return await prisma.iPDLabTest.update({
				where: { id },
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
										uhid: true,
										phone: true
									}
								}
							}
						}
					}
				},
					orderedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					performedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					labTest: true,
					attachments: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async uploadIPDLabTestAttachment(data: {
		labTestId: string;
		uploadedById: string;
		fileName: string;
		fileUrl: string;
		fileSize: number;
		mimeType: string;
		attachmentType: LabTestAttachmentType;
		description?: string;
	}) {
		try {
			return await prisma.iPDLabTestAttachment.create({
				data,
				include: {
					uploadedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// IPD Surgery Management
	async createIPDSurgery(data: {
		admissionId: string;
		orderedById: string;
		surgeryName: string;
		surgeryCode?: string;
		category?: string;
		priority: SurgeryPriority;
		scheduledAt?: Date;
		estimatedDuration?: number;
		procedureDescription?: string;
		preoperativeDiagnosis?: string;
		postoperativeDiagnosis?: string;
		anesthesiaType?: string;
		anesthesiaNotes?: string;
		surgicalNotes?: string;
		complications?: string;
		bloodLoss?: number;
		bloodTransfusion?: boolean;
		bloodUnits?: number;
		primarySurgeon?: string;
		assistantSurgeon?: string;
		anesthesiologist?: string;
		scrubNurse?: string;
		circulatingNurse?: string;
		surgeryCost?: number;
		anesthesiaCost?: number;
		totalCost?: number;
		primarySurgeonId?: string;
	}) {
		try {
			return await prisma.iPDSurgery.create({
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
										uhid: true,
										phone: true
									}
								}
							}
						}
					}
				},
					orderedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					primarySurgeonStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					attachments: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getIPDSurgeries(admissionId: string, status?: string) {
		try {
			const whereClause: any = { admissionId };
			if (status) {
				whereClause.status = status;
			}

			return await prisma.iPDSurgery.findMany({
				where: whereClause,
				include: {
					orderedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					primarySurgeonStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					attachments: true
				},
				orderBy: { createdAt: 'desc' }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateIPDSurgery(id: string, data: {
		status?: SurgicalStatus;
		scheduledAt?: Date;
		actualStartTime?: Date;
		actualEndTime?: Date;
		procedureDescription?: string;
		preoperativeDiagnosis?: string;
		postoperativeDiagnosis?: string;
		anesthesiaType?: string;
		anesthesiaNotes?: string;
		surgicalNotes?: string;
		complications?: string;
		bloodLoss?: number;
		bloodTransfusion?: boolean;
		bloodUnits?: number;
		primarySurgeon?: string;
		assistantSurgeon?: string;
		anesthesiologist?: string;
		scrubNurse?: string;
		circulatingNurse?: string;
		surgeryCost?: number;
		anesthesiaCost?: number;
		totalCost?: number;
		primarySurgeonId?: string;
	}) {
		try {
			return await prisma.iPDSurgery.update({
				where: { id },
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
										uhid: true,
										phone: true
									}
								}
							}
						}
					}
				},
					orderedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					primarySurgeonStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					attachments: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async uploadIPDSurgeryAttachment(data: {
		surgeryId: string;
		uploadedById: string;
		fileName: string;
		fileUrl: string;
		fileSize: number;
		mimeType: string;
		attachmentType: SurgeryAttachmentType;
		description?: string;
	}) {
		try {
			return await prisma.iPDSurgeryAttachment.create({
				data,
				include: {
					uploadedBy: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// IPD Transfer Management
	async createIPDTransfer(data: {
		admissionId: string;
		transferType: TransferType;
		transferReason: string;
		transferNotes?: string;
		fromWardType?: WardType;
		fromWardSubType?: WardSubType;
		fromRoomNumber?: string;
		fromBedNumber?: string;
		fromDoctorId?: string;
		toWardType: WardType;
		toWardSubType?: WardSubType;
		toRoomNumber?: string;
		toBedNumber?: string;
		toDoctorId?: string;
		requestedByStaffId?: string;
	}) {
		try {
			return await prisma.iPDTransfer.create({
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
										uhid: true,
										phone: true
									}
								}
							}
						}
					}
				},
					requestedByStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					approvedByStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					fromDoctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					toDoctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getIPDTransfers(admissionId: string, status?: string) {
		try {
			const whereClause: any = { admissionId };
			if (status) {
				whereClause.status = status;
			}

			return await prisma.iPDTransfer.findMany({
				where: whereClause,
				include: {
					requestedByStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					approvedByStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					fromDoctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					toDoctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					}
				},
				orderBy: { transferDate: 'desc' }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateIPDTransfer(id: string, data: {
		status?: TransferStatus;
		approvedBy?: string;
		approvedAt?: Date;
		approvalNotes?: string;
		completedAt?: Date;
		completedBy?: string;
		completionNotes?: string;
		approvedByStaffId?: string;
	}) {
		try {
			return await prisma.iPDTransfer.update({
				where: { id },
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
										uhid: true,
										phone: true
									}
								}
							}
						}
					}
				},
					requestedByStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					approvedByStaff: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					fromDoctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					},
					toDoctor: {
						select: {
							id: true,
							name: true,
							specialisation: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// IPD Billing Operations
	async calculateIPDDischargeBill(admissionId: string) {
		try {
			// Get admission with all related data
			const admission = await prisma.iPDAdmission.findUnique({
				where: { id: admissionId },
				include: {
					queue: {
						include: {
							patient: {
								select: {
									id: true,
									name: true,
									uhid: true,
									phone: true
								}
							},
							hospital: {
								select: {
									id: true,
									name: true
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
					bed: {
						include: {
							ward: true
						}
					},
					labTests: {
						where: {
							status: {
								in: ['COMPLETED', 'SCHEDULED', 'IN_PROGRESS']
							}
						}
					},
					surgeries: {
						where: {
							status: {
								in: ['CONFIRMED']
							}
						}
					}
				}
			});

			if (!admission) {
				throw new AppError("Admission not found", 404);
			}

			// Calculate stay duration
			const dischargeDate = admission.dischargeDate || new Date();
			const stayDuration = Math.ceil(
				(dischargeDate.getTime() - admission.admissionDate.getTime()) / (1000 * 60 * 60 * 24)
			);

			// Calculate room charges
			let roomCharges = 0;
			if (admission.bed?.pricePerDay) {
				roomCharges = admission.bed.pricePerDay * stayDuration;
			} else if (admission.bed?.ward?.pricePerDay) {
				roomCharges = admission.bed.ward.pricePerDay * stayDuration;
			}

			// Calculate surgery costs
			let totalSurgeryCost = 0;
			const surgeryItems = [];
			for (const surgery of admission.surgeries) {
				const surgeryCost = surgery.totalCost || surgery.surgeryCost || 0;
				totalSurgeryCost += surgeryCost;
				surgeryItems.push({
					id: surgery.id,
					name: surgery.surgeryName,
					cost: surgeryCost,
					status: surgery.status,
					scheduledAt: surgery.scheduledAt
				});
			}

			// Calculate lab test costs
			let totalLabTestCost = 0;
			const labTestItems = [];
			for (const labTest of admission.labTests) {
				const testCost = labTest.testCost || 0;
				totalLabTestCost += testCost;
				labTestItems.push({
					id: labTest.id,
					name: labTest.testName,
					cost: testCost,
					status: labTest.status,
					orderedAt: labTest.orderedAt
				});
			}

			// Calculate total bill
			const totalBillAmount = roomCharges + totalSurgeryCost + totalLabTestCost;

			return {
				admission: {
					id: admission.id,
					admissionDate: admission.admissionDate,
					dischargeDate: dischargeDate,
					stayDuration,
					wardType: admission.wardType,
					wardSubType: admission.wardSubType,
					roomNumber: admission.roomNumber,
					bedNumber: admission.bedNumber
				},
				patient: admission.queue.patient,
				hospital: admission.queue.hospital,
				doctor: admission.assignedDoctor,
				ward: admission.bed?.ward,
				bed: admission.bed,
				billBreakdown: {
					roomCharges: {
						amount: roomCharges,
						days: stayDuration,
						ratePerDay: admission.bed?.pricePerDay || admission.bed?.ward?.pricePerDay || 0,
						description: `Room charges for ${stayDuration} days`
					},
					surgeryCharges: {
						amount: totalSurgeryCost,
						count: admission.surgeries.length,
						items: surgeryItems,
						description: `Surgery charges (${admission.surgeries.length} procedures)`
					},
					labTestCharges: {
						amount: totalLabTestCost,
						count: admission.labTests.length,
						items: labTestItems,
						description: `Lab test charges (${admission.labTests.length} tests)`
					}
				},
				totalAmount: totalBillAmount,
				currency: 'INR'
			};
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async generateIPDDischargeBill(admissionId: string, billData: {
		paidAmount?: number;
		dueDate?: Date;
		notes?: string;
		discountAmount?: number;
	}) {
		try {
			// Calculate the bill breakdown
			const billCalculation = await this.calculateIPDDischargeBill(admissionId);
			
			// Generate bill number
			const timestamp = Date.now().toString();
			const random = Math.random().toString(36).substring(2, 8).toUpperCase();
			const billNumber = `IPD-${timestamp}-${random}`;

			// Create bill items
			const billItems = [];

			// Add room charges item
			if (billCalculation.billBreakdown.roomCharges.amount > 0) {
				billItems.push({
					itemType: BillType.ROOM_CHARGE,
					description: billCalculation.billBreakdown.roomCharges.description,
					quantity: billCalculation.billBreakdown.roomCharges.days,
					unitPrice: billCalculation.billBreakdown.roomCharges.ratePerDay,
					totalPrice: billCalculation.billBreakdown.roomCharges.amount,
					discountAmount: 0,
					notes: `Ward: ${billCalculation.admission.wardType}${billCalculation.admission.wardSubType ? ` - ${billCalculation.admission.wardSubType}` : ''}`
				});
			}

			// Add surgery items
			for (const surgery of billCalculation.billBreakdown.surgeryCharges.items) {
				if (surgery.cost > 0) {
					billItems.push({
						itemType: BillType.SURGERY,
						description: `Surgery - ${surgery.name}`,
						quantity: 1,
						unitPrice: surgery.cost,
						totalPrice: surgery.cost,
						discountAmount: 0,
						notes: `Status: ${surgery.status}`,
						surgeryId: surgery.id
					});
				}
			}

			// Add lab test items
			for (const labTest of billCalculation.billBreakdown.labTestCharges.items) {
				if (labTest.cost > 0) {
					billItems.push({
						itemType: BillType.LAB_TEST,
						description: `Lab Test - ${labTest.name}`,
						quantity: 1,
						unitPrice: labTest.cost,
						totalPrice: labTest.cost,
						discountAmount: 0,
						notes: `Status: ${labTest.status}`,
						labTestId: labTest.id
					});
				}
			}

			// Calculate final amounts
			const subtotal = billCalculation.totalAmount;
			const discountAmount = billData.discountAmount || 0;
			const totalAmount = subtotal - discountAmount;
			const paidAmount = billData.paidAmount || 0;
			const dueAmount = totalAmount - paidAmount;

			// Create the bill
			const bill = await prisma.bill.create({
				data: {
					billNumber,
					patientId: billCalculation.patient.id,
					hospitalId: billCalculation.hospital.id,
					totalAmount,
					paidAmount,
					dueAmount,
					status: paidAmount >= totalAmount ? 'PAID' : 'GENERATED',
					billDate: new Date(),
					dueDate: billData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
					notes: billData.notes,
					billItems: {
						create: billItems
					}
				},
				include: {
					patient: true,
					hospital: true,
					billItems: true,
					payments: true
				}
			});

			return {
				bill,
				calculation: billCalculation
			};
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getIPDBills(admissionId: string) {
		try {
			// Get admission to find patient
			const admission = await prisma.iPDAdmission.findUnique({
				where: { id: admissionId },
				select: {
					queue: {
						select: {
							patientId: true
						}
					}
				}
			});

			if (!admission) {
				throw new AppError("Admission not found", 404);
			}

			// Get all bills for this patient that contain IPD-related items
			const bills = await prisma.bill.findMany({
				where: {
					patientId: admission.queue.patientId,
					billItems: {
						some: {
							itemType: {
								in: [BillType.ROOM_CHARGE, BillType.SURGERY, BillType.LAB_TEST]
							}
						}
					}
				},
				include: {
					patient: true,
					hospital: true,
					billItems: {
						where: {
							itemType: {
								in: [BillType.ROOM_CHARGE, BillType.SURGERY, BillType.LAB_TEST]
							}
						}
					},
					payments: true
				},
				orderBy: {
					billDate: 'desc'
				}
			});

			return bills;
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
