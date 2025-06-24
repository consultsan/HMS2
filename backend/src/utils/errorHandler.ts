import { Response } from "express";
import ApiResponse from "./ApiResponse";

const errorHandler = (error: any, res: Response) => {
	console.error(error);
	res
		.status(error.code || 500)
		.json(new ApiResponse(error.message || "Internal Server Error"));
};

export default errorHandler;
