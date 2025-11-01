import axios from "axios";
import { text } from "pdfkit";
import { TimezoneUtil } from "../utils/timezone.util";
import prisma from "../utils/dbConfig";

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

// Helper function to generate Google Maps link from hospital data
function generateGoogleMapsLink(hospital: {
	address?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	googlePlaceId?: string | null;
	name?: string | null;
}): string {
	// Priority 1: Use Google Place ID if available
	if (hospital.googlePlaceId) {
		return `https://www.google.com/maps/place/?q=place_id:${hospital.googlePlaceId}`;
	}
	
	// Priority 2: Use coordinates if available
	if (hospital.latitude && hospital.longitude) {
		return `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`;
	}
	
	// Priority 3: Use address (fallback)
	if (hospital.address) {
		const encodedAddress = encodeURIComponent(hospital.address);
		return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
	}
	
	// Final fallback: search by hospital name
	if (hospital.name) {
		const encodedName = encodeURIComponent(hospital.name);
		return `https://www.google.com/maps/search/?api=1&query=${encodedName}`;
	}
	
	// Ultimate fallback
	return "https://www.google.com/maps";
}

// Helper function to fetch hospital data
async function getHospitalData(hospitalId: string) {
	try {
		const hospital = await prisma.hospital.findUnique({
			where: { id: hospitalId },
			select: {
				id: true,
				name: true,
				address: true,
				contactNumber: true,
				latitude: true,
				longitude: true,
				googlePlaceId: true
			}
		});
		
		if (!hospital) {
			throw new Error(`Hospital not found with ID: ${hospitalId}`);
		}
		
		return {
			name: hospital.name || "Hospital",
			address: hospital.address || "",
			contact: hospital.contactNumber || "",
			mapsLink: generateGoogleMapsLink(hospital)
		};
	} catch (error) {
		console.error("Error fetching hospital data:", error);
		// Return fallback values if hospital fetch fails
		return {
			name: "Hospital",
			address: "",
			contact: "",
			mapsLink: "https://www.google.com/maps"
		};
	}
}

type MessageType = "text" | "document" | "image";

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
		} else if (messageOptions.type === "image") {
			payload.image = {
				link: messageOptions.mediaUrl,
				caption: messageOptions.body || ""
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
		hospitalId: string;
	}
) {
	// Use TimezoneUtil to format the already IST-converted date properly
	const formattedDate = TimezoneUtil.formatDateIST(data.appointmentDate, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric"
	});

	// Fetch hospital data dynamically
	const hospital = await getHospitalData(data.hospitalId);

	const message = `🏥 *Appointment Confirmation*

Dear *${data.patientName}*,

Your appointment has been confirmed with Dr. *${data.doctorName}*.


📅 *Date:* ${formattedDate}
🕐 *Time:* ${data.appointmentTime}

📍 *Hospital Location:*
${hospital.name}
${hospital.address}
📞 ${hospital.contact}

🗺️ *Get Directions:*
${hospital.mapsLink}

Please arrive 15 minutes before your scheduled time.

We look forward to seeing you!

Best regards,
${hospital.name} Team`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "text",
		body: message
	});
}

async function sendAppointmentReminder(
	phoneNumber: string,
	data: {
		patientName: string;
		doctorName: string;
		appointmentDate: Date;
		appointmentTime: string;
		hospitalId: string;
	}
) {
	// Use TimezoneUtil to format the already IST-converted date properly
	const formattedDate = TimezoneUtil.formatDateIST(data.appointmentDate, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric"
	});

	// Fetch hospital data dynamically
	const hospital = await getHospitalData(data.hospitalId);

	const message = `⏰ *Appointment Reminder*

Dear *${data.patientName}*,

This is a friendly reminder about your upcoming appointment with Dr. *${data.doctorName}*.

📅 *Date:* ${formattedDate}
🕐 *Time:* ${data.appointmentTime}

📍 *Hospital Location:*
${hospital.name}
${hospital.address}
📞 ${hospital.contact}

🗺️ *Get Directions:*
${hospital.mapsLink}

⏰ *Your appointment is in 3 hours!*

Please arrive 15 minutes before your scheduled time.

We look forward to seeing you!

Best regards,
${hospital.name} Team`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "text",
		body: message
	});
}

async function sendLabReportReadyNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		testName: string;
		completionDate: Date;
		hospitalName: string;
	}
) {
	const formattedDate = new Date(data.completionDate).toLocaleDateString(
		"en-IN",
		{
			year: "numeric",
			month: "long",
			day: "numeric",
			timeZone: "Asia/Kolkata"
		}
	);

	const message = `📋 *Lab Report Ready*

Dear *${data.patientName}*,

Your lab report is now ready for collection:

🧪 *Test:* ${data.testName}
📅 *Report Date:* ${formattedDate}
🏥 *Hospital:* ${data.hospitalName}

Please visit the hospital to collect your report. If you need the report to be sent digitally, please contact the receptionist.`;

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
			day: "numeric",
			timeZone: "Asia/Kolkata"
		}
	);

	const caption = `📋 *Lab Report*

Dear *${data.patientName}*,

Your lab report is attached:

🧪 *Test:* ${data.testName}
📅 *Report Date:* ${formattedDate}
🏥 *Hospital:* ${data.hospitalName}`;

	// Determine file type based on URL extension
	const fileExtension = data.reportUrl.split('.').pop()?.toLowerCase();
	const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
	const isPdf = fileExtension === 'pdf';

	let messageType: MessageType;
	let fileName: string;

	if (isImage) {
		messageType = "image";
		fileName = `LabReport.${fileExtension}`;
	} else if (isPdf) {
		messageType = "document";
		fileName = "LabReport.pdf";
	} else {
		// Default to document for other file types
		messageType = "document";
		fileName = `LabReport.${fileExtension || 'pdf'}`;
	}

	return await sendWhatsAppMessage(phoneNumber, {
		type: messageType,
		body: caption,
		mediaUrl: data.reportUrl,
		fileName: fileName
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
			day: "numeric",
			timeZone: "Asia/Kolkata"
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
			day: "numeric",
			timeZone: "Asia/Kolkata"
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

async function sendPrescriptionNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		doctorName: string;
		prescriptionNumber: string;
		prescriptionDate: Date;
		hospitalName: string;
		prescriptionUrl: string;
		validUntil: Date;
		medicinesCount: number;
	}
) {
	const formattedDate = new Date(data.prescriptionDate).toLocaleDateString(
		"en-IN",
		{
			year: "numeric",
			month: "long",
			day: "numeric",
			timeZone: "Asia/Kolkata"
		}
	);

	const validUntilFormatted = new Date(data.validUntil).toLocaleDateString(
		"en-IN",
		{
			year: "numeric",
			month: "long",
			day: "numeric",
			timeZone: "Asia/Kolkata"
		}
	);

	const caption = `💊 *Prescription Ready*

Dear *${data.patientName}*,

Your prescription is now ready:

👨‍⚕️ *Doctor:* Dr. ${data.doctorName}
📋 *Prescription No:* ${data.prescriptionNumber}
📅 *Date:* ${formattedDate}
⏰ *Valid Until:* ${validUntilFormatted}
💊 *Medicines:* ${data.medicinesCount} items
🏥 *Hospital:* ${data.hospitalName}

Please collect your medicines from the pharmacy.`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "document",
		body: caption,
		mediaUrl: data.prescriptionUrl,
		fileName: `Prescription_${data.prescriptionNumber}.pdf`
	});
}

async function sendAppointmentUpdateNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		doctorName: string;
		appointmentDate: Date;
		appointmentTime: string;
		hospitalId: string;
	}
) {
	// Use TimezoneUtil to format the already IST-converted date properly
	const formattedDate = TimezoneUtil.formatDateIST(data.appointmentDate, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric"
	});

	// Fetch hospital data dynamically
	const hospital = await getHospitalData(data.hospitalId);

	const message = `🔄 *Appointment Updated*

Dear *${data.patientName}*,

Your appointment with Dr. *${data.doctorName}* has been updated.

📅 *New Date:* ${formattedDate}
🕐 *New Time:* ${data.appointmentTime}

🏥 *Hospital:* ${hospital.name}
📍 *Address:* ${hospital.address}
📞 *Contact:* ${hospital.contact}

🗺️ *Get Directions:* ${hospital.mapsLink}

Please note the updated appointment details. If you have any questions, please contact us.

Best regards,
${hospital.name} Team`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "text",
		body: message
	});
}

async function sendFollowUpAppointmentNotification(
	phoneNumber: string,
	data: {
		patientName: string;
		doctorName: string;
		appointmentDate: Date;
		appointmentTime: string;
		hospitalId: string;
		originalDiagnosisDate?: Date;
	}
) {
	// Use TimezoneUtil to format the already IST-converted date properly
	const formattedDate = TimezoneUtil.formatDateIST(data.appointmentDate, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric"
	});

	// Fetch hospital data dynamically
	const hospital = await getHospitalData(data.hospitalId);

	const message = `🔄 *Follow-up Appointment Confirmation*

Dear *${data.patientName}*,

Your follow-up appointment has been confirmed with Dr. *${data.doctorName}*.

📅 *Date:* ${formattedDate}
🕐 *Time:* ${data.appointmentTime}

📍 *Hospital Location:*
${hospital.name}
${hospital.address}
📞 ${hospital.contact}

🗺️ *Get Directions:*
${hospital.mapsLink}

📋 *Follow-up Details:*
This is a follow-up appointment to monitor your progress and ensure optimal recovery.

Please bring any previous reports or medications you're currently taking.

Please arrive 15 minutes before your scheduled time.

We look forward to seeing you!

Best regards,
${hospital.name} Team`;

	return await sendWhatsAppMessage(phoneNumber, {
		type: "text",
		body: message
	});
}

export {
	sendWhatsAppMessage,
	sendAppointmentNotification,
	sendAppointmentReminder,
	sendAppointmentUpdateNotification,
	sendFollowUpAppointmentNotification,
	sendLabReportReadyNotification,
	sendLabReportNotification,
	sendLabTestCompletionNotification,
	sendDiagnosisRecordNotification,
	sendPrescriptionNotification
};
export default sendWhatsAppMessage;
