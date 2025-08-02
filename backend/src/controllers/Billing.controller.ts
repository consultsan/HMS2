import { Request, Response } from "express";
import { PrismaClient, BillStatus, BillType } from "@prisma/client";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";
import { PDFService } from "../services/pdf.service";
import { join } from "path";
import { readFileSync } from "fs";
import { format } from "date-fns";
import Handlebars from "handlebars";


const prisma = new PrismaClient();

export class BillingController {
	// Register Handlebars helpers
	private static registerHelpers() {
		// Date formatting helpers
		Handlebars.registerHelper('formatDate', (date: Date | string) => {
			if (!date) return 'N/A';
			return format(new Date(date), 'dd MMM yyyy');
		});

		Handlebars.registerHelper('formatDateTime', (date: Date | string) => {
			if (!date) return 'N/A';
			return format(new Date(date), 'dd MMM yyyy, hh:mm a');
		});

		Handlebars.registerHelper('formatDateFull', (date: Date | string) => {
			if (!date) return 'N/A';
			return format(new Date(date), 'PPP');
		});

		Handlebars.registerHelper('formatDateTimeFull', (date: Date | string) => {
			if (!date) return 'N/A';
			return format(new Date(date), 'PPpp');
		});

		// Currency formatting
		Handlebars.registerHelper('formatCurrency', (amount: number) => {
			if (typeof amount !== 'number') return '0.00';
			return amount.toFixed(2);
		});

		// Status class helper
		Handlebars.registerHelper('statusClass', (status: string) => {
			switch (status?.toLowerCase()) {
				case 'paid':
					return 'paid';
				case 'partially_paid':
					return 'partially-paid';
				default:
					return 'unpaid';
			}
		});

		// Increment helper for array indices
		Handlebars.registerHelper('inc', (value: number) => {
			return parseInt(value.toString()) + 1;
		});

		// Lowercase helper
		Handlebars.registerHelper('lowercase', (str: string) => {
			return str?.toLowerCase() || '';
		});

		// Equality helper
		Handlebars.registerHelper('eq', (a: any, b: any) => {
			return a === b;
		});

		// Not equal helper
		Handlebars.registerHelper('ne', (a: any, b: any) => {
			return a !== b;
		});

		// Replace helper
		Handlebars.registerHelper('replace', (str: string, find: string, replace: string) => {
			if (!str) return str;
			return str.replace(new RegExp(find, 'g'), replace);
		});
	}
	// Generate unique bill number
	private generateBillNumber(): string {
		const timestamp = Date.now().toString();
		const random = Math.random().toString(36).substring(2, 8).toUpperCase();
		return `BILL-${timestamp}-${random}`;
	}

	// Create a new bill
	createBill = async (req: Request, res: Response) => {
		try {
			const { patientId, hospitalId, appointmentId, items, dueDate, paidAmount, dueAmount, status, billDate, notes } =
				req.body;

			// Validate required fields
			if (!patientId || !hospitalId || !items || !Array.isArray(items)) {
				throw new AppError(
					"Patient ID, Hospital ID, and items array are required",
					400
				);
			}

			// Calculate totals
			let totalAmount = 0;
			const billItems = [];

			for (const item of items) {
				const itemTotal = item.unitPrice * item.quantity - item.discountAmount;
				totalAmount += itemTotal;
				billItems.push({
					itemType: item.itemType,
					description: item.description,
					quantity: item.quantity,
					unitPrice: item.unitPrice,
					totalPrice: itemTotal,
					discountAmount: item.discountAmount,
					notes: item.notes,
					labTestId: item.labTestId,
					surgeryId: item.surgeryId
				});
			}

			// Create bill with items
			const bill = await prisma.bill.create({
				data: {
					billNumber: this.generateBillNumber(),
					patientId,
					hospitalId,
					appointmentId,
					totalAmount,
					dueAmount: dueAmount,
					paidAmount: paidAmount,
					status: status,
					billDate: billDate ? new Date(billDate) : new Date(),
					dueDate: dueDate ? new Date(dueDate) : new Date(),
					notes,
					billItems: {
						create: billItems
					}
				},
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
					billItems: true,
					payments: true
				}
			});

			res.status(201).json(new ApiResponse("Bill created successfully", bill));
		} catch (error: any) {
			console.error("Error in createBill:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to create bill"));
		}
	};

	// Get bill by ID
	getBillById = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const bill = await prisma.bill.findUnique({
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
					},
					hospital: {
						select: {
							id: true,
							name: true,
							address: true
						}
					},
					billItems: {
						include: {
							labTest: {
								include: {
									labTest: true
								}
							},
							surgery: true
						}
					},
					payments: {
						orderBy: {
							paymentDate: "desc"
						}
					},
					appointment: {
						select: {
							id: true,
							scheduledAt: true,
							visitType: true,
							doctor: {
								select: {
									id: true,
									name: true,
									specialisation: true
								}
							}
						}
					}
				}
			});

			if (!bill) {
				throw new AppError("Bill not found", 404);
			}

			res
				.status(200)
				.json(new ApiResponse("Bill retrieved successfully", bill));
		} catch (error: any) {
			console.error("Error in getBillById:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve bill"));
		}
	};

	// Get bills by patient
	getBillsByPatient = async (req: Request, res: Response) => {
		try {
			const { patientId } = req.params;
			const { status, page = 1, limit = 10 } = req.query;

			const skip = (Number(page) - 1) * Number(limit);

			const where: any = { patientId };
			if (status) {
				where.status = status;
			}

			const [bills, total] = await Promise.all([
				prisma.bill.findMany({
					where,
					include: {
						hospital: {
							select: {
								id: true,
								name: true
							}
						},
						billItems: true,
						payments: {
							select: {
								amount: true,
								status: true
							}
						}
					},
					orderBy: {
						billDate: "desc"
					},
					skip,
					take: Number(limit)
				}),
				prisma.bill.count({ where })
			]);

			res.status(200).json(
				new ApiResponse("Bills retrieved successfully", {
					bills,
					pagination: {
						page: Number(page),
						limit: Number(limit),
						total,
						pages: Math.ceil(total / Number(limit))
					}
				})
			);
		} catch (error: any) {
			console.error("Error in getBillsByPatient:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve bills"));
		}
	};

	// Get bills by hospital
	getBillsByHospital = async (req: Request, res: Response) => {
		try {
			const hospitalId = req.user?.hospitalId;
			if (!hospitalId) {
				throw new AppError("Hospital ID is required", 400);
			}

			const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

			const skip = (Number(page) - 1) * Number(limit);

			const where: any = { hospitalId };
			if (status) {
				where.status = status;
			}
			if (startDate && endDate) {
				where.billDate = {
					gte: new Date(startDate as string),
					lte: new Date(endDate as string)
				};
			}

			const [bills, total] = await Promise.all([
				prisma.bill.findMany({
					where,
					include: {
						patient: {
							select: {
								id: true,
								name: true,
								patientUniqueId: true,
								phone: true
							}
						},
						billItems: true,
						payments: {
							select: {
								amount: true,
								status: true
							}
						}
					},
					orderBy: {
						billDate: "desc"
					},
					skip,
					take: Number(limit)
				}),
				prisma.bill.count({ where })
			]);

			res.status(200).json(
				new ApiResponse("Bills retrieved successfully", {
					bills,
					pagination: {
						page: Number(page),
						limit: Number(limit),
						total,
						pages: Math.ceil(total / Number(limit))
					}
				})
			);
		} catch (error: any) {
			console.error("Error in getBillsByHospital:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to retrieve bills"));
		}
	};

	// Update bill status
	updateBillStatus = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { status, notes } = req.body;

			if (!status || !Object.values(BillStatus).includes(status)) {
				throw new AppError("Valid status is required", 400);
			}

			const bill = await prisma.bill.update({
				where: { id },
				data: {
					status,
					notes: notes || undefined
				},
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
					billItems: true,
					payments: true
				}
			});

			res
				.status(200)
				.json(new ApiResponse("Bill status updated successfully", bill));
		} catch (error: any) {
			console.error("Error in updateBillStatus:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to update bill status"));
		}
	};

	// Add item to existing bill
	addBillItem = async (req: Request, res: Response) => {
		try {
			const { billId } = req.params;
			const {
				itemType,
				description,
				quantity,
				unitPrice,
				notes,
				labTestId,
				surgeryId,
				discountAmount
			} = req.body;

			// Validate required fields
			if (!itemType || !description || !quantity || !unitPrice) {
				throw new AppError(
					"Item type, description, quantity, and unit price are required",
					400
				);
			}

			const totalPrice = quantity * unitPrice - discountAmount;

			// Create bill item
			const billItem = await prisma.billItem.create({
				data: {
					billId,
					itemType,
					description,
					quantity,
					unitPrice,
					totalPrice,
					notes,
					labTestId,
					surgeryId,
					discountAmount
				}
			});

			// Update bill totals
			const bill = await prisma.bill.findUnique({
				where: { id: billId },
				include: {
					billItems: true,
					payments: {
						select: {
							amount: true
						}
					}
				}
			});

			if (bill) {
				const newTotalAmount = bill.billItems.reduce(
					(sum, item) => sum + item.totalPrice,
					0
				);
				const totalPaid = bill.payments.reduce(
					(sum, payment) => sum + payment.amount,
					0
				);
				const newDueAmount = newTotalAmount - totalPaid;

				await prisma.bill.update({
					where: { id: billId },
					data: {
						totalAmount: newTotalAmount,
						dueAmount: newDueAmount
					}
				});
			}
			res
				.status(201)
				.json(new ApiResponse("Bill item added successfully", billItem));
		} catch (error: any) {
			console.error("Error in addBillItem:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to add bill item"));
		}
	};

	exportBillPDF = async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			// Get bill with all related data
			const bill = await prisma.bill.findUnique({
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
					},
					hospital: {
						select: {
							id: true,
							name: true,
							address: true
						}
					},
					billItems: {
						include: {
							labTest: {
								include: {
									labTest: true
								}
							},
							surgery: true
						}
					},
					payments: {
						orderBy: {
							paymentDate: "desc"
						}
					},
					appointment: {
						select: {
							id: true,
							scheduledAt: true,
							visitType: true,
							doctor: {
								select: {
									id: true,
									name: true,
									specialisation: true
								}
							}
						}
					}
				}
			});

			if (!bill) {
				throw new AppError("Bill not found", 404);
			}

			// Generate PDF
			const pdfBuffer = await PDFService.generateBillPDF(bill as any);

			// Set response headers for PDF download
			res.setHeader("Content-Type", "application/pdf");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=bill-${bill.billNumber}.pdf`
			);
			res.send(pdfBuffer);
		} catch (error: any) {
			console.error("Error in exportBillPDF:", error);
			res
				.status(error.code || 500)
				.json(new ApiResponse(error.message || "Failed to export bill PDF"));
		}
	};

	// Get billing statistics
	getBillingStats = async (req: Request, res: Response) => {
		try {
			const hospitalId = req.user?.hospitalId;
			if (!hospitalId) {
				throw new AppError("Hospital ID is required", 400);
			}

			const { startDate, endDate } = req.query;

			const where: any = { hospitalId };
			if (startDate && endDate) {
				where.billDate = {
					gte: new Date(startDate as string),
					lte: new Date(endDate as string)
				};
			}

			const [totalBills, paidBills, pendingBills, totalRevenue, pendingAmount] =
				await Promise.all([
					prisma.bill.count({ where }),
					prisma.bill.count({ where: { ...where, status: "PAID" } }),
					prisma.bill.count({
						where: {
							...where,
							status: { in: ["GENERATED", "SENT", "OVERDUE"] }
						}
					}),
					prisma.bill.aggregate({
						where: { ...where, status: "PAID" },
						_sum: { totalAmount: true }
					}),
					prisma.bill.aggregate({
						where: {
							...where,
							status: { in: ["GENERATED", "SENT", "OVERDUE"] }
						},
						_sum: { dueAmount: true }
					})
				]);

			const stats = {
				totalBills,
				paidBills,
				pendingBills,
				totalRevenue: totalRevenue._sum.totalAmount || 0,
				pendingAmount: pendingAmount._sum.dueAmount || 0,
				paymentRate: totalBills > 0 ? (paidBills / totalBills) * 100 : 0
			};

			res
				.status(200)
				.json(
					new ApiResponse("Billing statistics retrieved successfully", stats)
				);
		} catch (error: any) {
			console.error("Error in getBillingStats:", error);
			res
				.status(error.code || 500)
				.json(
					new ApiResponse(
						error.message || "Failed to retrieve billing statistics"
					)
				);
		}
	};

	getHtmlTemplate = async (req: Request, res: Response) => {
		BillingController.registerHelpers(); // Register Handlebars helpers
		try {
			const { id } = req.params;

			// Get bill with all related data
			const bill = await prisma.bill.findUnique({
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
					},
					hospital: {
						select: {
							id: true,
							name: true,
							address: true
						}
					},
					billItems: {
						include: {
							labTest: {
								include: {
									labTest: true
								}
							},
							surgery: true
						}
					},
					payments: {
						orderBy: {
							paymentDate: "desc"
						}
					},
					appointment: {
						select: {
							id: true,
							scheduledAt: true,
							visitType: true,
							doctor: {
								select: {
									id: true,
									name: true,
									specialisation: true
								}
							}
						}
					}
				}
			});

			if (!bill) {
				throw new AppError("Bill not found", 404);
			}


			// Read the template file
			const templatePath = join(__dirname, "../templates/bill-template.html");
			let templateContent = readFileSync(templatePath, "utf-8");

			// Add print-specific styles to hide header and footer
			const printStyles = `
			<style>
				@media print {
				@page {
					margin-top: 5.08cm;
					margin-bottom: 2.54cm;
					margin-left:1cm;
					margin-right:2cm;
				}
				.header,
				.footer {
					display: none !important;
				}

				.patient-info {
					display: flex !important;
					flex-wrap: wrap !important;
					gap: 1.5rem !important;
				}

				.patient-info > div {
					width: 48% !important;
				}

				.bill-details-flex {
					flex-direction: row !important;
					flex-wrap: wrap !important;
					gap: 1.5rem !important;
				}

				.bill-details-flex > div {
					width: 30% !important;
				}
		}
			</style>
			`;


			// Insert print styles before </head>
			templateContent = templateContent.replace('</head>', `${printStyles}</head>`);

			// Compile template
			const template = Handlebars.compile(templateContent);

			// Prepare data for template
			const logoUrl = "/True-Hospital-Logo(White).png";

			const templateData = {
				...bill,
				currentDate: new Date(),
				logoUrl
			};


			// Generate HTML
			const html = template(templateData);

			// Send HTML response
			res.setHeader('Content-Type', 'text/html');
			res.send(html);

		} catch (error: any) {
			console.error("Error generating HTML:", error);
			res.status(error.statusCode || 500).json(
				new ApiResponse(error.message || "Error generating HTML")
			);
		}
	}
}
