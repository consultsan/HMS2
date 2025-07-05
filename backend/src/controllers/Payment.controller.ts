import { Request, Response } from "express";
import { PrismaClient, PaymentMethod, PaymentStatus } from "@prisma/client";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";

const prisma = new PrismaClient();

export class PaymentController {
	// Generate unique transaction ID
	private generateTransactionId(): string {
		const timestamp = Date.now().toString();
		const random = Math.random().toString(36).substring(2, 8).toUpperCase();
		return `TXN-${timestamp}-${random}`;
	}

	// Process a payment
	processPayment = async (req: Request, res: Response) => {
		try {
			const { billId, amount, paymentMethod, notes } = req.body;

			// Validate required fields
			if (!billId || !amount || !paymentMethod) {
				throw new AppError(
					"Bill ID, amount, and payment method are required",
					400
				);
			}

			// Validate payment method
			if (!Object.values(PaymentMethod).includes(paymentMethod)) {
				throw new AppError("Invalid payment method", 400);
			}

			// Check if bill exists and get current status
			const bill = await prisma.bill.findUnique({
				where: { id: billId },
				include: {
					payments: {
						select: {
							amount: true,
							status: true
						}
					}
				}
			});

			if (!bill) {
				throw new AppError("Bill not found", 404);
			}

			// Calculate total paid amount
			const totalPaid = bill.payments
				.filter((payment) => payment.status === "COMPLETED")
				.reduce((sum, payment) => sum + payment.amount, 0);

			// Check if payment amount exceeds due amount
			if (amount > bill.dueAmount) {
				throw new AppError("Payment amount cannot exceed due amount", 400);
			}

			// Create payment record
			const payment = await prisma.payment.create({
				data: {
					billId,
					amount,
					paymentMethod,
					transactionId: this.generateTransactionId(),
					notes,
					status: "COMPLETED" // Assuming immediate completion for now
				}
			});

			// Update bill paid amount and due amount
			const newPaidAmount = totalPaid + amount;
			const newDueAmount = bill.totalAmount - newPaidAmount;
			const newStatus = newDueAmount === 0 ? "PAID" : "PARTIALLY_PAID";

			await prisma.bill.update({
				where: { id: billId },
				data: {
					paidAmount: newPaidAmount,
					dueAmount: newDueAmount,
					status: newStatus
				}
			});

			// Get updated bill with payment details
			const updatedBill = await prisma.bill.findUnique({
				where: { id: billId },
				include: {
					patient: {
						select: {
							id: true,
							name: true,
							patientUniqueId: true
						}
					},
					hospital: {
						select: {
							id: true,
							name: true
						}
					},
					payments: {
						orderBy: {
							paymentDate: "desc"
						}
					}
				}
			});

			res.status(201).json(
				new ApiResponse("Payment processed successfully", {
					payment,
					bill: updatedBill
				})
			);
		} catch (error: any) {
			console.error("Error in processPayment:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to process payment"));
		}
	};

	// Get payment by ID
	getPaymentById = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const payment = await prisma.payment.findUnique({
				where: { id },
				include: {
					bill: {
						include: {
							patient: {
								select: {
									id: true,
									name: true,
									patientUniqueId: true
								}
							},
							hospital: {
								select: {
									id: true,
									name: true
								}
							}
						}
					}
				}
			});

			if (!payment) {
				throw new AppError("Payment not found", 404);
			}

			res
				.status(200)
				.json(new ApiResponse("Payment retrieved successfully", payment));
		} catch (error: any) {
			console.error("Error in getPaymentById:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve payment"));
		}
	};

	// Get payments by bill
	getPaymentsByBill = async (req: Request, res: Response) => {
		try {
			const { billId } = req.params;
			const { status, page = 1, limit = 10 } = req.query;

			const skip = (Number(page) - 1) * Number(limit);

			const where: any = { billId };
			if (status) {
				where.status = status;
			}

			const [payments, total] = await Promise.all([
				prisma.payment.findMany({
					where,
					orderBy: {
						paymentDate: "desc"
					},
					skip,
					take: Number(limit)
				}),
				prisma.payment.count({ where })
			]);

			res.status(200).json(
				new ApiResponse("Payments retrieved successfully", {
					payments,
					pagination: {
						page: Number(page),
						limit: Number(limit),
						total,
						pages: Math.ceil(total / Number(limit))
					}
				})
			);
		} catch (error: any) {
			console.error("Error in getPaymentsByBill:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve payments"));
		}
	};

	// Update payment status
	updatePaymentStatus = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { status, notes } = req.body;

			if (!status || !Object.values(PaymentStatus).includes(status)) {
				throw new AppError("Valid payment status is required", 400);
			}

			const payment = await prisma.payment.update({
				where: { id },
				data: {
					status,
					notes: notes || undefined
				},
				include: {
					bill: {
						include: {
							patient: {
								select: {
									id: true,
									name: true,
									patientUniqueId: true
								}
							}
						}
					}
				}
			});

			// If payment status changed to COMPLETED, update bill totals
			if (status === "COMPLETED") {
				const bill = await prisma.bill.findUnique({
					where: { id: payment.billId },
					include: {
						payments: {
							where: { status: "COMPLETED" },
							select: { amount: true }
						}
					}
				});

				if (bill) {
					const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
					const newDueAmount = bill.totalAmount - totalPaid;
					const newStatus = newDueAmount === 0 ? "PAID" : "PARTIALLY_PAID";

					await prisma.bill.update({
						where: { id: payment.billId },
						data: {
							paidAmount: totalPaid,
							dueAmount: newDueAmount,
							status: newStatus
						}
					});
				}
			}

			res
				.status(200)
				.json(new ApiResponse("Payment status updated successfully", payment));
		} catch (error: any) {
			console.error("Error in updatePaymentStatus:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(error.message || "Failed to update payment status")
				);
		}
	};

	// Get payment statistics
	getPaymentStats = async (req: Request, res: Response) => {
		try {
			const hospitalId = req.user?.hospitalId;
			if (!hospitalId) {
				throw new AppError("Hospital ID is required", 400);
			}

			const { startDate, endDate, paymentMethod } = req.query;

			const where: any = {
				bill: { hospitalId }
			};

			if (startDate && endDate) {
				where.paymentDate = {
					gte: new Date(startDate as string),
					lte: new Date(endDate as string)
				};
			}

			if (paymentMethod) {
				where.paymentMethod = paymentMethod;
			}

			const [
				totalPayments,
				completedPayments,
				failedPayments,
				totalAmount,
				amountByMethod
			] = await Promise.all([
				prisma.payment.count({ where }),
				prisma.payment.count({ where: { ...where, status: "COMPLETED" } }),
				prisma.payment.count({ where: { ...where, status: "FAILED" } }),
				prisma.payment.aggregate({
					where: { ...where, status: "COMPLETED" },
					_sum: { amount: true }
				}),
				prisma.payment.groupBy({
					by: ["paymentMethod"],
					where: { ...where, status: "COMPLETED" },
					_sum: { amount: true },
					_count: { id: true }
				})
			]);

			const stats = {
				totalPayments,
				completedPayments,
				failedPayments,
				totalAmount: totalAmount._sum.amount || 0,
				successRate:
					totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
				amountByMethod: amountByMethod.map((method) => ({
					method: method.paymentMethod,
					amount: method._sum.amount || 0,
					count: method._count.id
				}))
			};

			res
				.status(200)
				.json(
					new ApiResponse("Payment statistics retrieved successfully", stats)
				);
		} catch (error: any) {
			console.error("Error in getPaymentStats:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(
						error.message || "Failed to retrieve payment statistics"
					)
				);
		}
	};

	// Refund payment
	refundPayment = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { refundAmount, reason } = req.body;

			const payment = await prisma.payment.findUnique({
				where: { id },
				include: {
					bill: true
				}
			});

			if (!payment) {
				throw new AppError("Payment not found", 404);
			}

			if (payment.status !== "COMPLETED") {
				throw new AppError("Only completed payments can be refunded", 400);
			}

			const refundAmountNum = refundAmount || payment.amount;
			if (refundAmountNum > payment.amount) {
				throw new AppError("Refund amount cannot exceed payment amount", 400);
			}

			// Create refund payment record
			const refundPayment = await prisma.payment.create({
				data: {
					billId: payment.billId,
					amount: -refundAmountNum, // Negative amount for refund
					paymentMethod: payment.paymentMethod,
					transactionId: this.generateTransactionId(),
					status: "REFUNDED",
					notes: `Refund: ${reason || "No reason provided"}`
				}
			});

			// Update original payment status
			await prisma.payment.update({
				where: { id },
				data: {
					status: "REFUNDED",
					notes: `Refunded: ${reason || "No reason provided"}`
				}
			});

			// Update bill totals
			const bill = await prisma.bill.findUnique({
				where: { id: payment.billId },
				include: {
					payments: {
						where: { status: "COMPLETED" },
						select: { amount: true }
					}
				}
			});

			if (bill) {
				const totalPaid = bill.payments.reduce((sum, p) => sum + p.amount, 0);
				const newDueAmount = bill.totalAmount - totalPaid;
				const newStatus = newDueAmount === 0 ? "PAID" : "PARTIALLY_PAID";

				await prisma.bill.update({
					where: { id: payment.billId },
					data: {
						paidAmount: totalPaid,
						dueAmount: newDueAmount,
						status: newStatus
					}
				});
			}

			res.status(200).json(
				new ApiResponse("Payment refunded successfully", {
					refundPayment,
					originalPayment: payment
				})
			);
		} catch (error: any) {
			console.error("Error in refundPayment:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to refund payment"));
		}
	};
}
