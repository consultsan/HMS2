import { Request, Response, NextFunction } from "express";
import Token from "../utils/Token";
import { JwtPayload } from "../utils/Token";

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
		const obj = new Token().decrypt(token);
		if (obj) {
			// have valid access token
			req.user = obj;
		}
	}
	next();
};
