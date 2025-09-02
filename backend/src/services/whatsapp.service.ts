import axios from "axios";
import { text } from "pdfkit";

const WHATSAPP_CLOUD_API_VERSION = "v17.0"; // safer default
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WA_CLOUD_API_ACCESS_TOKEN;

if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
	throw new Error(
		"Missing WhatsApp Cloud API credentials. Set WA_PHONE_NUMBER_ID and WA_CLOUD_API_ACCESS_TOKEN."
	);
}

// Function to format phone number for WhatsApp API
function formatPhoneNumber(phoneNumber: string): string {
	let cleaned = phoneNumber.replace(/\D/g, "");

	if (cleaned.startsWith("0")) {
		cleaned = cleaned.substring(1);
	}

	// If number is 10 digits (India), prepend country code
	if (cleaned.length === 10 && !cleaned.startsWith("91")) {
		cleaned = "91" + cleaned;
	}

	// Must be E.164 (digits only, 8–15 length)
	if (!/^\d{8,15}$/.test(cleaned)) {
		throw new Error(
        "Invalid phone number format. Use international E.164 format (e.g., 919876543210)"
		);
	}

	return cleaned;
}

type MessageType = "text" | "document";

interface MessageOptions {
	type: MessageType;
	body?: string; // for text messages
	mediaUrl?: string; // for documents
	fileName?: string; // optional file name for documents
}

// Generic WhatsApp sender
async function sendWhatsAppMessage(
	to: string,
	options: MessageOptions | string
) {
	const url = `https://graph.facebook.com/${WHATSAPP_CLOUD_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

	try {
		const formattedPhoneNumber = formatPhoneNumber(to);

		// Handle backward compatibility - if options is a string, treat it as text message
		let messageOptions: MessageOptions;
		if (typeof options === "string") {
			messageOptions = {
				type: "text",
				body: options
			};
		} else {
			messageOptions = options;
		}

		let payload: any = {
			messaging_product: "whatsapp",
			to: formattedPhoneNumber,
			type: messageOptions.type
		};

		if (messageOptions.type === "text") {
			payload.text = { body: messageOptions.body };
		} else if (messageOptions.type === "document") {
			payload.document = {
				link: messageOptions.mediaUrl,
				caption: messageOptions.body || "",
				filename: messageOptions.fileName || "document.pdf"
			};
		}

		const response = await axios.post(url, payload, {
			headers: {
				Authorization: `Bearer ${ACCESS_TOKEN}`,
				"Content-Type": "application/json"
			}
		});

		if (!response.data.messages || response.data.messages.length === 0) {
			return {
				success: false,
				error: "No message ID returned from WhatsApp API"
			};
		}

		console.log("WhatsApp message sent:", response.data);
		return { success: true, data: response.data };
	} catch (error: any) {
		console.error(
			"Error sending WhatsApp message:",
			error.response ? error.response.data : error.message
		);
		return { success: false, error: error.response?.data || error.message };
	}
}

async function sendAppointmentNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		doctorName: string;
		appointmentDate: Date;
		appointmentTime: string;
		hospitalName: string;
	}
) {
	const formattedDate = new Date(data.appointmentDate).toLocaleDateString(
		"en-IN",
		{
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric"
		}
	);

	const message = `🏥 *Appointment Confirmation*

Dear *${data.patientName}*,

Your appointment has been scheduled:

👨‍⚕️ *Doctor:* ${data.doctorName}
📅 *Date:* ${formattedDate}
⏰ *Time:* ${data.appointmentTime}
🏥 *Hospital:* ${data.hospitalName}

Please arrive 15 minutes before your scheduled time.`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "text",
		body: message
	});
}

async function sendLabReportNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		testName: string;
		completionDate: Date;
		hospitalName: string;
		reportUrl: string;
	}
) {
	const formattedDate = new Date(data.completionDate).toLocaleDateString(
		"en-IN",
		{
			year: "numeric",
			month: "long",
			day: "numeric"
		}
	);

	const caption = `📋 *Lab Report Ready*

Dear *${data.patientName}*,

Your lab report is now available:

🧪 *Test:* ${data.testName}
📅 *Report Date:* ${formattedDate}
🏥 *Hospital:* ${data.hospitalName}`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "document",
		body: caption,
		mediaUrl: data.reportUrl,
		fileName: "LabReport.pdf"
	});
}

// Alias for backward compatibility
async function sendLabTestCompletionNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		testName: string;
		completionDate: Date;
		hospitalName: string;
		reportUrl?: string;
	}
) {
	const formattedDate = new Date(data.completionDate).toLocaleDateString(
		"en-IN",
		{
			year: "numeric",
			month: "long",
			day: "numeric"
		}
	);

	const message = `🧪 *Lab Test Completed*

Dear *${data.patientName}*,

Your lab test has been completed:

🧪 *Test:* ${data.testName}
📅 *Completion Date:* ${formattedDate}
🏥 *Hospital:* ${data.hospitalName}

Your report will be available soon.`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "text",
		body: message
	});
}

async function sendDiagnosisRecordNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		doctorName: string;
		diagnosisDate: Date;
		hospitalName: string;
		reportUrl: string;
	}
) {
	const formattedDate = new Date(data.diagnosisDate).toLocaleDateString(
		"en-IN",
		{
			year: "numeric",
			month: "long",
			day: "numeric"
		}
	);

	const caption = `📋 *Diagnosis Record Available*

Dear *${data.patientName}*,

Your diagnosis record is now available:

👨‍⚕️ *Doctor:* ${data.doctorName}
📅 *Diagnosis Date:* ${formattedDate}
🏥 *Hospital:* ${data.hospitalName}`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "document",
		body: caption,
		mediaUrl: data.reportUrl,
		fileName: "DiagnosisRecord.pdf"
	});
}

export {
	sendWhatsAppMessage,
	sendAppointmentNotification,
	sendLabReportNotification,
	sendLabTestCompletionNotification,
	sendDiagnosisRecordNotification
};
export default sendWhatsAppMessage;
