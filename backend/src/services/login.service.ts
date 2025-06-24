import Token from "../utils/Token";
import AppError from "../utils/AppError";
import { SuperAdminRepository } from "../repositories/SuperAdmin.repository";
import { HospitalAdminRepository } from "../repositories/HospitalAdmin.repository";
import { HospitalStaffRepository } from "../repositories/HospitalStaff.repository";
import isCorrectPassword from "../utils/isCorrectPassword";
import { Request, Response } from "express";
import ApiResponse from "../utils/ApiResponse";

const superAdminRepo = new SuperAdminRepository();
const hospitalAdminRepo = new HospitalAdminRepository();
const hospitalStaffRepo = new HospitalStaffRepository();

interface Credentials {
	email: string;
	password: string;
}

const login = async (req: Request, res: Response) => {
	try {
		const { email, password } = req.body as Credentials;
		if (!email || !password)
			throw new AppError("Email and password are required", 400);

		// Try SuperAdmin first
		let user: any;
		user = await superAdminRepo.findByEmail(email);
		if (!user) {
			// Try HospitalAdmin
			user = await hospitalAdminRepo.getAdminByEmail(email);
			if (!user) {
				// Try HospitalStaff
				user = await hospitalStaffRepo.findByEmail(email);
			}
		}

		if (!user) throw new AppError("Invalid credentials", 401);

		// Compare password with hashed password
		const isValidPassword = await isCorrectPassword(password, user.password);
		if (!isValidPassword) throw new AppError("Invalid password", 401);

		const token = new Token().encrypt({
			id: user.id,
			email: user.email,
			role: user.role,
			hospitalId: user.hospitalId || undefined
		});
		res.cookie("accessToken", token, {
			httpOnly: true,
			sameSite: "strict",
			path: "/",
			maxAge: 2 * 60 * 60 * 1000
		});
		res.status(200).json(new ApiResponse("Login successful", { token, user }));
	} catch (error: any) {
		console.error("Login error:", error);
		res
			.status(error.code || 500)
			.json(new ApiResponse(error.message || "Internal Server Error"));
	}
};

export default login;
