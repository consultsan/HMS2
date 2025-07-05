import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";

const prisma = new PrismaClient();

export class DiscountController {
	// Create a new discount
	createDiscount = async (req: Request, res: Response) => {
		try {
			const {
				code,
				description,
				discountType,
				value,
				maxDiscount,
				minAmount,
				validFrom,
				validTo,
				usageLimit
			} = req.body;

			// Validate required fields
			if (
				!code ||
				!description ||
				!discountType ||
				!value ||
				!validFrom ||
				!validTo
			) {
				throw new AppError(
					"Code, description, discount type, value, valid from, and valid to are required",
					400
				);
			}

			// Validate discount type
			if (!["PERCENTAGE", "FIXED_AMOUNT"].includes(discountType)) {
				throw new AppError(
					"Discount type must be PERCENTAGE or FIXED_AMOUNT",
					400
				);
			}

			// Check if code already exists
			const existingDiscount = await prisma.discount.findUnique({
				where: { code }
			});

			if (existingDiscount) {
				throw new AppError("Discount code already exists", 400);
			}

			// Create discount
			const discount = await prisma.discount.create({
				data: {
					code,
					description,
					discountType,
					value: parseFloat(value),
					maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
					minAmount: minAmount ? parseFloat(minAmount) : null,
					validFrom: new Date(validFrom),
					validTo: new Date(validTo),
					usageLimit: usageLimit ? parseInt(usageLimit) : null
				}
			});

			res
				.status(201)
				.json(new ApiResponse("Discount created successfully", discount));
		} catch (error: any) {
			console.error("Error in createDiscount:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to create discount"));
		}
	};

	// Get discount by ID
	getDiscountById = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const discount = await prisma.discount.findUnique({
				where: { id }
			});

			if (!discount) {
				throw new AppError("Discount not found", 404);
			}

			res
				.status(200)
				.json(new ApiResponse("Discount retrieved successfully", discount));
		} catch (error: any) {
			console.error("Error in getDiscountById:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve discount"));
		}
	};

	// Get all discounts
	getAllDiscounts = async (req: Request, res: Response) => {
		try {
			const { isActive, page = 1, limit = 10 } = req.query;

			const skip = (Number(page) - 1) * Number(limit);

			const where: any = {};
			if (isActive !== undefined) {
				where.isActive = isActive === "true";
			}

			const [discounts, total] = await Promise.all([
				prisma.discount.findMany({
					where,
					orderBy: {
						createdAt: "desc"
					},
					skip,
					take: Number(limit)
				}),
				prisma.discount.count({ where })
			]);

			res.status(200).json(
				new ApiResponse("Discounts retrieved successfully", {
					discounts,
					pagination: {
						page: Number(page),
						limit: Number(limit),
						total,
						pages: Math.ceil(total / Number(limit))
					}
				})
			);
		} catch (error: any) {
			console.error("Error in getAllDiscounts:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve discounts"));
		}
	};

	// Update discount
	updateDiscount = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const {
				description,
				discountType,
				value,
				maxDiscount,
				minAmount,
				validFrom,
				validTo,
				isActive,
				usageLimit
			} = req.body;

			const updateData: any = {};
			if (description) updateData.description = description;
			if (discountType) updateData.discountType = discountType;
			if (value) updateData.value = parseFloat(value);
			if (maxDiscount !== undefined)
				updateData.maxDiscount = maxDiscount ? parseFloat(maxDiscount) : null;
			if (minAmount !== undefined)
				updateData.minAmount = minAmount ? parseFloat(minAmount) : null;
			if (validFrom) updateData.validFrom = new Date(validFrom);
			if (validTo) updateData.validTo = new Date(validTo);
			if (isActive !== undefined) updateData.isActive = isActive;
			if (usageLimit !== undefined)
				updateData.usageLimit = usageLimit ? parseInt(usageLimit) : null;

			const discount = await prisma.discount.update({
				where: { id },
				data: updateData
			});

			res
				.status(200)
				.json(new ApiResponse("Discount updated successfully", discount));
		} catch (error: any) {
			console.error("Error in updateDiscount:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to update discount"));
		}
	};

	// Delete discount
	deleteDiscount = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			await prisma.discount.delete({
				where: { id }
			});

			res.status(204).json(new ApiResponse("Discount deleted successfully"));
		} catch (error: any) {
			console.error("Error in deleteDiscount:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to delete discount"));
		}
	};

	// Validate and apply discount
	validateDiscount = async (req: Request, res: Response) => {
		try {
			const { code, amount } = req.body;

			if (!code || !amount) {
				throw new AppError("Discount code and amount are required", 400);
			}

			// Find discount by code
			const discount = await prisma.discount.findUnique({
				where: { code }
			});

			if (!discount) {
				throw new AppError("Invalid discount code", 404);
			}

			// Check if discount is active
			if (!discount.isActive) {
				throw new AppError("Discount is not active", 400);
			}

			// Check validity period
			const now = new Date();
			if (now < discount.validFrom || now > discount.validTo) {
				throw new AppError("Discount is not valid at this time", 400);
			}

			// Check usage limit
			if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
				throw new AppError("Discount usage limit exceeded", 400);
			}

			// Check minimum amount
			if (discount.minAmount && parseFloat(amount) < discount.minAmount) {
				throw new AppError(
					`Minimum amount of ${discount.minAmount} required for this discount`,
					400
				);
			}

			// Calculate discount amount
			let discountAmount = 0;
			if (discount.discountType === "PERCENTAGE") {
				discountAmount = (parseFloat(amount) * discount.value) / 100;
				if (discount.maxDiscount) {
					discountAmount = Math.min(discountAmount, discount.maxDiscount);
				}
			} else {
				discountAmount = discount.value;
			}

			// Ensure discount doesn't exceed total amount
			discountAmount = Math.min(discountAmount, parseFloat(amount));

			const finalAmount = parseFloat(amount) - discountAmount;

			res.status(200).json(
				new ApiResponse("Discount validated successfully", {
					discount,
					originalAmount: parseFloat(amount),
					discountAmount,
					finalAmount,
					savings: discountAmount
				})
			);
		} catch (error: any) {
			console.error("Error in validateDiscount:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to validate discount"));
		}
	};

	// Apply discount (increment usage count)
	applyDiscount = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const discount = await prisma.discount.update({
				where: { id },
				data: {
					usedCount: {
						increment: 1
					}
				}
			});

			res
				.status(200)
				.json(new ApiResponse("Discount applied successfully", discount));
		} catch (error: any) {
			console.error("Error in applyDiscount:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to apply discount"));
		}
	};

	// Get discount statistics
	getDiscountStats = async (req: Request, res: Response) => {
		try {
			const [totalDiscounts, activeDiscounts, expiringSoon, totalUsage] =
				await Promise.all([
					prisma.discount.count(),
					prisma.discount.count({
						where: {
							isActive: true,
							validFrom: { lte: new Date() },
							validTo: { gte: new Date() }
						}
					}),
					prisma.discount.count({
						where: {
							isActive: true,
							validTo: {
								gte: new Date(),
								lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
							}
						}
					}),
					prisma.discount.aggregate({
						_sum: { usedCount: true }
					})
				]);

			const stats = {
				totalDiscounts,
				activeDiscounts,
				expiringSoon,
				totalUsage: totalUsage._sum.usedCount || 0,
				activeRate:
					totalDiscounts > 0 ? (activeDiscounts / totalDiscounts) * 100 : 0
			};

			res
				.status(200)
				.json(
					new ApiResponse("Discount statistics retrieved successfully", stats)
				);
		} catch (error: any) {
			console.error("Error in getDiscountStats:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(
						error.message || "Failed to retrieve discount statistics"
					)
				);
		}
	};
}
