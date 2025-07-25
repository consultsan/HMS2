import puppeteer from "puppeteer";
import * as handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { format } from "date-fns";
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

// Interface definitions (same as existing PDFService)
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

export class PuppeteerPDFService {
    private static templatesPath = path.join(__dirname, '../templates');

    // Register Handlebars helpers
    private static registerHelpers() {
        // Date formatting helpers
        handlebars.registerHelper('formatDate', (date: Date | string) => {
            if (!date) return 'N/A';
            return format(new Date(date), 'dd MMM yyyy');
        });

        handlebars.registerHelper('formatDateTime', (date: Date | string) => {
            if (!date) return 'N/A';
            return format(new Date(date), 'dd MMM yyyy, hh:mm a');
        });

        handlebars.registerHelper('formatDateFull', (date: Date | string) => {
            if (!date) return 'N/A';
            return format(new Date(date), 'PPP');
        });

        handlebars.registerHelper('formatDateTimeFull', (date: Date | string) => {
            if (!date) return 'N/A';
            return format(new Date(date), 'PPpp');
        });

        // Currency formatting
        handlebars.registerHelper('formatCurrency', (amount: number) => {
            if (typeof amount !== 'number') return '0.00';
            return amount.toFixed(2);
        });

        // Status class helper
        handlebars.registerHelper('statusClass', (status: string) => {
            switch (status?.toLowerCase()) {
                case 'paid':
                    return 'paid';
                case 'partially_paid':
                    return 'partially-paid';
                default:
                    return 'unpaid';
            }
        });

        // Increment helper for array indices
        handlebars.registerHelper('inc', (value: number) => {
            return parseInt(value.toString()) + 1;
        });

        // Lowercase helper
        handlebars.registerHelper('lowercase', (str: string) => {
            return str?.toLowerCase() || '';
        });

        // Equality helper
        handlebars.registerHelper('eq', (a: any, b: any) => {
            return a === b;
        });

        // Not equal helper
        handlebars.registerHelper('ne', (a: any, b: any) => {
            return a !== b;
        });

        // If length helper - basic check
        handlebars.registerHelper('hasLength', (array: any[]) => {
            return array && array.length > 0;
        });
    }

    // Initialize browser instance
    private static async getBrowser() {
        return await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        });
    }

    // Load and compile template
    private static loadTemplate(templateName: string): any {
        const templatePath = path.join(this.templatesPath, `${templateName}.html`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template ${templateName} not found at ${templatePath}`);
        }

        const templateSource = fs.readFileSync(templatePath, 'utf8');
        return handlebars.compile(templateSource);
    }

    // Generate PDF from HTML template
    private static async generatePDFFromHTML(html: string): Promise<Buffer> {
        const browser = await this.getBrowser();
        let page;

        try {
            page = await browser.newPage();

            // Set viewport and content
            await page.setViewport({ width: 1200, height: 800 });
            await page.setContent(html, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                },
                preferCSSPageSize: true
            });

            return Buffer.from(pdfBuffer);
        } finally {
            if (page) await page.close();
            await browser.close();
        }
    }

    // Calculate age helper
    private static calculateAge(dob: Date | string): number {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    }

    // Generate Bill PDF
    static async generateBillPDF(bill: BillWithRelations): Promise<Buffer> {
        this.registerHelpers();

        try {
            const template = this.loadTemplate('bill-template');

            // Prepare template data
            const templateData = {
                ...bill,
                currentDate: new Date(),
                formatDate: (date: Date) => format(new Date(date), 'dd MMM yyyy'),
                formatDateTime: (date: Date) => format(new Date(date), 'dd MMM yyyy, hh:mm a'),
            };

            // Generate HTML
            const html = template(templateData);

            // Generate PDF
            return await this.generatePDFFromHTML(html);
        } catch (error) {
            console.error('Error generating bill PDF:', error);
            throw new Error(`Failed to generate bill PDF: ${error}`);
        }
    }

    // Generate Diagnosis Record PDF
    static async generateDiagnosisRecord(
        diagnosisRecord: any,
        labTests: any[],
        surgicalInfo: any
    ): Promise<Buffer> {
        this.registerHelpers();

        try {
            const template = this.loadTemplate('diagnosis-template');

            // Prepare template data
            const templateData = {
                ...diagnosisRecord,
                labTests: labTests || [],
                surgicalInfo,
                currentDate: new Date(),
                patient: {
                    ...diagnosisRecord.appointment?.patient,
                    age: diagnosisRecord.appointment?.patient?.dob
                        ? this.calculateAge(diagnosisRecord.appointment.patient.dob)
                        : 'N/A'
                },
                hospital: diagnosisRecord.appointment?.hospital || {},
                doctor: diagnosisRecord.appointment?.doctor || {},
                medicines: Array.isArray(diagnosisRecord.medicines) ? diagnosisRecord.medicines : [],
                hasHistory: diagnosisRecord.appointment?.patient?.allergy ||
                    diagnosisRecord.appointment?.patient?.chronicDisease ||
                    diagnosisRecord.appointment?.patient?.preExistingCondition,
            };

            // Generate HTML
            const html = template(templateData);

            // Generate PDF
            return await this.generatePDFFromHTML(html);
        } catch (error) {
            console.error('Error generating diagnosis PDF:', error);
            throw new Error(`Failed to generate diagnosis PDF: ${error}`);
        }
    }

    // Generate Clinical Summary PDF
    static async generateClinicalSummary(
        appointment: Appointment,
        visit: VisitWithRelations
    ): Promise<Buffer> {
        this.registerHelpers();

        try {
            const template = this.loadTemplate('clinical-summary-template');

            // Prepare template data
            const templateData = {
                ...visit,
                currentDate: new Date(),
                patient: {
                    ...visit.patient,
                    age: visit.patient.dob ? this.calculateAge(visit.patient.dob) : 'N/A'
                },
                diagnosisRecord: {
                    ...visit.diagnosisRecord,
                    medicines: Array.isArray(visit.diagnosisRecord?.medicines)
                        ? visit.diagnosisRecord.medicines
                        : []
                }
            };

            // Generate HTML
            const html = template(templateData);

            // Generate PDF
            return await this.generatePDFFromHTML(html);
        } catch (error) {
            console.error('Error generating clinical summary PDF:', error);
            throw new Error(`Failed to generate clinical summary PDF: ${error}`);
        }
    }

    // Test method to generate sample PDF (for testing)
    static async generateTestPDF(): Promise<Buffer> {
        this.registerHelpers();

        const testHTML = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body { font-family: Arial, sans-serif; padding: 20px; }
					.header { background: #1E40AF; color: white; padding: 20px; text-align: center; }
					.content { margin: 20px 0; }
				</style>
			</head>
			<body>
				<div class="header">
					<h1>Puppeteer PDF Test</h1>
				</div>
				<div class="content">
					<p>This is a test PDF generated using Puppeteer at ${new Date().toISOString()}</p>
					<p>If you can see this, the Puppeteer PDF service is working correctly!</p>
				</div>
			</body>
			</html>
		`;

        return await this.generatePDFFromHTML(testHTML);
    }
} 