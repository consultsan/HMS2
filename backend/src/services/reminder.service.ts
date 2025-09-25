import { PrismaClient } from "@prisma/client";
import { sendAppointmentReminder } from "./whatsapp.service";
import { TimezoneUtil } from "../utils/timezone.util";

const prisma = new PrismaClient();

export class ReminderService {
	private static interval: NodeJS.Timeout | null = null;
	private static isRunning = false;

	/**
	 * Start the reminder service
	 */
	static start() {
		if (this.isRunning) {
			console.log("⚠️ Reminder service is already running");
			return;
		}

		console.log("🚀 Starting appointment reminder service...");
		
		// Run immediately
		this.checkReminders();
		
		// Then run every 2 minutes
		this.interval = setInterval(() => {
			this.checkReminders();
		}, 2 * 60 * 1000); // 2 minutes

		this.isRunning = true;
		console.log("✅ Reminder service started (checking every 2 minutes)");
	}

	/**
	 * Stop the reminder service
	 */
	static stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		this.isRunning = false;
		console.log("🛑 Reminder service stopped");
	}

	/**
	 * Check for appointments needing reminders
	 */
	static async checkReminders() {
		try {
			console.log("🔍 Checking for 3-hour reminders...");

			const now = TimezoneUtil.nowUTC();
			const nowIST = TimezoneUtil.nowIST();
			
			console.log(`⏰ Current time (UTC): ${now.toISOString()}`);
			console.log(`⏰ Current time (IST): ${nowIST.toISOString()}`);

			// Find appointments that are exactly 3 hours away (with 5-minute tolerance)
			// Use IST time for calculations
			const threeHoursFromNow = new Date(nowIST.getTime() + (3 * 60 * 60 * 1000));
			const tolerance = 5 * 60 * 1000; // 5 minutes
			
			const startTime = new Date(threeHoursFromNow.getTime() - tolerance);
			const endTime = new Date(threeHoursFromNow.getTime() + tolerance);

			console.log(`🎯 Looking for appointments between ${startTime.toISOString()} and ${endTime.toISOString()}`);

			// Get appointments that need reminders
			const appointments = await prisma.appointment.findMany({
				where: {
					scheduledAt: {
						gte: startTime,
						lte: endTime
					},
					status: {
						in: ["CONFIRMED", "SCHEDULED"]
					},
					reminderSent: false
				},
				include: {
					patient: {
						select: {
							name: true,
							phone: true
						}
					},
					doctor: {
						select: {
							name: true
						}
					}
				}
			});

			console.log(`📅 Found ${appointments.length} appointments needing reminders`);

			// Send reminders
			for (const appointment of appointments) {
				try {
					const timeDiff = appointment.scheduledAt.getTime() - nowIST.getTime();
					const hoursUntil = Math.round((timeDiff / (1000 * 60 * 60)) * 100) / 100;

					console.log(`📱 Sending reminder to ${appointment.patient.name} - ${hoursUntil} hours until appointment`);

					// Format time for display (convert to IST)
					const appointmentIST = TimezoneUtil.toIST(appointment.scheduledAt);
					const appointmentTime = TimezoneUtil.formatTimeUTC(appointment.scheduledAt);

					// Send WhatsApp reminder
					const result = await sendAppointmentReminder(appointment.patient.phone, {
						patientName: appointment.patient.name,
						doctorName: appointment.doctor.name,
						appointmentDate: appointmentIST,
						appointmentTime: appointmentTime
					});

					if (result.success) {
						// Mark as reminded
						await prisma.appointment.update({
							where: { id: appointment.id },
							data: { reminderSent: true }
						});
						console.log(`✅ Reminder sent to ${appointment.patient.name}`);
					} else {
						console.error(`❌ Failed to send reminder to ${appointment.patient.name}:`, result.error);
					}

					// Small delay between messages
					await new Promise(resolve => setTimeout(resolve, 1000));

				} catch (error) {
					console.error(`❌ Error sending reminder for appointment ${appointment.id}:`, error);
				}
			}

		} catch (error) {
			console.error("❌ Error in reminder check:", error);
		}
	}

	/**
	 * Get service status
	 */
	static getStatus() {
		return {
			isRunning: this.isRunning,
			nextCheck: this.isRunning ? "Every 2 minutes" : "Not running"
		};
	}

	/**
	 * Manually trigger reminder check
	 */
	static async triggerCheck() {
		console.log("🔧 Manually triggering reminder check...");
		await this.checkReminders();
	}
}