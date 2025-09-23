import { Request, Response } from "express";
import { ReminderService } from "../services/reminder.service";
import ApiResponse from "../utils/ApiResponse";

export class ReminderController {
	/**
	 * Start reminder service
	 */
	async startService(req: Request, res: Response) {
		try {
			ReminderService.start();
			res.status(200).json(new ApiResponse(
				"Reminder service started successfully",
				ReminderService.getStatus()
			));
		} catch (error: any) {
			res.status(500).json(new ApiResponse(
				`Failed to start reminder service: ${error.message}`
			));
		}
	}

	/**
	 * Stop reminder service
	 */
	async stopService(req: Request, res: Response) {
		try {
			ReminderService.stop();
			res.status(200).json(new ApiResponse(
				"Reminder service stopped successfully",
				ReminderService.getStatus()
			));
		} catch (error: any) {
			res.status(500).json(new ApiResponse(
				`Failed to stop reminder service: ${error.message}`
			));
		}
	}

	/**
	 * Get service status
	 */
	async getStatus(req: Request, res: Response) {
		try {
			const status = ReminderService.getStatus();
			res.status(200).json(new ApiResponse(
				"Service status retrieved successfully",
				status
			));
		} catch (error: any) {
			res.status(500).json(new ApiResponse(
				`Failed to get service status: ${error.message}`
			));
		}
	}

	/**
	 * Manually trigger reminder check
	 */
	async triggerCheck(req: Request, res: Response) {
		try {
			await ReminderService.triggerCheck();
			res.status(200).json(new ApiResponse(
				"Reminder check triggered successfully",
				{ triggered: true, timestamp: new Date().toISOString() }
			));
		} catch (error: any) {
			res.status(500).json(new ApiResponse(
				`Failed to trigger reminder check: ${error.message}`
			));
		}
	}
}

export default new ReminderController();
