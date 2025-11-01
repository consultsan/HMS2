import { Router } from "express";
import {
	sendWhatsAppMessage,
	sendAppointmentNotification,
	sendLabTestCompletionNotification
} from "../services/whatsapp.service";

// Function to format phone number for WhatsApp API
function formatPhoneNumber(phoneNumber: string): string {
	// Remove all non-digit characters
	let cleaned = phoneNumber.replace(/\D/g, "");

	// If number starts with 0, remove it
	if (cleaned.startsWith("0")) {
		cleaned = cleaned.substring(1);
	}

	// If number doesn't start with country code, assume India (+91)
	if (!cleaned.startsWith("91") && cleaned.length === 10) {
		cleaned = "91" + cleaned;
	}

	// Ensure it starts with country code
	if (!cleaned.startsWith("91")) {
		throw new Error(
			"Invalid phone number format. Please use international format (e.g., 919680032837)"
		);
	}

	return cleaned;
}

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
			hospitalId
		} = req.body;

		if (
			!phoneNumber ||
			!patientName ||
			!doctorName ||
			!appointmentDate ||
			!appointmentTime ||
			!hospitalId
		) {
			return res.status(400).json({
				success: false,
				message: "All fields are required, including hospitalId"
			});
		}
		console.log("Sending appointment notification to:", phoneNumber);
		console.log("Appointment details:", {
			patientName,
			doctorName,
			appointmentDate,
			appointmentTime,
			hospitalId
		});

		const result = await sendAppointmentNotification(phoneNumber, {
			patientName,
			doctorName,
			appointmentDate: new Date(appointmentDate),
			appointmentTime,
			hospitalId
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

// Phone number validation endpoint
router.post("/validate-phone", async (req, res) => {
	try {
		const { phoneNumber } = req.body;

		if (!phoneNumber) {
			return res.status(400).json({
				success: false,
				message: "Phone number is required"
			});
		}

		try {
			const formatted = formatPhoneNumber(phoneNumber);
			res.json({
				success: true,
				original: phoneNumber,
				formatted: formatted,
				valid: true,
				message: "Phone number formatted successfully"
			});
		} catch (error: any) {
			res.json({
				success: false,
				original: phoneNumber,
				error: error.message,
				valid: false,
				message: "Invalid phone number format"
			});
		}
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: "Error validating phone number",
			error: error.message
		});
	}
});

// Test environment variables
router.get("/test-config", async (req, res) => {
	try {
		const config = {
			phoneNumberId: process.env.WA_PHONE_NUMBER_ID ? "Set" : "Not Set",
			accessToken: process.env.WA_CLOUD_API_ACCESS_TOKEN ? "Set" : "Not Set",
			apiVersion: "latest"
		};

		res.json({
			success: true,
			config,
			message: "Configuration check completed"
		});
	} catch (error: any) {
		res.status(500).json({
			success: false,
			message: "Error checking configuration",
			error: error.message
		});
	}
});

export default router;
