import { Request, Response } from "express";
import prisma from "../utils/dbConfig";
import ApiResponse from "../utils/ApiResponse";
import errorHandler from "../utils/errorHandler";
import AppError from "../utils/AppError";
import s3 from "../services/s3client";

// Lab Test Controllers
const createLabTest = async (req: Request, res: Response) => {
	try {
		const { code, name, description, sampleType, charge } = req.body;
		const labTest = await prisma.labTest.create({
			data: {
				code,
				name,
				description,
				charge,
				sampleType
			}
		});
		res
			.status(201)
			.json(new ApiResponse("Lab test created successfully", labTest));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getLabTests = async (req: Request, res: Response) => {
	try {
		const labTests = await prisma.labTest.findMany({
			include: {
				parameters: true
			},
			orderBy: {
				createdAt: "desc"
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Lab tests fetched successfully", labTests));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getLabTestById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const labTest = await prisma.labTest.findUnique({
			where: { id },
			include: {
				parameters: true
			}
		});
		if (!labTest) {
			return res.status(404).json(new ApiResponse("Lab test not found", null));
		}
		res
			.status(200)
			.json(new ApiResponse("Lab test fetched successfully", labTest));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const updateLabTest = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { code, name, description, sampleType, charge } = req.body;
		const labTest = await prisma.labTest.update({
			where: { id },
			data: {
				code,
				name,
				description,
				sampleType,
				charge
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Lab test updated successfully", labTest));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const deleteLabTest = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await prisma.labTest.delete({
			where: { id }
		});
		res
			.status(200)
			.json(new ApiResponse("Lab test deleted successfully", null));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

// Lab Test Parameter Controllers
const createParameter = async (req: Request, res: Response) => {
	try {
		const { labTestId, name, unit, lowerLimit, upperLimit } = req.body;
		const parameter = await prisma.labTestParameter.create({
			data: {
				labTestId,
				name,
				unit,
				lowerLimit,
				upperLimit
			}
		});
		res
			.status(201)
			.json(new ApiResponse("Parameter created successfully", parameter));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getParametersByLabTest = async (req: Request, res: Response) => {
	try {
		const { labTestId } = req.params;
		const parameters = await prisma.labTestParameter.findMany({
			where: { labTestId },
			orderBy: {
				createdAt: "desc"
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Parameters fetched successfully", parameters));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getParameterById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const parameter = await prisma.labTestParameter.findUnique({
			where: { id }
		});
		if (!parameter) {
			return res.status(404).json(new ApiResponse("Parameter not found", null));
		}
		res
			.status(200)
			.json(new ApiResponse("Parameter fetched successfully", parameter));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const updateParameter = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { name, unit, lowerLimit, upperLimit } = req.body;
		const parameter = await prisma.labTestParameter.update({
			where: { id },
			data: {
				name,
				unit,
				lowerLimit,
				upperLimit
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Parameter updated successfully", parameter));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const deleteParameter = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await prisma.labTestParameter.delete({
			where: { id }
		});
		res
			.status(200)
			.json(new ApiResponse("Parameter deleted successfully", null));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

// Lab Test Order Controllers
const createLabOrder = async (req: Request, res: Response) => {
	try {
		const { patientId, appointmentId, appointmentLabTestIds, notes, urgentOrder } = req.body;

		// Create the lab order first
		const labOrder = await prisma.labOrder.create({
			data: {
				patientId,
				appointmentId,
				notes,
				urgentOrder
			}
		});

		// Update the appointment lab tests to link them to this lab order
		if (appointmentLabTestIds && appointmentLabTestIds.length > 0) {
			await prisma.appointmentLabTest.updateMany({
				where: {
					id: {
						in: appointmentLabTestIds
					}
				},
				data: {
					labOrderId: labOrder.id,
					patientId: patientId // Ensure patientId is set for each lab test
				}
			});
		}

		// Fetch the complete lab order with all relations
		const completeLabOrder = await prisma.labOrder.findUnique({
			where: { id: labOrder.id },
			include: {
				appointment: true,
				patient: true,
				appointmentLabTests: {
					include: {
						labTest: true
					}
				}
			}
		});

		res
			.status(201)
			.json(new ApiResponse("Lab order created successfully", completeLabOrder));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const createExternalLabOrder = async (req: Request, res: Response) => {
	try {
		const { patientId, appointmentId, labTestIds, notes, urgentOrder } = req.body;

		if (!patientId || !labTestIds || !Array.isArray(labTestIds) || labTestIds.length === 0) {
			return res.status(400).json(new ApiResponse("Patient ID and lab test IDs are required", null));
		}

		// Create appointment lab test orders for each lab test (external referral)
		const createdLabTests = await Promise.all(
			labTestIds.map((labTestId: string) =>
				prisma.appointmentLabTest.create({
					data: {
						patientId,
						appointmentId: appointmentId || null,
						labTestId,
						referredFromOutside: true,
						status: "PENDING"
					}
				})
			)
		);

		// Create a lab order to group these external tests
		const labOrder = await prisma.labOrder.create({
			data: {
				patientId,
				appointmentId: appointmentId || null,
				orderedBy: "External Referral",
				notes: notes || "External lab order",
				urgentOrder: urgentOrder || false
			}
		});

		// Link the created lab tests to the lab order
		await prisma.appointmentLabTest.updateMany({
			where: {
				id: {
					in: createdLabTests.map(test => test.id)
				}
			},
			data: {
				labOrderId: labOrder.id
			}
		});

		// Fetch the complete lab order with all relations
		const completeLabOrder = await prisma.labOrder.findUnique({
			where: { id: labOrder.id },
			include: {
				appointment: true,
				patient: true,
				appointmentLabTests: {
					include: {
						labTest: true
					}
				}
			}
		});

		res
			.status(201)
			.json(new ApiResponse("External lab order created successfully", completeLabOrder));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const updateLabOrder = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { status, notes, orderedBy, orderDate, urgentOrder, billId } = req.body;

		console.log('Attempting to update lab order:', id, 'with data:', { status, notes, orderedBy, orderDate, urgentOrder, billId });

		// First check if the lab order exists
		const existingLabOrder = await prisma.labOrder.findUnique({
			where: { id }
		});

		if (!existingLabOrder) {
			console.log('Lab order not found with ID:', id);
			return res.status(404).json(new ApiResponse("Lab order not found", null));
		}

		console.log('Found existing lab order:', existingLabOrder.id);

		const labOrder = await prisma.labOrder.update({
			where: { id },
			data: { status, notes, orderedBy, orderDate, urgentOrder, billId }
		});

		console.log('Successfully updated lab order:', labOrder.id);
		res
			.status(200)
			.json(new ApiResponse("Lab order updated successfully", labOrder));
	} catch (error: any) {
		console.error('Error updating lab order:', error);

		// Handle Prisma specific errors
		if (error.code === 'P2025') {
			return res.status(404).json(new ApiResponse("Lab order not found", null));
		}

		errorHandler(error, res);
	}
};

const getInternalLabOrderByHospital = async (req: Request, res: Response) => {
	try {
		const { hospitalId } = req.user as { hospitalId: string };

		// Get internal lab orders (those with appointments)
		const labOrders = await prisma.labOrder.findMany({
			where: {
				OR: [
					{ appointment: { hospitalId } },
					{ patient: { hospitalId } }
				],
				appointmentId: { not: null } // Internal orders have appointments
			},
			include: {
				appointment: {
					include: {
						patient: true,
						doctor: {
							select: {
								id: true,
								name: true
							}
						}
					}
				},
				patient: true,
				appointmentLabTests: {
					include: {
						labTest: true
					}
				}
			},
			orderBy: {
				createdAt: "desc"
			}
		});

		res
			.status(200)
			.json(new ApiResponse("Internal lab orders fetched successfully", labOrders));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getExternalLabOrderByHospital = async (req: Request, res: Response) => {
	try {
		const { hospitalId } = req.user as { hospitalId: string };

		// Get external lab orders (those without appointments or referred from outside)
		const labOrders = await prisma.labOrder.findMany({
			where: {
				patient: { hospitalId },
				appointmentId: null // External orders don't have appointments
			},
			include: {
				patient: true,
				appointmentLabTests: {
					include: {
						labTest: true
					}
				}
			},
			orderBy: {
				createdAt: "desc"
			}
		});

		res
			.status(200)
			.json(new ApiResponse("External lab orders fetched successfully", labOrders));
	} catch (error: any) {
		errorHandler(error, res);
	}
};
const orderLabTest = async (req: Request, res: Response) => {
	try {
		const {
			appointmentId,
			labTestId,
			sampleType,
			referredFromOutside,
			patientId
		} = req.body;
		if (referredFromOutside) {
			const order = await prisma.appointmentLabTest.create({
				data: {
					patientId, 
					labTestId,
					referredFromOutside
				},
				include: {
					labTest: true
				}
			});
			res
				.status(201)
				.json(new ApiResponse("Lab test ordered successfully", order));
		} else {
			const order = await prisma.appointmentLabTest.create({
				data: {
					appointmentId,
					labTestId
				},
				include: {
					labTest: true
				}
			});
			res
				.status(201)
				.json(new ApiResponse("Lab test ordered successfully", order));
		}
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getOrderedTestsByAppointment = async (req: Request, res: Response) => {
	try {
		const { appointmentId } = req.params;
		const orders = await prisma.appointmentLabTest.findMany({
			where: { appointmentId },
			include: {
				labTest: true,
				results: {
					include: {
						parameter: true
					}
				}
			},
			orderBy: {
				createdAt: "desc"
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Lab test orders fetched successfully", orders));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getOrderedTestsByPatient = async (req: Request, res: Response) => {
	try {
		const { patientId } = req.params;
		const orders = await prisma.appointmentLabTest.findMany({
			where: { patientId },
			include: {
				labTest: true,
				results: {
					include: {
						parameter: true
					}
				}
			},
			orderBy: {
				createdAt: "desc"
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Lab test orders fetched successfully", orders));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getOrderedTestById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const order = await prisma.appointmentLabTest.findUnique({
			where: { id },
			include: {
				labTest: true,
				results: {
					include: {
						parameter: true
					}
				}
			}
		});
		if (!order) {
			return res
				.status(404)
				.json(new ApiResponse("Lab test order not found", null));
		}
		res
			.status(200)
			.json(new ApiResponse("Lab test order fetched successfully", order));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getOrderedTestByHospital = async (req: Request, res: Response) => {
	try {
		const { hospitalId } = req.user as { hospitalId: string };
		const orders = await prisma.appointmentLabTest.findMany({
			where: {
				OR: [{ appointment: { hospitalId } }, { patient: { hospitalId } }]
			},
			include: {
				appointment: {
					include: {
						patient: true
					}
				},
				patient: true,
				labTest: true
			},
			orderBy: {
				createdAt: "desc"
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Lab test orders fetched successfully", orders));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const updateLabTestOrder = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { sampleType, tentativeReportDate, status } = req.body;
		const order = await prisma.appointmentLabTest.update({
			where: { id },
			data: {
				status,
				tentativeReportDate: tentativeReportDate
					? new Date(tentativeReportDate)
					: null
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Lab test order updated successfully", order));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const cancelLabTestOrder = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await prisma.appointmentLabTest.delete({
			where: { id }
		});
		res
			.status(200)
			.json(new ApiResponse("Lab test order cancelled successfully", null));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const markTestSentExternal = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { externalLabName } = req.body;
		const order = await prisma.appointmentLabTest.update({
			where: { id },
			data: {
				isSentExternal: true,
				externalLabName,
				status: "SENT_EXTERNAL"
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Lab test marked as sent to external lab", order));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const attachReportToOrder = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { attachmentId } = req.body;
		const result = await prisma.appointmentLabTestResult.update({
			where: { id },
			data: {
				attachmentId
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Report attached successfully", result));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

// Lab Test Result Controllers
const recordTestResult = async (req: Request, res: Response) => {
	try {
		const { appointmentLabTestId, parameterId, value, unitOverride, notes } =
			req.body;
		const result = await prisma.appointmentLabTestResult.create({
			data: {
				appointmentLabTestId,
				parameterId,
				value,
				unitOverride,
				notes
			}
		});
		res
			.status(201)
			.json(new ApiResponse("Test result recorded successfully", result));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getResultsByOrder = async (req: Request, res: Response) => {
	try {
		const { appointmentLabTestId } = req.params;
		const results = await prisma.appointmentLabTestResult.findMany({
			where: { appointmentLabTestId },
			include: {
				parameter: true
			},
			orderBy: {
				createdAt: "desc"
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Test results fetched successfully", results));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getResultById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const result = await prisma.appointmentLabTestResult.findUnique({
			where: { id },
			include: {
				parameter: true
			}
		});
		if (!result) {
			return res
				.status(404)
				.json(new ApiResponse("Test result not found", null));
		}
		res
			.status(200)
			.json(new ApiResponse("Test result fetched successfully", result));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const updateTestResult = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { value, unitOverride, notes } = req.body;
		const result = await prisma.appointmentLabTestResult.update({
			where: { id },
			data: {
				value,
				unitOverride,
				notes
			}
		});
		res
			.status(200)
			.json(new ApiResponse("Test result updated successfully", result));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const deleteTestResult = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		await prisma.appointmentLabTestResult.delete({
			where: { id }
		});
		res
			.status(200)
			.json(new ApiResponse("Test result deleted successfully", null));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getLabTestAttachmentsByAppointmentLabTestId = async (
	req: Request,
	res: Response
) => {
	try {
		const { id } = req.params;
		const attachments = await prisma.appointmentLabTestAttachment.findMany({
			where: { appointmentLabTestId: id },
			select: {
				url: true
			},
			orderBy: {
				createdAt: "desc"
			}
		});
		res
			.status(200)
			.json(
				new ApiResponse(
					"Lab test attachments fetched successfully",
					attachments
				)
			);
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const uploadLabTestAttachment = async (req: Request, res: Response) => {
	try {
		const { appointmentLabTestId } = req.query as {
			appointmentLabTestId: string;
		};
		const file = req.file;

		if (!file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const s3Url = await s3.uploadStream(
			file.buffer,
			file.originalname,
			file.mimetype
		);

		// Clear the buffer to free memory
		// TypeScript: file.buffer is Buffer, so set to Buffer.alloc(0) instead of null
		file.buffer = Buffer.alloc(0);

		const attachment = await prisma.appointmentLabTestAttachment.create({
			data: {
				appointmentLabTestId,
				url: s3Url
			}
		});
		res
			.status(201)
			.json(
				new ApiResponse("Lab test attachment uploaded successfully", attachment)
			);
	} catch (error: any) {
		errorHandler(error, res);
	}
};

// Lab Test Billing Controllers
const generateLabTestBill = async (req: Request, res: Response) => {
	try {
		const { appointmentLabTestId } = req.params;
		const { dueDate, notes } = req.body;

		// Get lab test order details
		const labTestOrder = await prisma.appointmentLabTest.findUnique({
			where: { id: appointmentLabTestId },
			include: {
				labTest: true,
				appointment: {
					include: {
						patient: true,
						hospital: true
					}
				}
			}
		});

		if (!labTestOrder) {
			throw new AppError("Lab test order not found", 404);
		}

		// Get lab charge for this test
		const labCharge = await prisma.labCharge.findFirst({
			where: {
				test: labTestOrder.labTest.name,
				hospitalId: labTestOrder.appointment?.hospitalId
			}
		});

		if (!labCharge) {
			throw new AppError("Lab charge not found for this test", 404);
		}

		// Check if bill already exists for this lab test
		const existingBillItem = await prisma.billItem.findFirst({
			where: { labTestId: appointmentLabTestId }
		});

		if (existingBillItem) {
			throw new AppError("Bill already exists for this lab test", 400);
		}

		// Generate bill number
		const timestamp = Date.now().toString();
		const random = Math.random().toString(36).substring(2, 8).toUpperCase();
		const billNumber = `BILL-${timestamp}-${random}`;

		// Create bill with lab test item
		const bill = await prisma.bill.create({
			data: {
				billNumber,
				patientId: labTestOrder.appointment?.patientId || "",
				hospitalId: labTestOrder.appointment?.hospitalId || "",
				appointmentId: labTestOrder.appointmentId,
				totalAmount: labCharge.amount,
				dueAmount: labCharge.amount,
				dueDate: dueDate ? new Date(dueDate) : null,
				notes,
				billItems: {
					create: {
						itemType: "LAB_TEST",
						description: labTestOrder.labTest.name,
						quantity: 1,
						unitPrice: labCharge.amount,
						totalPrice: labCharge.amount,
						notes: `Lab test: ${labTestOrder.labTest.name}`,
						labTestId: appointmentLabTestId
					}
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
				billItems: {
					include: {
						labTest: {
							include: {
								labTest: true
							}
						}
					}
				}
			}
		});

		res
			.status(201)
			.json(new ApiResponse("Lab test bill generated successfully", bill));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

const getLabTestBilling = async (req: Request, res: Response) => {
	try {
		const { appointmentLabTestId } = req.params;

		const billItem = await prisma.billItem.findFirst({
			where: { labTestId: appointmentLabTestId },
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
						},
						payments: {
							orderBy: {
								paymentDate: "desc"
							}
						}
					}
				},
				labTest: {
					include: {
						labTest: true
					}
				}
			}
		});

		if (!billItem) {
			return res
				.status(200)
				.json(new ApiResponse("No bill found for this lab test", null));
		}

		res
			.status(200)
			.json(
				new ApiResponse("Lab test billing retrieved successfully", billItem)
			);
	} catch (error: any) {
		errorHandler(error, res);
	}
};
//Lab Kpis
const getLabKpisByInterval = async (req: Request, res: Response) => {
	try {
		const { hospitalId } = req.user as { hospitalId: string };
		const { startDate, endDate } = req.query as { startDate: string, endDate: string };
		const startDateTime = new Date(startDate);
		const endDateTime = new Date(endDate as string);
		startDateTime.setUTCHours(0, 0, 0, 0);
		endDateTime.setUTCHours(23, 59, 59, 999);
		const [
			internalTests,
			externalTests,
			pendingTests,
			processingTests,
			completedTests
		] = await Promise.all([
			// Internal tests: appointmentId is not null
			prisma.appointmentLabTest.count({
				where: {
					AND: [
						{ appointment: { hospitalId } },
						{ createdAt: { gte: new Date(startDateTime), lte: new Date(endDateTime) } }
					],
					appointmentId: { not: null }
				}
			}),
			// External tests: appointmentId is null or referredFromOutside is true
			prisma.appointmentLabTest.count({
				where: {
					AND: [
						{ patient: { hospitalId } },
						{ createdAt: { gte: new Date(startDateTime), lte: new Date(endDateTime) } }
					],
					OR: [
						{ appointmentId: null },
						{ referredFromOutside: true }
					]
				}
			}),
			// Pending tests
			prisma.appointmentLabTest.count({
				where: {
					patient: { hospitalId },
					createdAt: { gte: new Date(startDateTime), lte: new Date(endDateTime) },
					status: "PENDING"
				}
			}),
			// Processing tests
			prisma.appointmentLabTest.count({
				where: {
					patient: { hospitalId },
					createdAt: { gte: new Date(startDateTime), lte: new Date(endDateTime) },
					status: "PROCESSING"
				}
			}),
			// Completed tests
			prisma.appointmentLabTest.count({
				where: {
					patient: { hospitalId },
					createdAt: { gte: new Date(startDateTime), lte: new Date(endDateTime)},
					status: "COMPLETED"
				}
				
			})
		]);

		const kpis = {
			internalTests,
			externalTests,
			pendingTests,
			processingTests,
			completedTests
		};

		res.status(200).json(new ApiResponse("Lab KPIs fetched successfully", kpis));
	} catch (error: any) {
		errorHandler(error, res);
	}
};

export {
	// Lab Test Controllers
	createLabTest,
	getLabTests,
	getLabTestById,
	updateLabTest,
	deleteLabTest,

	// Lab Test Parameter Controllers
	createParameter,
	getParametersByLabTest,
	getParameterById,
	updateParameter,
	deleteParameter,

	// Lab Test Order Controllers
	createLabOrder,
	createExternalLabOrder,
	getInternalLabOrderByHospital,
	getExternalLabOrderByHospital,
	updateLabOrder,
	orderLabTest,
	getOrderedTestsByAppointment,
	getOrderedTestsByPatient,
	getOrderedTestById,
	updateLabTestOrder,
	cancelLabTestOrder,
	markTestSentExternal,
	attachReportToOrder,
	getOrderedTestByHospital,

	// Lab Test Result Controllers
	recordTestResult,
	getResultsByOrder,
	getResultById,
	updateTestResult,
	deleteTestResult,

	// Lab Test Attachment Controllers
	uploadLabTestAttachment,
	getLabTestAttachmentsByAppointmentLabTestId,

	// Lab Test Billing Controllers
	generateLabTestBill,
	getLabTestBilling,
	// Lab Test KPIs	
	getLabKpisByInterval
};