import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import hashPassword from "../utils/hashPassword";
import { Hospital, HospitalAdmin } from "@prisma/client";

export class SuperAdminRepository {
	async findByEmail(email: string) {
		try {
			return await prisma.superAdmin.findUnique({
				where: { email }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Hospital Management
	async getAllHospitals() {
		try {
			return await prisma.hospital.findMany({
				include: {
					_count: {
						select: {
							admins: true,
							patients: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async createHospital(
		data: Pick<Hospital, "name" | "address" | "contactNumber" | "email">
	) {
		try {
			return await prisma.hospital.create({ data });
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateHospital(id: string, data: Partial<Hospital>) {
		try {
			return await prisma.hospital.update({
				where: { id },
				data
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async deleteHospital(id: string) {
		try {
			await prisma.hospital.delete({
				where: { id }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// Admin Management
	async getAllAdmins() {
		try {
			return await prisma.hospitalAdmin.findMany({
				include: {
					hospital: {
						select: {
							name: true,
							email: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async createHospitalAdmin(
		data: Pick<HospitalAdmin, "name" | "email" | "password" | "hospitalId">
	) {
		try {
			const hashedPassword = await hashPassword(data.password);
			return await prisma.hospitalAdmin.create({
				data: { ...data, password: hashedPassword },
				include: {
					hospital: {
						select: {
							name: true,
							email: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async updateHospitalAdmin(id: string, data: Partial<HospitalAdmin>) {
		try {
			if (data.password) data.password = await hashPassword(data.password);

			return await prisma.hospitalAdmin.update({
				where: { id },
				data,
				include: {
					hospital: {
						select: {
							name: true,
							email: true
						}
					}
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async deleteHospitalAdmin(id: string) {
		try {
			await prisma.hospitalAdmin.delete({
				where: { id }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	// KPI Endpoints
	async getSystemKPIs() {
		try {
			const [totalHospitals, totalAdmins, totalPatients, recentPatients] =
				await Promise.all([
					prisma.hospital.count(),
					prisma.hospitalAdmin.count(),
					prisma.patient.count(),
					prisma.patient.count({
						where: {
							createdAt: {
								gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
							}
						}
					})
				]);

			return {
				totalHospitals,
				totalAdmins,
				totalPatients,
				newPatientsLast30Days: recentPatients
			};
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
