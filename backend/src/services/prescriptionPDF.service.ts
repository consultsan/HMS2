import { Prescription, PrescriptionItem, Drug, Patient, HospitalStaff, Hospital } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { TimezoneUtil } from '../utils/timezone.util';

interface PrescriptionWithDetails {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  diagnosis?: string | null;
  notes?: string | null;
  instructions?: string | null;
  validUntil: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  admissionId?: string | null;
  visitId?: string | null;
  patient: Patient;
  doctor: HospitalStaff;
  hospital: Hospital;
  items: (PrescriptionItem & {
    drug: Drug;
  })[];
}

export class PrescriptionPDFService {
  /**
   * Generate prescription PDF using PDFKit
   */
  static async generatePrescriptionPDF(prescription: PrescriptionWithDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .fillColor('#003366')
           .text('PRESCRIPTION', 50, 50);

        // Hospital Information
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text(prescription.hospital.name, 50, 100);

        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text(prescription.hospital.address, 50, 125);

        doc.text(`Phone: ${prescription.hospital.contactNumber}`, 50, 140);

        // Prescription Details
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#003366')
           .text('Prescription Details:', 50, 180);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`Prescription No: ${prescription.prescriptionNumber}`, 50, 210);

        const prescriptionDate = TimezoneUtil.formatDateIST(prescription.createdAt, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.text(`Date: ${prescriptionDate}`, 50, 235);

        const validUntil = TimezoneUtil.formatDateIST(prescription.validUntil, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        doc.text(`Valid Until: ${validUntil}`, 50, 260);

        // Patient Information
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#003366')
           .text('Patient Information:', 50, 300);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`Name: ${prescription.patient.name}`, 50, 330);

        // Calculate age from date of birth
        const age = Math.floor((new Date().getTime() - new Date(prescription.patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        doc.text(`Age: ${age} years`, 50, 355);

        doc.text(`Gender: ${prescription.patient.gender}`, 50, 380);

        // Doctor Information
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#003366')
           .text('Doctor Information:', 50, 420);

        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`Dr. ${prescription.doctor.name}`, 50, 450);

        doc.text(`Specialization: ${prescription.doctor.specialisation || 'General Medicine'}`, 50, 475);

        let currentY = 520;

        // Diagnosis
        if (prescription.diagnosis) {
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#003366')
             .text('Diagnosis:', 50, currentY);

          currentY += 30;

          doc.fontSize(12)
             .font('Helvetica')
             .fillColor('#000000')
             .text(prescription.diagnosis, 50, currentY, { width: 500 });

          currentY += 50;
        }

        // Prescription Items
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#003366')
           .text('Prescribed Medicines:', 50, currentY);

        currentY += 30;

        // Table headers
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Medicine', 50, currentY)
           .text('Dosage', 200, currentY)
           .text('Frequency', 300, currentY)
           .text('Duration', 400, currentY)
           .text('Quantity', 500, currentY);

        currentY += 20;

        // Draw line under headers
        doc.moveTo(50, currentY)
           .lineTo(550, currentY)
           .stroke('#666666');

        currentY += 15;

        // Prescription items
        for (const item of prescription.items) {
          // Check if we need a new page
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          const medicineName = item.drug.brandName || item.drug.name;
          
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#000000')
             .text(medicineName, 50, currentY, { width: 140 })
             .text(item.dosage, 200, currentY, { width: 90 })
             .text(item.frequency, 300, currentY, { width: 90 })
             .text(`${item.duration} days`, 400, currentY, { width: 90 })
             .text(`${item.quantity} ${item.unit}`, 500, currentY, { width: 90 });

          currentY += 20;
        }

        currentY += 30;

        // Instructions
        if (prescription.instructions) {
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#003366')
             .text('Instructions:', 50, currentY);

          currentY += 30;

          doc.fontSize(12)
             .font('Helvetica')
             .fillColor('#000000')
             .text(prescription.instructions, 50, currentY, { width: 500 });

          currentY += 50;
        }

        // Notes
        if (prescription.notes) {
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#003366')
             .text('Notes:', 50, currentY);

          currentY += 30;

          doc.fontSize(12)
             .font('Helvetica')
             .fillColor('#000000')
             .text(prescription.notes, 50, currentY, { width: 500 });
        }

        // Footer
        const footerY = doc.page.height - 100;
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text('This is a computer-generated prescription.', 50, footerY)
           .text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 50, footerY + 15);

        doc.end();
      } catch (error) {
        console.error('Error generating prescription PDF:', error);
        reject(new Error('Failed to generate prescription PDF'));
      }
    });
  }

}
