import prisma from "./dbConfig";
import { UhidGenerator } from "./uhidGenerator";

/**
 * Migration script to add UHID to existing patients
 * This script should be run once after deploying the schema changes
 */
export async function migrateExistingPatientsToUHID() {
	try {
		console.log("Starting UHID migration for existing patients...");

		// Get all patients without UHID
		const patientsWithoutUHID = await prisma.patient.findMany({
			where: {
				uhid: null
			},
			include: {
				hospital: {
					select: {
						name: true
					}
				}
			}
		});

		console.log(`Found ${patientsWithoutUHID.length} patients without UHID`);

		let successCount = 0;
		let errorCount = 0;

		for (const patient of patientsWithoutUHID) {
			try {
				// Generate UHID for this patient
				const uhid = await UhidGenerator.generateUHID(patient.hospital.name);

				// Update patient with UHID
				await prisma.patient.update({
					where: { id: patient.id },
					data: { uhid }
				});

				console.log(`✓ Updated patient ${patient.name} with UHID: ${uhid}`);
				successCount++;
			} catch (error) {
				console.error(`✗ Failed to update patient ${patient.name}:`, error);
				errorCount++;
			}
		}

		console.log(`\nMigration completed:`);
		console.log(`✓ Successfully updated: ${successCount} patients`);
		console.log(`✗ Failed to update: ${errorCount} patients`);

		if (errorCount > 0) {
			console.log(
				"\nPlease check the errors above and run the migration again if needed."
			);
		}
	} catch (error) {
		console.error("Migration failed:", error);
		throw error;
	}
}

/**
 * Migration script to add Visit ID to existing appointments
 * This script should be run once after deploying the schema changes
 */
export async function migrateExistingAppointmentsToVisitID() {
	try {
		console.log("Starting Visit ID migration for existing appointments...");

		// Get all appointments without Visit ID
		const appointmentsWithoutVisitID = await prisma.appointment.findMany({
			where: {
				visitId: null
			},
			include: {
				patient: {
					select: {
						uhid: true
					}
				}
			}
		});

		console.log(
			`Found ${appointmentsWithoutVisitID.length} appointments without Visit ID`
		);

		let successCount = 0;
		let errorCount = 0;

		for (const appointment of appointmentsWithoutVisitID) {
			try {
				if (!appointment.patient.uhid) {
					console.log(
						`⚠ Skipping appointment ${appointment.id} - patient has no UHID`
					);
					continue;
				}

				// Generate Visit ID for this appointment
				const visitId = await UhidGenerator.generateVisitID(
					appointment.patient.uhid,
					appointment.visitType === "OPD" ? "OPD" : "IPD"
				);

				// Update appointment with Visit ID
				await prisma.appointment.update({
					where: { id: appointment.id },
					data: { visitId }
				});

				console.log(
					`✓ Updated appointment ${appointment.id} with Visit ID: ${visitId}`
				);
				successCount++;
			} catch (error) {
				console.error(
					`✗ Failed to update appointment ${appointment.id}:`,
					error
				);
				errorCount++;
			}
		}

		console.log(`\nMigration completed:`);
		console.log(`✓ Successfully updated: ${successCount} appointments`);
		console.log(`✗ Failed to update: ${errorCount} appointments`);

		if (errorCount > 0) {
			console.log(
				"\nPlease check the errors above and run the migration again if needed."
			);
		}
	} catch (error) {
		console.error("Migration failed:", error);
		throw error;
	}
}

// Run migrations if this file is executed directly
if (require.main === module) {
	async function runMigrations() {
		try {
			await migrateExistingPatientsToUHID();
			console.log("\n" + "=".repeat(50) + "\n");
			await migrateExistingAppointmentsToVisitID();
			console.log("\nAll migrations completed successfully!");
		} catch (error) {
			console.error("Migration failed:", error);
			process.exit(1);
		} finally {
			await prisma.$disconnect();
		}
	}

	runMigrations();
}
