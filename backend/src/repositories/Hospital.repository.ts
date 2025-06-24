import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import { Department, Hospital } from "@prisma/client";

export class HospitalRepository {
	async getAllHospitals() {
		try {
			return await prisma.hospital.findMany({
				include: {
					admins: true,
					patients: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async addDepartmentInHospital(data: Pick<Department, "name" | "hospitalId">) {
		try {
			return await prisma.department.create({ data });
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getHospitalById(id: string) {
		try {
			const hospital = await prisma.hospital.findUnique({
				where: { id },
				include: {
					admins: true,
					patients: true
				}
			});

			if (!hospital) {
				throw new AppError("Hospital not found", 404);
			}

			return hospital;
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

	async updateHospital(
		id: string,
		data: Pick<
			Hospital,
			"name" | "address" | "contactNumber" | "email" | "status"
		>
	) {
		try {
			return await prisma.hospital.update({
				where: { id },
				data,
				include: {
					admins: true,
					patients: true
				}
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
}
