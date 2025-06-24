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
	const { accessToken } = req.cookies;
	if (accessToken) {
		// have access token
		const obj = new Token().decrypt(accessToken);
		if (obj) {
			// have valid access token
			req.user = obj;
		}
	}
	next();
};
