import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import { OpdCharge } from "@prisma/client";

export class OpdChargeRepository {
	async create(data: Pick<OpdCharge, "doctorId" | "amount" | "hospitalId">) {
		try {
			return await prisma.opdCharge.create({
				data
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async update(id: string, amount: number) {
		try {
			return await prisma.opdCharge.update({
				where: { id },
				data: { amount },
				include: { doctor: true, hospital: true }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async delete(id: string) {
		try {
			await prisma.opdCharge.delete({
				where: { id }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getByDoctor(doctorId: string) {
		try {
			return await prisma.opdCharge.findMany({
				where: { doctorId },
				include: {
					doctor: true,
					hospital: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getByHospital(hospitalId: string) {
		try {
			return await prisma.opdCharge.findMany({
				where: { hospitalId },
				include: {
					doctor: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
