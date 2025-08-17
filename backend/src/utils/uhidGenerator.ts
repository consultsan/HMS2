import prisma from "./dbConfig";
import AppError from "./AppError";

export class UhidGenerator {
	/**
	 * Generate UHID as per format: TR + first 2 letters of hospital name + year code + sequential number
	 * Example: TRAV25001 (TR + AV + 25 + 001)
	 */
	static async generateUHID(hospitalName: string): Promise<string> {
		try {
			// Get first 2 letters of hospital name (uppercase)
			const hospitalPrefix = hospitalName.substring(0, 2).toUpperCase();

			// Current year code (25 for 2025)
			const currentYear = new Date().getFullYear();
			const yearCode = currentYear.toString().substring(2); // Get last 2 digits

			// Get or create sequence for this year
			const sequenceRecord = await prisma.uhidSequence.upsert({
				where: { yearCode },
				update: {
					sequence: {
						increment: 1
					}
				},
				create: {
					yearCode,
					sequence: 1
				}
			});

			// Format sequence number with leading zeros (3 digits)
			const sequenceStr = sequenceRecord.sequence.toString().padStart(3, "0");

			// Generate UHID: TR + hospital prefix + year code + sequence
			const uhid = `TR${hospitalPrefix}${yearCode}${sequenceStr}`;

			return uhid;
		} catch (error: any) {
			throw new AppError(`Failed to generate UHID: ${error.message}`, 500);
		}
	}

	/**
	 * Generate Visit ID as per format: OPD/IPD + UHID (without sequence) + visit sequence
	 * Example: OPDTRAV251, IPDTRAV251
	 */
	static async generateVisitID(
		uhid: string,
		visitType: "OPD" | "IPD"
	): Promise<string> {
		try {
			if (!uhid) {
				throw new AppError("UHID is required to generate Visit ID", 400);
			}

			// Extract UHID prefix (TR + hospital prefix + year code)
			// UHID format: TRAV25001, so prefix would be TRAV25
			const uhidPrefix = uhid.substring(0, uhid.length - 3);

			// Get visit sequence for this patient and visit type
			const visitCount = await prisma.appointment.count({
				where: {
					patient: {
						uhid: uhid
					},
					visitType: visitType as any
				}
			});

			// Visit sequence starts from 1
			const visitSequence = visitCount + 1;

			// Generate Visit ID: OPD/IPD + UHID prefix + visit sequence
			const visitId = `${visitType}${uhidPrefix}${visitSequence}`;

			return visitId;
		} catch (error: any) {
			throw new AppError(`Failed to generate Visit ID: ${error.message}`, 500);
		}
	}

	/**
	 * Validate UHID format
	 */
	static validateUHID(uhid: string): boolean {
		// UHID format: TR + 2 letters + 2 digits + 3 digits
		// Example: TRAV25001
		const uhidRegex = /^TR[A-Z]{2}\d{2}\d{3}$/;
		return uhidRegex.test(uhid);
	}

	/**
	 * Validate Visit ID format
	 */
	static validateVisitID(visitId: string): boolean {
		// Visit ID format: OPD/IPD + TR + 2 letters + 2 digits + 1+ digits
		// Example: OPDTRAV251, IPDTRAV251
		const visitIdRegex = /^(OPD|IPD)TR[A-Z]{2}\d{2}\d+$/;
		return visitIdRegex.test(visitId);
	}

	/**
	 * Extract UHID from Visit ID
	 */
	static extractUHIDFromVisitID(visitId: string): string | null {
		if (!this.validateVisitID(visitId)) {
			return null;
		}

		// Remove OPD/IPD prefix and visit sequence
		// Visit ID: OPDTRAV251 -> UHID: TRAV25001
		const prefix = visitId.substring(0, 3); // OPD or IPD
		const uhidPart = visitId.substring(3); // TRAV251

		// Extract UHID prefix and add 001 as default sequence
		const uhidPrefix = uhidPart.substring(0, uhidPart.length - 1); // TRAV25
		const uhid = `${uhidPrefix}001`; // TRAV25001

		return uhid;
	}
}
