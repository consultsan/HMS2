import axios from "axios";
import { text } from "pdfkit";

const WHATSAPP_CLOUD_API_VERSION = "v20.0";
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

async function sendWhatsAppMessage(to: string, messageBody: string) {
	const url = `https://graph.facebook.com/${WHATSAPP_CLOUD_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

	let formattedNumber = to.replace(/\D/g, ''); // Remove all non-digits

	// Add country code if not present
	if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
		formattedNumber = '91' + formattedNumber;
	}

	// Add + prefix for international format
	if (!formattedNumber.startsWith('+')) {
		formattedNumber = '+' + formattedNumber;
	}

	try {
		const response = await axios.post(
			url,
			{
				messaging_product: "whatsapp",
				to: to,
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
