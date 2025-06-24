import { HospitalStaff, UserRole } from "@prisma/client";
import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import hashPassword from "../utils/hashPassword";

export class HospitalStaffRepository {
	async findByEmail(email: string) {
		try {
			return await prisma.hospitalStaff.findUnique({
				where: { email },
				include: {
					hospital: true,
					shifts: true,
					opdCharge: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async create(data: HospitalStaff) {
		try {
			const hashedPassword = await hashPassword(data.password);
			return await prisma.hospitalStaff.create({
				data: { ...data, password: hashedPassword }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async update(id: string, data: Partial<HospitalStaff>) {
		try {
			if (data.password) data.password = await hashPassword(data.password);

			return await prisma.hospitalStaff.update({
				where: { id },
				data,
				include: {
					hospital: true,
					shifts: true,
					opdCharge: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async delete(id: string) {
		try {
			await prisma.hospitalStaff.delete({
				where: { id }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getDoctorsByHospital(hospitalId: string) {
		try {
			return await prisma.hospitalStaff.findMany({
				where: { hospitalId, role: UserRole.DOCTOR },
				include: {
					shifts: true,
					opdCharge: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
