import { Router } from "express";
import {
	sendWhatsAppMessage,
	sendAppointmentNotification,
	sendLabTestCompletionNotification
} from "../services/whatsapp.service";

const router = Router();

// Test basic WhatsApp message
router.post("/send-message", async (req, res) => {
	try {
		const { to, message } = req.body;

		if (!to || !message) {
			return res.status(400).json({
				success: false,
				message: "Phone number and message are required"
			});
		}

		const result = await sendWhatsAppMessage(to, message);

		if (result.success) {
			res.status(200).json({
				success: true,
				message: "WhatsApp message sent successfully",
				data: result.data
			});
		} else {
			res.status(500).json({
				success: false,
				message: "Failed to send WhatsApp message",
				error: result.error
			});
		}
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: "Error sending WhatsApp message",
			error: error.message
		});
	}
});

// Test appointment notification
router.post("/test-appointment", async (req, res) => {
	try {
		const {
			phoneNumber,
			patientName,
			doctorName,
			appointmentDate,
			appointmentTime,
			hospitalName
		} = req.body;

		if (
			!phoneNumber ||
			!patientName ||
			!doctorName ||
			!appointmentDate ||
			!appointmentTime ||
			!hospitalName
		) {
			return res.status(400).json({
				success: false,
				message: "All fields are required"
			});
		}

		const result = await sendAppointmentNotification(phoneNumber, {
			patientName,
			doctorName,
			appointmentDate: new Date(appointmentDate),
			appointmentTime,
			hospitalName
		});

		if (result.success) {
			res.status(200).json({
				success: true,
				message: "Appointment notification sent successfully",
				data: result.data
			});
		} else {
			res.status(500).json({
				success: false,
				message: "Failed to send appointment notification",
				error: result.error
			});
		}
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: "Error sending appointment notification",
			error: error.message
		});
	}
});

// Test lab test completion notification
router.post("/test-lab-completion", async (req, res) => {
	try {
		const { phoneNumber, patientName, testName, completionDate, hospitalName } =
			req.body;

		if (
			!phoneNumber ||
			!patientName ||
			!testName ||
			!completionDate ||
			!hospitalName
		) {
			return res.status(400).json({
				success: false,
				message: "All fields are required"
			});
		}

		const result = await sendLabTestCompletionNotification(phoneNumber, {
			patientName,
			testName,
			completionDate: new Date(completionDate),
			hospitalName
		});

		if (result.success) {
			res.status(200).json({
				success: true,
				message: "Lab test completion notification sent successfully",
				data: result.data
			});
		} else {
			res.status(500).json({
				success: false,
				message: "Failed to send lab test completion notification",
				error: result.error
			});
		}
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: "Error sending lab test completion notification",
			error: error.message
		});
	}
});

export default router;
