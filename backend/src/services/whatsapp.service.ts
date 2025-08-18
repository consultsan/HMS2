import axios from "axios";
import { text } from "pdfkit";

const WHATSAPP_CLOUD_API_VERSION = "v18.0";
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WA_CLOUD_API_ACCESS_TOKEN;

interface AppointmentNotificationData {
	patientName: string;
	doctorName: string;
	appointmentDate: Date;
	appointmentTime: string;
	hospitalName: string;
}

interface LabTestNotificationData {
	patientName: string;
	testName: string;
	completionDate: Date;
	hospitalName: string;
}

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

async function sendWhatsAppMessage(to: string, messageBody: string) {
	const url = `https://graph.facebook.com/${WHATSAPP_CLOUD_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

	try {
		// Format phone number
		const formattedPhoneNumber = formatPhoneNumber(to);

		console.log(`Sending WhatsApp message to: ${formattedPhoneNumber}`);
		console.log(`Message content: ${messageBody}`);

		const response = await axios.post(
			url,
			{
				messaging_product: "whatsapp",
				to: formattedPhoneNumber,
				type: "text",
				text: {
					body: messageBody
				}
			},
			{
				headers: {
					Authorization: `Bearer ${ACCESS_TOKEN}`,
					"Content-Type": "application/json"
				}
			}
		);

		console.log("WhatsApp message sent successfully:", response.data);

		// Check for specific error conditions in the response
		if (response.data.messages && response.data.messages.length > 0) {
			const message = response.data.messages[0];
			if (message.error) {
				console.error("WhatsApp API returned error:", message.error);
				return { success: false, error: message.error };
			}
		}

		return { success: true, data: response.data };
	} catch (error: any) {
		console.error(
			"Error sending WhatsApp message:",
			error.response ? error.response.data : error.message
		);
		return { success: false, error: error.response?.data || error.message };
	}
}

// Send appointment confirmation notification
async function sendAppointmentNotification(
	phoneNumber: string,
	data: AppointmentNotificationData
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

Your appointment has been successfully scheduled:

👨‍⚕️ *Doctor:* ${data.doctorName}
📅 *Date:* ${formattedDate}
⏰ *Time:* ${data.appointmentTime}
🏥 *Hospital:* ${data.hospitalName}

Please arrive 15 minutes before your scheduled time.

For any queries, please contact the hospital.

Thank you for choosing our services!`;

	return await sendWhatsAppMessage(phoneNumber, message);
}

// Send lab test completion notification
async function sendLabTestCompletionNotification(
	phoneNumber: string,
	data: LabTestNotificationData
) {
	const formattedDate = new Date(data.completionDate).toLocaleDateString(
		"en-IN",
		{
			year: "numeric",
			month: "long",
			day: "numeric"
		}
	);

	const message = `🔬 *Lab Test Completed*

Dear *${data.patientName}*,

Your lab test has been completed:

🧪 *Test:* ${data.testName}
✅ *Completed on:* ${formattedDate}
🏥 *Hospital:* ${data.hospitalName}

Your test results are now ready. You can collect them from the hospital or contact us for further assistance.

Thank you for your patience!`;

	return await sendWhatsAppMessage(phoneNumber, message);
}

// Send lab report notification with PDF
async function sendLabReportNotification(
	phoneNumber: string,
	data: LabTestNotificationData & { reportUrl: string }
) {
	const formattedDate = new Date(data.completionDate).toLocaleDateString(
		"en-IN",
		{
			year: "numeric",
			month: "long",
			day: "numeric"
		}
	);

	const message = `📋 *Lab Report Ready*

Dear *${data.patientName}*,

Your lab report is now available:

🧪 *Test:* ${data.testName}
📅 *Report Date:* ${formattedDate}
🏥 *Hospital:* ${data.hospitalName}

Your detailed report has been generated and is ready for review. Please contact the hospital for any clarification regarding your results.

Thank you!`;

	return await sendWhatsAppMessage(phoneNumber, message);
}

// Send diagnosis record notification
async function sendDiagnosisRecordNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		doctorName: string;
		diagnosisDate: Date;
		hospitalName: string;
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

	const message = `📋 *Diagnosis Record Available*

Dear *${data.patientName}*,

Your diagnosis record has been prepared:

👨‍⚕️ *Doctor:* ${data.doctorName}
📅 *Date:* ${formattedDate}
🏥 *Hospital:* ${data.hospitalName}

Your diagnosis record is now available. Please contact the hospital to collect your medical documents or for any follow-up appointments.

Take care and follow your doctor's recommendations!`;

	return await sendWhatsAppMessage(phoneNumber, message);
}

export {
	sendWhatsAppMessage,
	sendAppointmentNotification,
	sendLabTestCompletionNotification,
	sendLabReportNotification,
	sendDiagnosisRecordNotification
};

export default sendWhatsAppMessage;
