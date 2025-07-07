import PDFDocument from "pdfkit";
import {
	Appointment,
	DiagnosisRecord,
	Vital,
	AppointmentAttachment,
	HospitalAdmin,
	Patient,
	Bill,
	BillItem,
	Payment
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

export interface BillWithRelations extends Bill {
	patient: {
		id: string;
		name: string;
		patientUniqueId: string;
		phone: string;
		email: string | null;
	};
	hospital: {
		id: string;
		name: string;
		address: string | null;
	};
	billItems: BillItem[];
	payments: Payment[];
	appointment?: {
		id: string;
		scheduledAt: Date;
		visitType: string;
		doctor: {
			id: string;
			name: string;
			specialisation: string;
		};
	};
}

export class PDFService {
	static async generateBillPDF(bill: BillWithRelations): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument({ margin: 40 });
				const chunks: Buffer[] = [];

				doc.on("data", (chunk) => chunks.push(chunk));
				doc.on("end", () => resolve(Buffer.concat(chunks)));
				doc.on("error", reject);

				// Header with Hospital Name and Logo
				const headerHeight = 80;
				doc.rect(0, 0, doc.page.width, headerHeight);
				doc.fillColor('#1E40AF').fill();

				// Hospital Name and Bill Title
				doc.fillColor('white').fontSize(20);
				doc.text(bill.hospital.name, 50, 25);

				// Bill Number and Date
				doc.fontSize(12);
				doc.text(`Bill #: ${bill.billNumber}`, doc.page.width - 200, 30, {
					width: 150,
					align: 'right'
				});
				doc.text(`Date: ${format(new Date(bill.billDate), 'dd MMM yyyy')}`, doc.page.width - 200, 50, {
					width: 150,
					align: 'right'
				});

				// Reset position and styles after header
				doc.y = headerHeight + 20;
				doc.fillColor('black').font('Helvetica').fontSize(12);

				// Patient Information Section
				const patient = bill.patient;
				if (patient) {
					const sectionY = doc.y;

					// Left Column
					doc.fontSize(12);
					let leftY = sectionY;
					const leftItems = [
						['Patient Name:', patient.name],
						['Patient ID:', patient.patientUniqueId],
						['Phone:', patient.phone]
					];

					leftItems.forEach(([label, value]) => {
						doc.font('Helvetica-Bold').text(label, 50, leftY, { width: 120, continued: true });
						doc.font('Helvetica').text(` ${value}`, { width: 200 });
						leftY += 18;
					});

					// Right Column
					let rightY = sectionY;
					const rightItems = [
						['Email:', patient.email || 'N/A'],
						['Bill Status:', bill.status],
						['Due Date:', bill.dueDate ? format(new Date(bill.dueDate), 'dd MMM yyyy') : 'N/A']
					];

					rightItems.forEach(([label, value]) => {
						doc.font('Helvetica-Bold').text(label, 320, rightY, { width: 150, continued: true });
						doc.font('Helvetica').text(` ${value}`, { width: 200 });
						rightY += 18;
					});

					doc.y = Math.max(leftY, rightY) + 10;
				}

				// Add separator line
				doc.strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
				doc.moveDown();

				// Bill Items Section
				if (bill.billItems && bill.billItems.length > 0) {
					doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
					doc.text('Bill Items', 50, doc.y);
					doc.moveDown(0.5);

					// Table header
					const tableY = doc.y;
					doc.rect(50, tableY, doc.page.width - 100, 25);
					doc.fillColor('#F3F4F6').fill();
					doc.rect(50, tableY, doc.page.width - 100, 25);
					doc.strokeColor('#D1D5DB').stroke();

					doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
					doc.text('S.No', 60, tableY + 10);
					doc.text('Description', 120, tableY + 10);
					doc.text('Qty', 320, tableY + 10);
					doc.text('Unit Price', 380, tableY + 10);
					doc.text('Discount', 460, tableY + 10);
					doc.text('Total', 540, tableY + 10);

					// Table rows
					let rowY = tableY + 25;
					bill.billItems.forEach((item, index) => {
						doc.rect(50, rowY, doc.page.width - 100, 25);
						doc.fillColor(index % 2 === 0 ? '#FFFFFF' : '#F9FAFB').fill();
						doc.rect(50, rowY, doc.page.width - 100, 25);
						doc.strokeColor('#E5E7EB').stroke();

						doc.fillColor('black').fontSize(9).font('Helvetica');
						doc.text(`${index + 1}`, 60, rowY + 10);
						doc.font('Helvetica-Bold').text(item.description, 120, rowY + 10, { width: 180 });
						doc.font('Helvetica').text(item.quantity.toString(), 320, rowY + 10);
						doc.text(`₹${item.unitPrice.toFixed(2)}`, 380, rowY + 10);
						doc.text(`₹${item.discountAmount.toFixed(2)}`, 460, rowY + 10);
						doc.font('Helvetica-Bold').text(`₹${(item.totalPrice).toFixed(2)}`, 540, rowY + 10);
						rowY += 25;
					});
					doc.y = rowY + 15;
				}

				// Payment Summary Section
				doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
				doc.text('Payment Summary', 50, doc.y);
				doc.moveDown(0.5);

				const summaryY = doc.y;
				const summaryWidth = 300;
				const summaryX = doc.page.width - summaryWidth - 50;

				// Summary box
				doc.rect(summaryX, summaryY, summaryWidth, 120);
				doc.fillColor('#F8FAFC').fill();
				doc.rect(summaryX, summaryY, summaryWidth, 120);
				doc.strokeColor('#E2E8F0').stroke();

				// Summary content
				doc.fillColor('black').fontSize(12);
				let summaryItemY = summaryY + 15;

				// Total Amount
				doc.font('Helvetica-Bold').text('Total Amount:', summaryX + 15, summaryItemY, { width: 150, continued: true });
				doc.font('Helvetica').text(` ₹${bill.totalAmount.toFixed(2)}`, { width: 100, align: 'right' });
				summaryItemY += 20;

				// Amount Paid
				doc.font('Helvetica-Bold').text('Amount Paid:', summaryX + 15, summaryItemY, { width: 150, continued: true });
				doc.font('Helvetica').text(` ₹${bill.paidAmount.toFixed(2)}`, { width: 100, align: 'right' });
				summaryItemY += 20;

				// Amount Due
				doc.font('Helvetica-Bold').text('Amount Due:', summaryX + 15, summaryItemY, { width: 150, continued: true });
				doc.font('Helvetica').text(` ₹${bill.dueAmount.toFixed(2)}`, { width: 100, align: 'right' });
				summaryItemY += 20;

				// Payment Status
				doc.font('Helvetica-Bold').text('Status:', summaryX + 15, summaryItemY, { width: 150, continued: true });
				const statusColor = bill.status === 'PAID' ? '#16A34A' :
					bill.status === 'PARTIALLY_PAID' ? '#2563EB' : '#DC2626';
				doc.fillColor(statusColor).font('Helvetica').text(` ${bill.status}`, { width: 100, align: 'right' });

				doc.y = summaryY + 140;

				// Payment History Section
				if (bill.payments && bill.payments.length > 0) {
					doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
					doc.text('Payment History', 50, doc.y);
					doc.moveDown(0.5);

					// Payment history table
					const paymentTableY = doc.y;
					doc.rect(50, paymentTableY, doc.page.width - 100, 25);
					doc.fillColor('#F3F4F6').fill();
					doc.rect(50, paymentTableY, doc.page.width - 100, 25);
					doc.strokeColor('#D1D5DB').stroke();

					doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
					doc.text('Date', 60, paymentTableY + 10);
					doc.text('Amount', 200, paymentTableY + 10);
					doc.text('Method', 300, paymentTableY + 10);
					doc.text('Status', 400, paymentTableY + 10);
					doc.text('Transaction ID', 500, paymentTableY + 10);

					// Payment rows
					let paymentRowY = paymentTableY + 25;
					bill.payments.forEach((payment, index) => {
						doc.rect(50, paymentRowY, doc.page.width - 100, 25);
						doc.fillColor(index % 2 === 0 ? '#FFFFFF' : '#F9FAFB').fill();
						doc.rect(50, paymentRowY, doc.page.width - 100, 25);
						doc.strokeColor('#E5E7EB').stroke();

						doc.fillColor('black').fontSize(9).font('Helvetica');
						doc.text(format(new Date(payment.paymentDate), 'dd MMM yyyy'), 60, paymentRowY + 10);
						doc.text(`₹${payment.amount.toFixed(2)}`, 200, paymentRowY + 10);
						doc.text(payment.paymentMethod, 300, paymentRowY + 10);
						doc.text(payment.status, 400, paymentRowY + 10);
						doc.text(payment.transactionId || 'N/A', 500, paymentRowY + 10);
						paymentRowY += 25;
					});
					doc.y = paymentRowY + 15;
				}

				// Notes Section
				if (bill.notes) {
					doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
					doc.text('Notes', 50, doc.y);
					doc.moveDown(0.5);

					const notesBoxY = doc.y;
					doc.rect(50, notesBoxY, doc.page.width - 100, 40);
					doc.fillColor('#F9FAFB').fill();
					doc.rect(50, notesBoxY, doc.page.width - 100, 40);
					doc.strokeColor('#E5E7EB').stroke();

					doc.fillColor('black').fontSize(11).font('Helvetica');
					doc.text(bill.notes, 60, notesBoxY + 15, {
						width: doc.page.width - 120,
						height: 20
					});
					doc.y = notesBoxY + 50;
				}

				// Footer Section
				const footerY = Math.max(doc.y + 20, doc.page.height - 80);
				doc.rect(0, footerY, doc.page.width, 80);
				doc.fillColor('#F9FAFB').fill();

				doc.fillColor('#6B7280').fontSize(10).font('Helvetica');
				doc.text(`Generated on: ${format(new Date(), 'dd MMMM yyyy, hh:mm a')}`, 50, footerY + 20);
				doc.text(`Hospital: ${bill.hospital.name}`, 50, footerY + 35);
				if (bill.hospital.address) {
					doc.text(`Address: ${bill.hospital.address}`, 50, footerY + 50);
				}

				// Signature line
				doc.fillColor('#6B7280').text('Authorized Sign', doc.page.width - 150, footerY + 20);
				doc.strokeColor('#D1D5DB').moveTo(doc.page.width - 150, footerY + 50).lineTo(doc.page.width - 50, footerY + 50).stroke();

				doc.end();
			} catch (error) {
				reject(error);
			}
		});
	}

	static async generateDiagnosisRecord(
		diagnosisRecord: any,
		labTests: any[],
		surgicalInfo: any
	): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			try {
				const doc = new PDFDocument({ margin: 40 });
				const chunks: Buffer[] = [];

				doc.on("data", (chunk) => chunks.push(chunk));
				doc.on("end", () => resolve(Buffer.concat(chunks)));
				doc.on("error", reject);

				// Hospital Header Section with Blue Background
				const headerHeight = 80;
				doc.rect(0, 0, doc.page.width, headerHeight);
				doc.fillColor('#1E40AF').fill();

				// True Hospital + Handshake + Hospital Name
				doc.fillColor('white').fontSize(16);
				doc.text('True Hospital', 50, 25);
				doc.fontSize(14).text('🤝', 180, 27);
				doc.fontSize(20).text(diagnosisRecord.appointment?.hospital?.name || 'Hospital Name', 210, 25);

				// Hospital Contact Info (Right side)
				if (diagnosisRecord.appointment?.hospital) {
					doc.fontSize(10);
					doc.text(diagnosisRecord.appointment.hospital.address || '', doc.page.width - 200, 30, {
						width: 150,
						align: 'right'
					});
					doc.text(diagnosisRecord.appointment.hospital.contactNumber || '', doc.page.width - 200, 50, {
						width: 150,
						align: 'right'
					});
				}

				// Reset position and styles after header
				doc.y = headerHeight + 20;
				doc.fillColor('black').font('Helvetica').fontSize(12);

				// Patient Information Section
				const patient = diagnosisRecord.appointment?.patient;
				if (patient) {
					const sectionY = doc.y;

					// Left Column
					doc.fontSize(12);
					let leftY = sectionY;
					const leftItems = [
						['Patient Name:', patient.name],
						['Phone:', patient.phone],
						['Patient ID:', patient.patientUniqueId],
						['Gender:', patient.gender]
					];

					leftItems.forEach(([label, value]) => {
						doc.font('Helvetica-Bold').text(label, 50, leftY, { width: 120, continued: true });
						doc.font('Helvetica').text(` ${value}`, { width: 200 });
						leftY += 18;
					});

					// Right Column
					let rightY = sectionY;
					const rightItems = [
						['Registration Mode:', patient.registrationMode || 'OPD'],
						['Registration Source:', patient.registrationSource || 'WALK_IN'],
						['Status:', patient.status || 'ACTIVE'],
						['Age:', patient.dob ? `${calculateAge(patient.dob)} years` : 'N/A']
					];

					rightItems.forEach(([label, value]) => {
						doc.font('Helvetica-Bold').text(label, 320, rightY, { width: 150, continued: true });
						doc.font('Helvetica').text(` ${value}`, { width: 200 });
						rightY += 18;
					});

					doc.y = Math.max(leftY, rightY) + 10;
				}

				// Add separator line
				doc.strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
				doc.moveDown();

				// Primary Diagnosis Section
				doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
				doc.text('Primary Diagnosis', 50, doc.y);
				doc.moveDown(0.5);

				const diagnosisBoxY = doc.y;
				doc.rect(50, diagnosisBoxY, doc.page.width - 100, 50);
				doc.fillColor('#F9FAFB').fill();
				doc.rect(50, diagnosisBoxY, doc.page.width - 100, 50);
				doc.strokeColor('#E5E7EB').stroke();

				doc.fillColor('black').fontSize(12).font('Helvetica');
				doc.text(diagnosisRecord.diagnosis || 'No diagnosis provided', 60, diagnosisBoxY + 15, {
					width: doc.page.width - 120,
					height: 20,
					align: 'left'
				});
				doc.y = diagnosisBoxY + 60;

				// Medical History Section
				if (patient?.allergy || patient?.chronicDisease || patient?.preExistingCondition) {
					doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
					doc.text('Medical History', 50, doc.y);
					doc.moveDown(0.5);

					const historyY = doc.y;
					const cardWidth = (doc.page.width - 140) / 3;
					let cardX = 50;

					// Allergies Card
					if (patient.allergy) {
						doc.rect(cardX, historyY, cardWidth, 50);
						doc.fillColor('#FEF2F2').fill();
						doc.rect(cardX, historyY, cardWidth, 50);
						doc.strokeColor('#FECACA').stroke();

						doc.fillColor('#7F1D1D').fontSize(10).font('Helvetica-Bold');
						doc.text('Allergies', cardX + 10, historyY + 10);
						doc.fillColor('#991B1B').fontSize(9).font('Helvetica');
						doc.text(patient.allergy, cardX + 10, historyY + 25, { width: cardWidth - 20 });
						cardX += cardWidth + 10;
					}

					// Chronic Diseases Card
					if (patient.chronicDisease) {
						doc.rect(cardX, historyY, cardWidth, 50);
						doc.fillColor('#FFF7ED').fill();
						doc.rect(cardX, historyY, cardWidth, 50);
						doc.strokeColor('#FED7AA').stroke();

						doc.fillColor('#9A3412').fontSize(10).font('Helvetica-Bold');
						doc.text('Chronic Diseases', cardX + 10, historyY + 10);
						doc.fillColor('#C2410C').fontSize(9).font('Helvetica');
						doc.text(patient.chronicDisease, cardX + 10, historyY + 25, { width: cardWidth - 20 });
						cardX += cardWidth + 10;
					}

					// Pre-existing Conditions Card  
					if (patient.preExistingCondition) {
						doc.rect(cardX, historyY, cardWidth, 50);
						doc.fillColor('#FEFCE8').fill();
						doc.rect(cardX, historyY, cardWidth, 50);
						doc.strokeColor('#FDE047').stroke();

						doc.fillColor('#713F12').fontSize(10).font('Helvetica-Bold');
						doc.text('Pre-existing Conditions', cardX + 10, historyY + 10);
						doc.fillColor('#A16207').fontSize(9).font('Helvetica');
						doc.text(patient.preExistingCondition, cardX + 10, historyY + 25, { width: cardWidth - 20 });
					}

					doc.y = historyY + 70;
					doc.fillColor('black').font('Helvetica').fontSize(12);
				}

				// Prescribed Medicines Section
				doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
				doc.text('Prescribed Medicines', 50, doc.y);
				doc.moveDown(0.5);

				if (diagnosisRecord.medicines && Array.isArray(diagnosisRecord.medicines) && diagnosisRecord.medicines.length > 0) {
					// Table header
					const tableY = doc.y;
					doc.rect(50, tableY, doc.page.width - 100, 25);
					doc.fillColor('#F3F4F6').fill();
					doc.rect(50, tableY, doc.page.width - 100, 25);
					doc.strokeColor('#D1D5DB').stroke();

					doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
					doc.text('S.No', 60, tableY + 10);
					doc.text('Medicine Name', 120, tableY + 10);
					doc.text('Frequency', 320, tableY + 10);
					doc.text('Duration in Days', 450, tableY + 10);

					// Table rows
					let rowY = tableY + 25;
					diagnosisRecord.medicines.forEach((medicine: any, index: number) => {
						doc.rect(50, rowY, doc.page.width - 100, 25);
						doc.fillColor(index % 2 === 0 ? '#FFFFFF' : '#F9FAFB').fill();
						doc.rect(50, rowY, doc.page.width - 100, 25);
						doc.strokeColor('#E5E7EB').stroke();

						doc.fillColor('black').fontSize(9).font('Helvetica');
						doc.text(`${index + 1}`, 60, rowY + 10);
						doc.font('Helvetica-Bold').text(medicine.name || '', 120, rowY + 10, { width: 180 });
						doc.font('Helvetica').text(medicine.frequency || '', 320, rowY + 10, { width: 120 });
						doc.text(medicine.duration || '', 450, rowY + 10);
						rowY += 25;
					});
					doc.y = rowY + 15;
				} else {
					const noMedY = doc.y;
					doc.rect(50, noMedY, doc.page.width - 100, 35);
					doc.fillColor('#F9FAFB').fill();
					doc.rect(50, noMedY, doc.page.width - 100, 35);
					doc.strokeColor('#E5E7EB').stroke();

					doc.fillColor('#6B7280').fontSize(12).font('Helvetica');
					doc.text('No medicines prescribed', 60, noMedY + 12);
					doc.y = noMedY + 50;
				}

				// Reset styles
				doc.fillColor('black').font('Helvetica').fontSize(12);

				// Lab Tests Section
				if (labTests && labTests.length > 0) {
					doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
					doc.text('Lab Tests', 50, doc.y);
					doc.moveDown(0.5);

					// Table header
					const tableY = doc.y;
					doc.rect(50, tableY, doc.page.width - 100, 25);
					doc.fillColor('#F3F4F6').fill();
					doc.rect(50, tableY, doc.page.width - 100, 25);
					doc.strokeColor('#D1D5DB').stroke();

					doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
					doc.text('Test Name', 60, tableY + 10);
					doc.text('Status', 280, tableY + 10);
					doc.text('Report Date', 380, tableY + 10);
					doc.text('Actions', 480, tableY + 10);

					// Table rows
					let rowY = tableY + 25;
					labTests.forEach((test: any, index: number) => {
						doc.rect(50, rowY, doc.page.width - 100, 25);
						doc.fillColor(index % 2 === 0 ? '#FFFFFF' : '#F9FAFB').fill();
						doc.rect(50, rowY, doc.page.width - 100, 25);
						doc.strokeColor('#E5E7EB').stroke();

						doc.fillColor('black').fontSize(9).font('Helvetica');
						doc.text(test.labTest?.name || '', 60, rowY + 10, { width: 200 });

						// Status with color
						const statusColor = test.status === 'COMPLETED' ? '#16A34A' :
							test.status === 'PROCESSING' ? '#2563EB' : '#EAB308';
						doc.fillColor(statusColor).text(test.status || '', 280, rowY + 10);

						doc.fillColor('black');
						doc.text(test.tentativeReportDate ? format(new Date(test.tentativeReportDate), 'dd MMM yyyy') : 'Not Updated', 380, rowY + 10);
						if (test.status === 'COMPLETED') {
							doc.text('View', 480, rowY + 10);
						}
						rowY += 25;
					});
					doc.y = rowY + 15;
				}

				// Reset styles
				doc.fillColor('black').font('Helvetica').fontSize(12);

				// Follow-ups and Surgical Status (Single rows like frontend)
				doc.fillColor('black').fontSize(12).font('Helvetica-Bold');
				doc.text('FollowUps:', 50, doc.y, { continued: true });
				doc.font('Helvetica').text(` ${diagnosisRecord.followUpAppointment ?
					format(new Date(diagnosisRecord.followUpAppointment.scheduledAt), 'dd MMMM yyyy, hh:mm a') :
					'No Follow-Up Required'}`);
				doc.moveDown(0.5);

				// Add separator line
				doc.strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
				doc.moveDown(0.5);

				doc.fillColor('black').fontSize(12).font('Helvetica-Bold');
				doc.text('Surgical Status:', 50, doc.y, { continued: true });
				if (surgicalInfo && surgicalInfo.status !== 'NOT_REQUIRED') {
					const status = surgicalInfo.status === 'CONFIRMED' ? 'Confirmed' : 'Pending';
					const dateText = surgicalInfo.scheduledAt ? ` - ${format(new Date(surgicalInfo.scheduledAt), 'dd MMM yyyy')}` : '';
					doc.font('Helvetica').text(` ${status}${dateText}`);
				} else {
					doc.font('Helvetica').text(' Non-Surgical Treatment');
				}
				doc.moveDown();

				// Clinical Notes Section
				if (diagnosisRecord.notes) {
					// Add separator line
					doc.strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
					doc.moveDown();

					doc.fillColor('black').fontSize(16).font('Helvetica-Bold');
					doc.text('Clinical Notes', 50, doc.y);
					doc.moveDown(0.5);

					const notesBoxY = doc.y;
					doc.rect(50, notesBoxY, doc.page.width - 100, 60);
					doc.fillColor('#F9FAFB').fill();
					doc.rect(50, notesBoxY, doc.page.width - 100, 60);
					doc.strokeColor('#E5E7EB').stroke();

					doc.fillColor('black').fontSize(11).font('Helvetica');
					doc.text(diagnosisRecord.notes, 60, notesBoxY + 15, {
						width: doc.page.width - 120,
						height: 30
					});
					doc.y = notesBoxY + 80;
				}

				// Footer Section with gray background
				const footerY = Math.max(doc.y + 20, doc.page.height - 80);
				doc.rect(0, footerY, doc.page.width, 80);
				doc.fillColor('#F9FAFB').fill();

				doc.fillColor('#6B7280').fontSize(10).font('Helvetica');
				doc.text(`Created on: ${format(new Date(diagnosisRecord.createdAt), 'dd MMMM yyyy, hh:mm a')}`, 50, footerY + 20);
				doc.text(`Doctor: ${diagnosisRecord.appointment?.doctor?.name || 'Dr. Smith'}`, 50, footerY + 35);

				// Signature line
				doc.fillColor('#6B7280').text('Authorized Sign', doc.page.width - 150, footerY + 20);
				doc.strokeColor('#D1D5DB').moveTo(doc.page.width - 150, footerY + 50).lineTo(doc.page.width - 50, footerY + 50).stroke();

				doc.end();
			} catch (error) {
				reject(error);
			}
		});
	}

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
