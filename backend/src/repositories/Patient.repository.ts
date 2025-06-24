import { Patient } from "@prisma/client";
import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";

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
					relativeOfOthers: true
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
			| "hospitalId"
		>
	) {
		try {
			return await prisma.patient.create({ data });
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
				where: { hospitalId: data.hospitalId, name: data.name }
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
}
