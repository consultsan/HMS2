import AppError from "./AppError";
import ms from "ms";
import jwt from "jsonwebtoken";

export interface JwtPayload {
	id: string;
	email: string;
	role: string;
	hospitalId?: string;
}

class Token {
	private _secret: string;
	static expiry: number | undefined = ms("2h");
	constructor() {
		if (!process.env.JWT_SECRET)
			throw new AppError("JWT_SECRET environment variable is not set", 500);
		this._secret = process.env.JWT_SECRET;
	}

	encrypt(data: JwtPayload): string {
		return jwt.sign(data, this._secret, { expiresIn: Token.expiry });
	}

	decrypt(token: string): JwtPayload {
		try {
			const decoded = jwt.verify(token, this._secret) as JwtPayload;
			return decoded;
		} catch (error) {
			throw new AppError("Invalid token", 401);
		}
	}
}

export default Token;
