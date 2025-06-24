import PDFDocument from "pdfkit";
import {
	Appointment,
	DiagnosisRecord,
	Vital,
	AppointmentAttachment,
	HospitalAdmin,
	Patient
} from "@prisma/client";
import { format } from "date-fns";

export interface VisitWithRelations extends Appointment {
	diagnosisRecord?: DiagnosisRecord | null;
	vitals: Vital[];
	attachments: AppointmentAttachment[];
	doctor: HospitalAdmin;
	patient: {
		name: string;
		dob: Date;
		gender: string;
		bloodGroup: string | null;
		address: string | null;
		phone: string | null;
		email: string | null;
		allergies: string | null;
		chronicDiseases: string | null;
		preExistingConditions: string | null;
	};
}

export class PDFService {
	static async generateClinicalSummary(
		appointment: Appointment,
		visit: VisitWithRelations
	): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument();
				const chunks: Buffer[] = [];

				doc.on("data", (chunk) => chunks.push(chunk));
				doc.on("end", () => resolve(Buffer.concat(chunks)));
				doc.on("error", reject);

				// Header with Hospital Name (if available)
				doc.fontSize(24).text("Medical Prescription", { align: "center" });
				doc.moveDown();

				// Patient Information in a box
				doc.rect(50, doc.y, 500, 150).stroke();
				doc.fontSize(16).text("Patient Details", { align: "left", indent: 10 });
				doc.fontSize(12);
				const patientDetails = [
					["Name", visit.patient.name],
					["Age/Gender", `${calculateAge(visit.patient.dob)} years / ${visit.patient.gender}`],
					["DOB", format(new Date(visit.patient.dob), "dd MMM yyyy")],
					["Phone", visit.patient.phone || "N/A"],
					["Email", visit.patient.email || "N/A"],
					["Blood Group", visit.patient.bloodGroup || "N/A"],
					["Address", visit.patient.address || "N/A"]
				];

				let y = doc.y;
				let leftColumnX = 60;
				let rightColumnX = 300;

				patientDetails.forEach(([label, value], index) => {
					if (index < 4) {
						// Left column
						doc.text(`${label}: ${value}`, leftColumnX, y);
					} else {
						// Right column
						doc.text(`${label}: ${value}`, rightColumnX, y - (index < 4 ? 0 : 60));
					}
					if (index < 3) y += 20;
				});

				doc.moveDown(2);

				// Medical History Section
				doc.fontSize(14).text("Medical History", { underline: true });
				doc.fontSize(12);
				doc.moveDown();

				const medicalHistory = [
					["Allergies", visit.patient.allergies || "No known allergies"],
					["Chronic Diseases", visit.patient.chronicDiseases || "No chronic diseases recorded"],
					["Pre-existing Conditions", visit.patient.preExistingConditions || "No pre-existing conditions recorded"]
				];

				medicalHistory.forEach(([label, value]) => {
					doc.text(`${label}:`, { continued: true, underline: true });
					doc.text(` ${value}`);
					doc.moveDown();
				});

				doc.moveDown();

				// Visit Details
				doc.fontSize(14).text("Visit Details", { underline: true });
				doc.fontSize(12);
				doc.text(`Date: ${format(new Date(visit.scheduledAt), "PPP")}`);
				doc.text(`Doctor: Dr. ${visit.doctor.name}`);
				doc.text(`Visit Type: ${visit.visitType}`);
				doc.moveDown();

				// Diagnosis Section
				if (visit.diagnosisRecord?.diagnosis) {
					doc.fontSize(14).text("Diagnosis", { underline: true });
					doc.fontSize(12);
					doc.text(visit.diagnosisRecord.diagnosis);
					doc.moveDown();
				}

				// Medicines Section (if available)
				if (visit.diagnosisRecord?.medicines) {
					doc.fontSize(14).text("Prescribed Medicines", { underline: true });
					doc.fontSize(12);
					const medicines = visit.diagnosisRecord.medicines;
					if (Array.isArray(medicines)) {
						medicines.forEach((medicine: any, index) => {
							doc.text(`${index + 1}. ${medicine.name} - ${medicine.frequency}`, {
								bulletRadius: 2
							});
						});
					}
					doc.moveDown();
				}

				// Lab Tests Section
				if (visit.attachments.length > 0) {
					doc.fontSize(14).text("Lab Tests Ordered", { underline: true });
					doc.fontSize(12);
					visit.attachments
						.forEach((test, index) => {
							doc.text(`${index + 1}. ${test.type}`, {
								bulletRadius: 2
							});
						});
					doc.moveDown();
				}

				// Vitals Section
				if (visit.vitals.length > 0) {
					doc.fontSize(14).text("Vitals", { underline: true });
					doc.fontSize(12);
					visit.vitals.forEach((vital) => {
						doc.text(`${vital.type}: ${vital.value}${vital.unit ? ` ${vital.unit}` : ""}`);
						if (vital.notes) {
							doc.text(`Notes: ${vital.notes}`, { indent: 20 });
						}
					});
					doc.moveDown();
				}

				// Notes Section
				if (visit.diagnosisRecord?.notes) {
					doc.fontSize(14).text("Additional Notes", { underline: true });
					doc.fontSize(12);
					doc.text(visit.diagnosisRecord.notes);
					doc.moveDown();
				}

				// Footer with timestamp
				doc.fontSize(10);
				const footerText = `Generated on ${format(new Date(), "PPpp")}`;
				doc.text(footerText, 50, doc.page.height - 50, {
					align: "center"
				});

				doc.end();
			} catch (error) {
				reject(error);
			}
		});
	}
}

// Helper function to calculate age
function calculateAge(dob: Date | string) {
	const birthDate = new Date(dob);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}

	return age;
}
