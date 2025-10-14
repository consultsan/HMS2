import { Request, Response, NextFunction } from "express";
import Token from "../utils/Token";
import { JwtPayload } from "../utils/Token";
import ApiResponse from "../utils/ApiResponse";

declare global {
	// Extend the Express Request interface to include user property
	namespace Express {
		interface Request {
			user?: JwtPayload;
		}
	}
}

export const authMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith('Bearer ')) {
		const token = authHeader.substring(7); // Remove 'Bearer ' prefix
		try {
			const obj = new Token().decrypt(token);
			if (obj) {
				// have valid access token
				req.user = obj;
				return next();
			}
		} catch (error) {
			// Token is invalid or expired
			return res.status(401).json(new ApiResponse("Invalid or expired token"));
		}
	}
	// No token or invalid token
	return res.status(401).json(new ApiResponse("Authentication required"));
};
