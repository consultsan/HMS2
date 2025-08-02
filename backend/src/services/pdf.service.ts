import puppeteer from "puppeteer";
import * as handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
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


        handlebars.registerHelper('formatDateTimeUTC', (date: Date | string) => {
        if (!date) return 'N/A';

        const d = new Date(date); // input is assumed to be in ISO UTC like '2025-08-04T09:15:00.000Z'

        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');

        return `${dd} ${format(d, 'MMM')} ${yyyy}, ${hours}:${minutes}`;
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

        // Replace helper
        handlebars.registerHelper('replace', (str: string, find: string, replace: string) => {
            if (!str) return str;
            return str.replace(new RegExp(find, 'g'), replace);
        });
    }

    // Initialize browser instance with better error handling
    private static async getBrowser() {
        try {
            return await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-features=TranslateUI',
                    '--disable-ipc-flooding-protection',
                    '--disable-dev-tools',
                    '--js-flags=--max-old-space-size=4096', // Increase memory limit
                    '--deterministic-fetch', // Ensure consistent page loads
                    '--enable-precise-memory-info',
                    '--enable-low-end-device-mode' // Optimize for low memory
                ],
                timeout: 60000,
                handleSIGINT: true,
                handleSIGTERM: true,
                handleSIGHUP: true,
                pipe: true // Use pipe instead of WebSocket
            });
        } catch (error) {
            console.error('Failed to launch browser:', error);
            throw new Error('Failed to initialize PDF browser');
        }
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

    // Generate PDF from HTML template with improved error handling
    private static async generatePDFFromHTML(html: string): Promise<Buffer> {
        let browser;
        let page;
        let retries = 3; // Add retry mechanism

        while (retries > 0) {
            try {
                browser = await this.getBrowser();
                page = await browser.newPage();

                // Optimize memory usage
                await page.setCacheEnabled(false);
                const client = await page.target().createCDPSession();
                await client.send('Network.enable');
                await client.send('Network.setBypassServiceWorker', { bypass: true });

                // Set page configuration
                await page.setDefaultNavigationTimeout(30000);
                await page.setViewport({ width: 1200, height: 800 });

                // Wait for network to be idle before proceeding
                await page.setContent(html, {
                    waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
                    timeout: 30000
                });

                // Add a small delay to ensure content is fully rendered
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Generate PDF with error handling and increased timeout
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    preferCSSPageSize: true,
                    timeout: 60000,
                    margin: { top: '0cm', right: '0cm', bottom: '0cm', left: '0cm' }
                });

                return Buffer.from(pdfBuffer);
            } catch (error: unknown) {
                retries--;
                console.error(`Error in PDF generation (retries left: ${retries}):`, error);

                // Clean up resources before retry
                try {
                    if (page && !page.isClosed()) {
                        await page.close().catch(() => { });
                    }
                    if (browser && browser.connected) {
                        await browser.close().catch(() => { });
                    }
                } catch (cleanupError) {
                    console.warn('Error during cleanup:', cleanupError);
                }

                if (retries === 0) {
                    if (error instanceof Error) {
                        throw new Error(`PDF generation failed after all retries: ${error.message}`);
                    }
                    throw new Error('PDF generation failed with unknown error after all retries');
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000));
            } finally {
                try {
                    if (page && !page.isClosed()) {
                        await page.close().catch(() => { });
                    }
                    if (browser && browser.connected) {
                        await browser.close().catch(() => { });
                    }
                } catch (closeError) {
                    console.warn('Error during cleanup:', closeError);
                }
            }
        }

        throw new Error('PDF generation failed: Maximum retries reached');
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

    // Generate Bill PDF using Puppeteer
    static async generateBillPDF(bill: BillWithRelations): Promise<Buffer> {
        this.registerHelpers();

        try {
            const template = this.loadTemplate('bill-template');


            // Get the absolute path to the logo from backend's public directory
            const logoPath = path.join(process.cwd(), 'public', 'True-Hospital-Logo(White).png');

            let logoUrl = '';
            try {
                const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
                logoUrl = `data:image/png;base64,${logoBase64}`;

            } catch (logoError) {
                console.error('Error reading logo file:', logoError);
                // Continue without the logo if file cannot be read
            }

            // Prepare template data
            const templateData = {
                ...bill,
                currentDate: new Date(),
                logoUrl
            };

            // Generate HTML
            let html = template(templateData);
            const pageCSS = `
                <style>
                    @page {
                    margin-top: 60px;
                    }
                    @page:first {
                    margin-top: 0;
                    }
                    body {
                    margin: 0;
                    }
                </style>
                `;
            html = html.replace('</head>', `${pageCSS}</head>`);

            // Generate PDF
            return await this.generatePDFFromHTML(html);
        } catch (error) {
            console.error('Error generating bill PDF:', error);
            throw new Error(`Failed to generate bill PDF: ${error}`);
        }
    }

    // Generate Diagnosis Record PDF using Puppeteer
    static async generateDiagnosisRecord(
        diagnosisRecord: any,
        labTests: any[],
        surgicalInfo: any
    ): Promise<Buffer> {
        this.registerHelpers();

        try {
            const template = this.loadTemplate('diagnosis-template');
            const logoPath = path.join(process.cwd(), 'public', 'True-Hospital-Logo(White).png');
            const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });
            const logoUrl = `data:image/png;base64,${logoBase64}`;
            // Prepare template data
          const templateData = {
                ...diagnosisRecord,
                labTests: labTests || [],
                surgicalInfo,
                currentDate: new Date(),
                logoUrl,
                patient: {
                    ...diagnosisRecord.appointment?.patient,
                    age: diagnosisRecord.appointment?.patient?.dob
                        ? this.calculateAge(diagnosisRecord.appointment.patient.dob)
                        : 'N/A'
                },
                followUpAppointment: diagnosisRecord.followUpAppointment || null,
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

    // Generate Clinical Summary PDF using Puppeteer
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

// Helper function to calculate age (keeping for backward compatibility)
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