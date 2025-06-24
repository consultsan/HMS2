import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import { Shift } from "@prisma/client";

export class ShiftRepository {
	async create(
		data: Pick<
			Shift,
			"shiftName" | "day" | "startTime" | "endTime" | "staffId" | "hospitalId"
		>
	) {
		try {
			return await prisma.shift.create({
				data,
				include: {
					hospital: true,
					staff: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async update(id: string, data: Partial<Shift>) {
		try {
			return await prisma.shift.update({
				where: { id },
				data,
				include: {
					hospital: true,
					staff: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async delete(id: string) {
		try {
			await prisma.shift.delete({
				where: { id }
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getByStaff(staffId: string) {
		try {
			return await prisma.shift.findMany({
				where: { staffId },
				include: {
					hospital: true,
					staff: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}

	async getByHospital(hospitalId: string) {
		try {
			return await prisma.shift.findMany({
				where: { hospitalId },
				include: {
					hospital: true,
					staff: true
				}
			});
		} catch (error: any) {
			throw new AppError(error.message);
		}
	}
}
