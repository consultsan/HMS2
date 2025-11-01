import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { sendAppointmentReminder } from "../services/whatsapp.service";

const router = Router();
const prisma = new PrismaClient();

// Test endpoint to check reminder system
router.get("/debug", async (req, res) => {
	try {
		const now = new Date();
		console.log(`🔍 Debug check at: ${now.toISOString()}`);

		// Get all appointments for today
		const todayStart = new Date(now);
		todayStart.setHours(0, 0, 0, 0);
		const todayEnd = new Date(now);
		todayEnd.setHours(23, 59, 59, 999);

		const todayAppointments = await prisma.appointment.findMany({
			where: {
				scheduledAt: {
					gte: todayStart,
					lte: todayEnd
				}
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
			},
			orderBy: {
				scheduledAt: "asc"
			}
		});

		// Calculate time differences
		const appointmentsWithTimeDiff = todayAppointments.map(apt => {
			const timeDiff = apt.scheduledAt.getTime() - now.getTime();
			const hoursUntil = Math.round((timeDiff / (1000 * 60 * 60)) * 100) / 100;
			return {
				id: apt.id,
				patientName: apt.patient.name,
				patientPhone: apt.patient.phone,
				doctorName: apt.doctor.name,
				scheduledAt: apt.scheduledAt.toISOString(),
				scheduledAtLocal: apt.scheduledAt.toLocaleString(),
				status: apt.status,
				reminderSent: apt.reminderSent,
				hoursUntilAppointment: hoursUntil,
				needsReminder: hoursUntil >= 2.5 && hoursUntil <= 3.5 && !apt.reminderSent
			};
		});

		// Check what the reminder system would find
		const threeHoursFromNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
		const tolerance = 5 * 60 * 1000; // 5 minutes
		const startTime = new Date(threeHoursFromNow.getTime() - tolerance);
		const endTime = new Date(threeHoursFromNow.getTime() + tolerance);

		const appointmentsInWindow = await prisma.appointment.findMany({
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

		res.json({
			success: true,
			debugInfo: {
				currentTime: {
					utc: now.toISOString(),
					local: now.toString()
				},
				reminderWindow: {
					start: startTime.toISOString(),
					end: endTime.toISOString(),
					threeHoursFromNow: threeHoursFromNow.toISOString()
				},
				todayAppointments: appointmentsWithTimeDiff,
				appointmentsInReminderWindow: appointmentsInWindow.length,
				appointmentsNeedingReminders: appointmentsInWindow.map(apt => ({
					id: apt.id,
					patientName: apt.patient.name,
					patientPhone: apt.patient.phone,
					scheduledAt: apt.scheduledAt.toISOString(),
					scheduledAtLocal: apt.scheduledAt.toLocaleString(),
					status: apt.status,
					reminderSent: apt.reminderSent
				}))
			}
		});

	} catch (error: any) {
		console.error("Debug error:", error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

// Test sending reminder for specific appointment
router.post("/test/:appointmentId", async (req, res) => {
	try {
		const { appointmentId } = req.params;
		
		const appointment = await prisma.appointment.findUnique({
			where: { id: appointmentId },
			select: {
				id: true,
				scheduledAt: true,
				hospitalId: true,
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
		
		if (!appointment) {
			return res.status(404).json({
				success: false,
				message: "Appointment not found"
			});
		}
		
		const appointmentTime = appointment.scheduledAt.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true
		});
		
		const result = await sendAppointmentReminder(appointment.patient.phone, {
			patientName: appointment.patient.name,
			doctorName: appointment.doctor.name,
			appointmentDate: appointment.scheduledAt,
			appointmentTime: appointmentTime,
			hospitalId: appointment.hospitalId
		});
		
		res.json({
			success: true,
			message: "Test reminder sent",
			appointment: {
				id: appointment.id,
				patientName: appointment.patient.name,
				patientPhone: appointment.patient.phone,
				scheduledAt: appointment.scheduledAt.toISOString(),
				appointmentTime
			},
			result
		});
		
	} catch (error: any) {
		console.error("Test reminder error:", error);
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

export default router;

