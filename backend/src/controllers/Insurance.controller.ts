import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";

const prisma = new PrismaClient();

export class InsuranceController {
	// Add insurance for a patient
	addInsurance = async (req: Request, res: Response) => {
		try {
			const {
				patientId,
				providerName,
				policyNumber,
				coverageType,
				coverageAmount,
				validFrom,
				validTo
			} = req.body;

			// Validate required fields
			if (
				!patientId ||
				!providerName ||
				!policyNumber ||
				!coverageType ||
				!coverageAmount ||
				!validFrom ||
				!validTo
			) {
				throw new AppError("All insurance fields are required", 400);
			}

			// Check if patient exists
			const patient = await prisma.patient.findUnique({
				where: { id: patientId }
			});

			if (!patient) {
				throw new AppError("Patient not found", 404);
			}

			// Create insurance record
			const insurance = await prisma.insurance.create({
				data: {
					patientId,
					providerName,
					policyNumber,
					coverageType,
					coverageAmount: parseFloat(coverageAmount),
					validFrom: new Date(validFrom),
					validTo: new Date(validTo)
				},
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							patientUniqueId: true
						}
					}
				}
			});

			res
				.status(201)
				.json(new ApiResponse("Insurance added successfully", insurance));
		} catch (error: any) {
			console.error("Error in addInsurance:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to add insurance"));
		}
	};

	// Get insurance by ID
	getInsuranceById = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const insurance = await prisma.insurance.findUnique({
				where: { id },
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							patientUniqueId: true,
							phone: true,
							email: true
						}
					}
				}
			});

			if (!insurance) {
				throw new AppError("Insurance not found", 404);
			}

			res
				.status(200)
				.json(new ApiResponse("Insurance retrieved successfully", insurance));
		} catch (error: any) {
			console.error("Error in getInsuranceById:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve insurance"));
		}
	};

	// Get insurance by patient
	getInsuranceByPatient = async (req: Request, res: Response) => {
		try {
			const { patientId } = req.params;
			const { isActive } = req.query;

			const where: any = { patientId };
			if (isActive !== undefined) {
				where.isActive = isActive === "true";
			}

			const insurance = await prisma.insurance.findMany({
				where,
				orderBy: {
					validFrom: "desc"
				}
			});

			res
				.status(200)
				.json(new ApiResponse("Insurance retrieved successfully", insurance));
		} catch (error: any) {
			console.error("Error in getInsuranceByPatient:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve insurance"));
		}
	};

	// Update insurance
	updateInsurance = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const {
				providerName,
				policyNumber,
				coverageType,
				coverageAmount,
				validFrom,
				validTo,
				isActive
			} = req.body;

			const updateData: any = {};
			if (providerName) updateData.providerName = providerName;
			if (policyNumber) updateData.policyNumber = policyNumber;
			if (coverageType) updateData.coverageType = coverageType;
			if (coverageAmount)
				updateData.coverageAmount = parseFloat(coverageAmount);
			if (validFrom) updateData.validFrom = new Date(validFrom);
			if (validTo) updateData.validTo = new Date(validTo);
			if (isActive !== undefined) updateData.isActive = isActive;

			const insurance = await prisma.insurance.update({
				where: { id },
				data: updateData,
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							patientUniqueId: true
						}
					}
				}
			});

			res
				.status(200)
				.json(new ApiResponse("Insurance updated successfully", insurance));
		} catch (error: any) {
			console.error("Error in updateInsurance:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to update insurance"));
		}
	};

	// Delete insurance
	deleteInsurance = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			await prisma.insurance.delete({
				where: { id }
			});

			res.status(204).json(new ApiResponse("Insurance deleted successfully"));
		} catch (error: any) {
			console.error("Error in deleteInsurance:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to delete insurance"));
		}
	};

	// Validate insurance coverage
	validateInsurance = async (req: Request, res: Response) => {
		try {
			const { patientId, amount } = req.body;

			if (!patientId || !amount) {
				throw new AppError("Patient ID and amount are required", 400);
			}

			// Get active insurance for patient
			const insurance = await prisma.insurance.findFirst({
				where: {
					patientId,
					isActive: true,
					validFrom: { lte: new Date() },
					validTo: { gte: new Date() }
				},
				orderBy: {
					coverageAmount: "desc"
				}
			});

			if (!insurance) {
				return res.status(200).json(
					new ApiResponse("No active insurance found", {
						hasInsurance: false,
						coverageAmount: 0,
						coveredAmount: 0,
						patientAmount: parseFloat(amount)
					})
				);
			}

			const coveredAmount = Math.min(
				parseFloat(amount),
				insurance.coverageAmount
			);
			const patientAmount = parseFloat(amount) - coveredAmount;

			res.status(200).json(
				new ApiResponse("Insurance validation completed", {
					hasInsurance: true,
					insurance,
					coverageAmount: insurance.coverageAmount,
					coveredAmount,
					patientAmount
				})
			);
		} catch (error: any) {
			console.error("Error in validateInsurance:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to validate insurance"));
		}
	};

	// Get insurance statistics
	getInsuranceStats = async (req: Request, res: Response) => {
		try {
			const hospitalId = req.user?.hospitalId;
			if (!hospitalId) {
				throw new AppError("Hospital ID is required", 400);
			}

			const [totalInsurance, activeInsurance, expiringSoon] = await Promise.all(
				[
					prisma.insurance.count({
						where: {
							patient: { hospitalId }
						}
					}),
					prisma.insurance.count({
						where: {
							patient: { hospitalId },
							isActive: true,
							validFrom: { lte: new Date() },
							validTo: { gte: new Date() }
						}
					}),
					prisma.insurance.count({
						where: {
							patient: { hospitalId },
							isActive: true,
							validTo: {
								gte: new Date(),
								lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
							}
						}
					})
				]
			);

			const stats = {
				totalInsurance,
				activeInsurance,
				expiringSoon,
				coverageRate:
					totalInsurance > 0 ? (activeInsurance / totalInsurance) * 100 : 0
			};

			res
				.status(200)
				.json(
					new ApiResponse("Insurance statistics retrieved successfully", stats)
				);
		} catch (error: any) {
			console.error("Error in getInsuranceStats:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(
						error.message || "Failed to retrieve insurance statistics"
					)
				);
		}
	};
}
