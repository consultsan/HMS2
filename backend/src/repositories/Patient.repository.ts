import { Patient } from "@prisma/client";
import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import { UhidGenerator } from "../utils/uhidGenerator";

export class PatientRepository {
	async findAll() {
		try {
			return await prisma.patient.findMany();
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async findById(id: string) {
		try {
			return await prisma.patient.findUnique({
				where: { id },
				include: {
					relativesAdded: true,
					relativeOfOthers: true,
					appointments: {
						include: {
							diagnosisRecord: {
								include: {
									followUpAppointment: true
								}
							},
							surgery: true
						},
						orderBy: {
							scheduledAt: "desc"
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async create(
		data: Pick<
			Patient,
			| "name"
			| "dob"
			| "gender"
			| "phone"
			| "email"
			| "registrationMode"
			| "registrationSource"
			| "registrationSourceDetails"
			| "referralPersonName"
			| "hospitalId"
			| "createdBy"
		>
	) {
		try {
			// Get hospital name to generate UHID
			const hospital = await prisma.hospital.findUnique({
				where: { id: data.hospitalId },
				select: { name: true }
			});

			if (!hospital) {
				throw new AppError("Hospital not found", 404);
			}

			// Generate UHID
			const uhid = await UhidGenerator.generateUHID(hospital.name);

			// Create patient with UHID
			return await prisma.patient.create({
				data: {
					...data,
					uhid
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async update(
		id: string,
		data: Omit<
			Patient,
			| "id"
			| "createdAt"
			| "updatedAt"
			| "hospitalId"
			| "patientUniqueId"
			| "documents"
		>
	) {
		try {
			return await prisma.patient.update({
				where: { id },
				data
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async delete(id: string) {
		try {
			return await prisma.patient.delete({
				where: { id }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async findByPhone(data: Pick<Patient, "phone" | "hospitalId">) {
		try {
			return await prisma.patient.findMany({
				where: { hospitalId: data.hospitalId, phone: data.phone }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async findByName(data: Pick<Patient, "name" | "hospitalId">) {
		try {
			return await prisma.patient.findMany({
				where: {
					hospitalId: data.hospitalId,
					name: {
						contains: data.name,
						mode: "insensitive"
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async findByUniqueId(patientUniqueId: string) {
		try {
			return await prisma.patient.findFirst({
				where: { patientUniqueId }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async findByUHID(uhid: string) {
		try {
			return await prisma.patient.findUnique({
				where: { uhid },
				include: {
					relativesAdded: true,
					relativeOfOthers: true,
					appointments: {
						orderBy: {
							scheduledAt: "desc"
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Sales Person specific methods
	async findByCreator(createdById: string) {
		try {
			return await prisma.patient.findMany({
				where: {
					createdBy: createdById
				},
				include: {
					appointments: {
						include: {
							diagnosisRecord: {
								include: {
									followUpAppointment: true
								}
							},
							surgery: true
						},
						orderBy: {
							scheduledAt: "desc"
						}
					}
				},
				orderBy: {
					createdAt: "desc"
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async findFollowUpAndSurgeryPatients(createdById: string) {
		try {
			return await prisma.patient.findMany({
				where: {
					createdBy: createdById,
					appointments: {
						some: {
							OR: [
								{
									visitType: "FOLLOW_UP"
								},
								{
									surgery: {
										isNot: null
									}
								},
								{
									diagnosisRecord: {
										followUpAppointment: {
											isNot: null
										}
									}
								}
							]
						}
					}
				},
				include: {
					appointments: {
						include: {
							diagnosisRecord: {
								include: {
									followUpAppointment: true
								}
							},
							surgery: true
						},
						orderBy: {
							scheduledAt: "desc"
						}
					}
				},
				orderBy: {
					createdAt: "desc"
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async findByCreatorAndHospital(createdById: string, hospitalId: string) {
		try {
			return await prisma.patient.findMany({
				where: {
					createdBy: createdById,
					hospitalId
				},
				include: {
					appointments: {
						include: {
							diagnosisRecord: {
								include: {
									followUpAppointment: true
								}
							},
							surgery: true
						},
						orderBy: {
							scheduledAt: "desc"
						}
					}
				},
				orderBy: {
					createdAt: "desc"
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async findFollowUpAndSurgeryPatientsByHospital(createdById: string, hospitalId: string) {
		try {
			return await prisma.patient.findMany({
				where: {
					hospitalId,
					OR: [
						// Patients created by this sales person
						{
							createdBy: createdById
						},
						// Follow-up patients (regardless of who created them)
						{
							appointments: {
								some: {
									visitType: "FOLLOW_UP"
								}
							}
						},
						// Surgery patients (regardless of who created them)
						{
							appointments: {
								some: {
									surgery: {
										isNot: null
									}
								}
							}
						},
						// Patients with follow-up appointments from diagnosis
						{
							appointments: {
								some: {
									diagnosisRecord: {
										followUpAppointment: {
											isNot: null
										}
									}
								}
							}
						},
						// Public patients (createdBy: null)
						{
							createdBy: null
						}
					]
				},
				include: {
					appointments: {
						include: {
							diagnosisRecord: {
								include: {
									followUpAppointment: true
								}
							},
							surgery: true
						},
						orderBy: {
							scheduledAt: "desc"
						}
					}
				},
				orderBy: {
					createdAt: "desc"
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
