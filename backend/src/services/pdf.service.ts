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
				const doc = new PDFDocument({ margin: 30 });
				const chunks: Buffer[] = [];

				doc.on("data", (chunk) => chunks.push(chunk));
				doc.on("end", () => resolve(Buffer.concat(chunks)));
				doc.on("error", reject);

				const pageWidth = doc.page.width;
				const margin = 30;
				const contentWidth = pageWidth - (margin * 2);

				// Header with Hospital Name and Logo
				const headerHeight = 70;
				doc.rect(0, 0, pageWidth, headerHeight);
				doc.fillColor('#1E40AF').fill();

				// Hospital Name - Left side
				doc.fillColor('white').fontSize(18).font('Helvetica-Bold');
				doc.text(bill.hospital.name, margin, 20, { width: contentWidth * 0.6 });

				// Bill Number and Date - Right side  
				doc.fontSize(11).font('Helvetica');
				const rightInfoX = pageWidth - 180;
				doc.text(`Bill #: ${bill.billNumber}`, rightInfoX, 20, { width: 150, align: 'left' });
				doc.text(`Date: ${format(new Date(bill.billDate), 'dd MMM yyyy')}`, rightInfoX, 35, { width: 150, align: 'left' });
				doc.text(`Status: ${bill.status}`, rightInfoX, 50, { width: 150, align: 'left' });

				// Start content after header
				let currentY = headerHeight + 20;
				doc.fillColor('black').font('Helvetica').fontSize(12);

				// Patient Information Section
				if (bill.patient) {
					doc.fontSize(14).font('Helvetica-Bold');
					doc.text('PATIENT INFORMATION', margin, currentY);
					currentY += 20;

					// Single column layout for patient info
					const lineHeight = 16;
					doc.fontSize(11).font('Helvetica');

					// All patient information items in single column
					const patientItems = [
						['Patient Name:', bill.patient.name],
						['Patient ID:', bill.patient.patientUniqueId],
						['Phone:', bill.patient.phone || 'N/A'],
						['Email:', bill.patient.email || 'N/A'],
						['Due Date:', bill.dueDate ? format(new Date(bill.dueDate), 'dd MMM yyyy') : 'N/A'],
						['Created:', format(new Date(bill.createdAt), 'dd MMM yyyy')]
					];

					patientItems.forEach(([label, value]) => {
						doc.font('Helvetica-Bold').text(label, margin, currentY, { width: 120, continued: true });
						doc.font('Helvetica').text(` ${value}`, { width: contentWidth - 120 });
						currentY += lineHeight;
					});

					currentY += 15;
				}

				// Separator line
				doc.strokeColor('#E5E7EB').lineWidth(1);
				doc.moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
				currentY += 15;

				// Bill Items Section
				if (bill.billItems && bill.billItems.length > 0) {
					doc.fillColor('black').fontSize(14).font('Helvetica-Bold');
					doc.text('BILL ITEMS', margin, currentY);
					currentY += 20;

					// Define table structure
					const tableStartY = currentY;
					const rowHeight = 30;
					const headerHeight = 25;

					// Table column definitions
					const columns = [
						{ label: 'S.No', x: margin + 5, width: 40 },
						{ label: 'Description', x: margin + 50, width: 200 },
						{ label: 'Qty', x: margin + 260, width: 40 },
						{ label: 'Unit Price', x: margin + 310, width: 70 },
						{ label: 'Discount', x: margin + 390, width: 60 },
						{ label: 'Total', x: margin + 460, width: 70 }
					];

					// Draw table header
					doc.rect(margin, tableStartY, contentWidth, headerHeight);
					doc.fillColor('#F8F9FA').fill();
					doc.rect(margin, tableStartY, contentWidth, headerHeight);
					doc.strokeColor('#DEE2E6').stroke();

					doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
					columns.forEach(col => {
						doc.text(col.label, col.x, tableStartY + 8, { width: col.width, align: 'center' });
					});

					currentY = tableStartY + headerHeight;

					// Draw table rows
					bill.billItems.forEach((item, index) => {
						// Alternate row colors
						const rowColor = index % 2 === 0 ? '#FFFFFF' : '#F8F9FA';

						doc.rect(margin, currentY, contentWidth, rowHeight);
						doc.fillColor(rowColor).fill();
						doc.rect(margin, currentY, contentWidth, rowHeight);
						doc.strokeColor('#DEE2E6').stroke();

						// Row data
						doc.fillColor('black').fontSize(9).font('Helvetica');

						// S.No
						doc.text((index + 1).toString(), columns[0].x, currentY + 10, {
							width: columns[0].width,
							align: 'center'
						});

						// Description - handle long text
						doc.font('Helvetica').text(item.description, columns[1].x, currentY + 6, {
							width: columns[1].width - 10,
							height: rowHeight - 12,
							ellipsis: true
						});

						// Quantity
						doc.text(item.quantity.toString(), columns[2].x, currentY + 10, {
							width: columns[2].width,
							align: 'center'
						});

						// Unit Price
						doc.text(`₹${item.unitPrice.toFixed(2)}`, columns[3].x, currentY + 10, {
							width: columns[3].width,
							align: 'right'
						});

						// Discount
						doc.text(`₹${item.discountAmount.toFixed(2)}`, columns[4].x, currentY + 10, {
							width: columns[4].width,
							align: 'right'
						});

						// Total
						doc.font('Helvetica-Bold').text(`₹${item.totalPrice.toFixed(2)}`, columns[5].x, currentY + 10, {
							width: columns[5].width,
							align: 'right'
						});

						currentY += rowHeight;
					});

					currentY += 10;
				}

				// Payment Summary Section - Positioned properly to avoid overlaps
				doc.fillColor('black').fontSize(14).font('Helvetica-Bold');
				doc.text('PAYMENT SUMMARY', margin, currentY);
				currentY += 20;

				// Create summary box with proper spacing
				const summaryBoxHeight = 120;
				const summaryBoxWidth = 280;
				const summaryX = pageWidth - summaryBoxWidth - margin;

				doc.rect(summaryX, currentY, summaryBoxWidth, summaryBoxHeight);
				doc.fillColor('#F8F9FA').fill();
				doc.rect(summaryX, currentY, summaryBoxWidth, summaryBoxHeight);
				doc.strokeColor('#DEE2E6').stroke();

				// Summary items with proper spacing
				doc.fillColor('black').fontSize(11);
				let summaryY = currentY + 15;
				const summaryLineHeight = 20;

				const summaryItems = [
					['Total Amount:', `₹${bill.totalAmount.toFixed(2)}`],
					['Amount Paid:', `₹${bill.paidAmount.toFixed(2)}`],
					['Amount Due:', `₹${bill.dueAmount.toFixed(2)}`],
					['Status:', bill.status]
				];

				summaryItems.forEach(([label, value], index) => {
					doc.font('Helvetica-Bold').text(label, summaryX + 15, summaryY, {
						width: 120,
						continued: true
					});

					// Color code the status
					if (index === 3) {
						const statusColor = bill.status === 'PAID' ? '#16A34A' :
							bill.status === 'PARTIALLY_PAID' ? '#2563EB' : '#DC2626';
						doc.fillColor(statusColor);
					}

					doc.font('Helvetica').text(` ${value}`, {
						width: 120,
						align: 'right'
					});

					doc.fillColor('black'); // Reset color
					summaryY += summaryLineHeight;
				});

				currentY += summaryBoxHeight + 20;

				// Payment History Section
				if (bill.payments && bill.payments.length > 0) {
					doc.fillColor('black').fontSize(14).font('Helvetica-Bold');
					doc.text('PAYMENT HISTORY', margin, currentY);
					currentY += 20;

					// Payment table
					const paymentRowHeight = 25;
					const paymentColumns = [
						{ label: 'Date', x: margin + 5, width: 80 },
						{ label: 'Amount', x: margin + 90, width: 80 },
						{ label: 'Method', x: margin + 180, width: 100 },
						{ label: 'Status', x: margin + 290, width: 80 },
						{ label: 'Transaction ID', x: margin + 380, width: 150 }
					];

					// Payment table header
					doc.rect(margin, currentY, contentWidth, paymentRowHeight);
					doc.fillColor('#F8F9FA').fill();
					doc.rect(margin, currentY, contentWidth, paymentRowHeight);
					doc.strokeColor('#DEE2E6').stroke();

					doc.fillColor('black').fontSize(10).font('Helvetica-Bold');
					paymentColumns.forEach(col => {
						doc.text(col.label, col.x, currentY + 8, { width: col.width, align: 'center' });
					});

					currentY += paymentRowHeight;

					// Payment rows
					bill.payments.forEach((payment, index) => {
						const rowColor = index % 2 === 0 ? '#FFFFFF' : '#F8F9FA';

						doc.rect(margin, currentY, contentWidth, paymentRowHeight);
						doc.fillColor(rowColor).fill();
						doc.rect(margin, currentY, contentWidth, paymentRowHeight);
						doc.strokeColor('#DEE2E6').stroke();

						doc.fillColor('black').fontSize(9).font('Helvetica');

						doc.text(format(new Date(payment.paymentDate), 'dd MMM yyyy'), paymentColumns[0].x, currentY + 8, {
							width: paymentColumns[0].width,
							align: 'center'
						});
						doc.text(`₹${payment.amount.toFixed(2)}`, paymentColumns[1].x, currentY + 8, {
							width: paymentColumns[1].width,
							align: 'right'
						});
						doc.text(payment.paymentMethod, paymentColumns[2].x, currentY + 8, {
							width: paymentColumns[2].width,
							align: 'center',
							ellipsis: true
						});
						doc.text(payment.status, paymentColumns[3].x, currentY + 8, {
							width: paymentColumns[3].width,
							align: 'center'
						});
						doc.text(payment.transactionId || 'N/A', paymentColumns[4].x, currentY + 8, {
							width: paymentColumns[4].width - 10,
							align: 'left',
							ellipsis: true
						});

						currentY += paymentRowHeight;
					});

					currentY += 15;
				}

				// Notes Section
				if (bill.notes) {
					doc.fillColor('black').fontSize(14).font('Helvetica-Bold');
					doc.text('NOTES', margin, currentY);
					currentY += 15;

					const notesHeight = 50;
					doc.rect(margin, currentY, contentWidth, notesHeight);
					doc.fillColor('#F8F9FA').fill();
					doc.rect(margin, currentY, contentWidth, notesHeight);
					doc.strokeColor('#DEE2E6').stroke();

					doc.fillColor('black').fontSize(10).font('Helvetica');
					doc.text(bill.notes, margin + 10, currentY + 10, {
						width: contentWidth - 20,
						height: notesHeight - 20,
						align: 'left'
					});
					currentY += notesHeight + 15;
				}

				// Footer Section
				const footerY = Math.max(currentY + 20, doc.page.height - 60);
				doc.rect(0, footerY, pageWidth, 60);
				doc.fillColor('#F8F9FA').fill();

				doc.fillColor('#6B7280').fontSize(9).font('Helvetica');
				doc.text(`Generated on: ${format(new Date(), 'dd MMMM yyyy, hh:mm a')}`, margin, footerY + 15);
				doc.text(`Hospital: ${bill.hospital.name}`, margin, footerY + 30);
				if (bill.hospital.address) {
					doc.text(`Address: ${bill.hospital.address}`, margin, footerY + 45, {
						width: contentWidth - 200,
						ellipsis: true
					});
				}

				// Signature area
				doc.text('Authorized Signature', pageWidth - 150, footerY + 15);
				doc.strokeColor('#D1D5DB').lineWidth(1);
				doc.moveTo(pageWidth - 150, footerY + 40).lineTo(pageWidth - 30, footerY + 40).stroke();

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
