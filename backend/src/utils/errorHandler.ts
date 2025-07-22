import { Response } from "express";
import ApiResponse from "./ApiResponse";

const errorHandler = (error: any, res: Response) => {
	console.error(error);

	let statusCode = 500;
	let message = error.message || "Internal Server Error";

	// Handle Prisma errors
	if (error.code) {
		switch (error.code) {
			case 'P2025':
				statusCode = 404;
				message = "Record not found";
				break;
			case 'P2002':
				statusCode = 409;
				message = "Duplicate entry";
				break;
			case 'P2014':
				statusCode = 400;
				message = "Invalid input data";
				break;
			case 'P2003':
				statusCode = 400;
				message = "Foreign key constraint failed";
				break;
			default:
				// If it's a valid HTTP status code, use it
				if (typeof error.code === 'number' && error.code >= 100 && error.code < 600) {
					statusCode = error.code;
				}
				break;
		}
	} else if (error.statusCode) {
		statusCode = error.statusCode;
	}

	res
		.status(statusCode)
		.json(new ApiResponse(message));
};

export default errorHandler;
