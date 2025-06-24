import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import hashPassword from "../utils/hashPassword";
import { HospitalAdmin } from "@prisma/client";

export class HospitalAdminRepository {
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

	async getAdminById(id: string) {
		try {
			const admin = await prisma.hospitalAdmin.findUnique({
				where: { id },
				include: {
					hospital: {
						select: {
							name: true,
							email: true
						}
					}
				}
			});

			if (!admin) {
				throw new AppError("Admin not found", 404);
			}

			return admin;
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getAdminByEmail(email: string) {
		try {
			return await prisma.hospitalAdmin.findUnique({
				where: { email },
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

	async createAdmin(
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

	async updateAdmin(id: string, data: Partial<HospitalAdmin>) {
		try {
			if (data.email) {
				const existingAdmin = await prisma.hospitalAdmin.findFirst({
					where: {
						email: data.email,
						id: { not: id } // Exclude current admin
					}
				});

				if (existingAdmin)
					throw new AppError("Email already exists for another admin", 400);
			}

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

	async deleteAdmin(id: string) {
		try {
			await prisma.hospitalAdmin.delete({
				where: { id }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
