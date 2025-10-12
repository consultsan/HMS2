import { Request, Response } from "express";
import { PrismaClient, Vital, AppointmentAttachment } from "@prisma/client";
import ApiResponse from "../utils/ApiResponse";
import AppError from "../utils/AppError";
import errorHandler from "../utils/errorHandler";
import { UhidGenerator } from "../utils/uhidGenerator";
import { TimezoneUtil } from "../utils/timezone.util";
import { sendAppointmentNotification, sendFollowUpAppointmentNotification } from "../services/whatsapp.service";

const prisma = new PrismaClient();

export class PublicAppointmentController {
  // Get all hospitals for public booking
  async getHospitals(req: Request, res: Response) {
    try {
      const hospitals = await prisma.hospital.findMany({
        where: {
          status: "ACTIVE"
        },
        select: {
          id: true,
          name: true,
          address: true,
          contactNumber: true,
          email: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.status(200).json(
        new ApiResponse("Hospitals retrieved successfully", hospitals)
      );
    } catch (error: any) {
      console.error("Error fetching hospitals:", error);
      errorHandler(error, res);
    }
  }

  // Get doctors by hospital for public booking
  async getDoctorsByHospital(req: Request, res: Response) {
    try {
      const { hospitalId } = req.params;

      if (!hospitalId) {
        throw new AppError("Hospital ID is required", 400);
      }

      // Verify hospital exists
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: { id: true, name: true }
      });

      if (!hospital) {
        throw new AppError("Hospital not found", 404);
      }

      const doctors = await prisma.hospitalStaff.findMany({
        where: {
          hospitalId: hospitalId,
          role: "DOCTOR",
          status: "ACTIVE"
        },
        select: {
          id: true,
          name: true,
          specialisation: true,
          shifts: {
            select: {
              day: true,
              startTime: true,
              endTime: true,
              shiftName: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      res.status(200).json(
        new ApiResponse("Doctors retrieved successfully", {
          hospital,
          doctors
        })
      );
    } catch (error: any) {
      console.error("Error fetching doctors:", error);
      errorHandler(error, res);
    }
  }

  // Get available slots for a doctor on a specific date (using staff system logic)
  async getAvailableSlots(req: Request, res: Response) {
    try {
      const { doctorId, date } = req.query;
      
      console.log(`Getting available slots for doctor ${doctorId} on date ${date}`);

      if (!doctorId || !date) {
        throw new AppError("Doctor ID and date are required", 400);
      }

      // Verify doctor exists and is active
      const doctor = await prisma.hospitalStaff.findUnique({
        where: { id: doctorId as string },
        select: { 
          id: true, 
          name: true, 
          specialisation: true,
          status: true,
          hospitalId: true
        }
      });

      if (!doctor) {
        throw new AppError("Doctor not found", 404);
      }

      if (doctor.status !== "ACTIVE") {
        throw new AppError("Doctor is not available for appointments", 400);
      }

      // Use staff system logic by calling it internally
      const staffSlots = await this.getStaffSystemSlots(doctorId as string, date as string, doctor.hospitalId);
      
      // Convert staff system response to public system format
      const publicSlots = staffSlots.map((slot: string) => ({
        time: slot,
        datetime: new Date(`${date}T${slot}:00.000Z`).toISOString(),
        available: true
      }));

      const responseData = {
        doctor: {
          id: doctor.id,
          name: doctor.name,
          specialisation: doctor.specialisation
        },
        date: date,
        slots: publicSlots
      };

      res.status(200).json(new ApiResponse("Available slots retrieved successfully", responseData));
    } catch (error: any) {
      console.error("Error fetching available slots:", error);
      errorHandler(error, res);
    }
  }

  // Helper method to call staff system logic (copied from HospitalStaff.controller.ts)
  private async getStaffSystemSlots(doctorId: string, date: string, hospitalId: string): Promise<string[]> {
    try {
      // Parse the input date and validate it (matching existing controller logic)
      const queryDate = new Date(date);
      if (isNaN(queryDate.getTime())) {
        throw new AppError("Invalid date format. Please use YYYY-MM-DD format", 400);
      }

      const day = new Intl.DateTimeFormat("en-US", { weekday: "long" })
        .format(queryDate)
        .toUpperCase() as any;

      const shifts = await prisma.shift.findMany({
        where: {
          staffId: doctorId,
          day
        }
      });

      if (shifts.length === 0) {
        throw new AppError("No shift found for this doctor on the given date", 400);
      }

      // Create proper start and end of day timestamps
      const startOfDay = new Date(queryDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(queryDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId,
          scheduledAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });

      const bookedSlots = new Set(
        appointments.map((appt: any) =>
          new Date(appt.scheduledAt).toISOString()
        )
      );

      const availableSlots: string[] = [];

      shifts.forEach((shift) => {
        const start = new Date(`${queryDate.toISOString().split('T')[0]}T${shift.startTime}:00.000Z`);
        const end = new Date(`${queryDate.toISOString().split('T')[0]}T${shift.endTime}:00.000Z`);

        // If end time is before start time, it means it's an overnight shift
        if (end < start) {
          end.setDate(end.getDate() + 1);
        }

        let current = new Date(start);
        while (current < end) {
          const slotTime = current.toISOString();
          if (!bookedSlots.has(slotTime)) {
            availableSlots.push(
              current.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
                timeZone: 'UTC'
              })
            );
          }
          current = new Date(current.getTime() + 15 * 60 * 1000); // Add 15 minutes
        }
      });

      return availableSlots;
    } catch (error: any) {
      console.error("Error in getStaffSystemSlots:", error);
      throw new AppError(`Failed to get staff system slots: ${error.message}`, 500);
    }
  }

  // Book appointment from public interface
  async bookPublicAppointment(req: Request, res: Response) {
    try {
      const {
        name,
        phone,
        dob,
        gender,
        hospitalId,
        doctorId,
        scheduledAt,
        source = "WEBSITE",
        referralPersonName
      } = req.body;

      console.log(`Public appointment booking request:`, {
        name,
        phone,
        doctorId,
        hospitalId,
        scheduledAt,
        source
      });

      // Validate required fields
      if (!name || !phone || !doctorId || !hospitalId || !scheduledAt) {
        throw new AppError("Name, phone, doctor ID, hospital ID, and scheduled time are required", 400);
      }

      // Validate phone number format (10 digits)
      if (!/^\d{10}$/.test(phone)) {
        throw new AppError("Phone number must be exactly 10 digits", 400);
      }

      // Validate scheduled time is not in the past
      const appointmentTime = new Date(scheduledAt);
      if (appointmentTime <= new Date()) {
        throw new AppError("Cannot book appointments in the past", 400);
      }

      // Verify doctor exists and is active
      const doctor = await prisma.hospitalStaff.findUnique({
        where: { id: doctorId },
        select: { 
          id: true, 
          name: true, 
          specialisation: true,
          status: true,
          hospitalId: true
        }
      });

      if (!doctor) {
        throw new AppError("Doctor not found", 404);
      }

      if (doctor.status !== "ACTIVE") {
        throw new AppError("Doctor is not available for appointments", 400);
      }

      // Verify hospital exists
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: { id: true, name: true }
      });

      if (!hospital) {
        throw new AppError("Hospital not found", 404);
      }

      // Check if appointment time conflicts with existing appointments
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          doctorId,
          scheduledAt: {
            gte: new Date(appointmentTime.getTime() - 7.5 * 60 * 1000), // 7.5 minutes before
            lte: new Date(appointmentTime.getTime() + 7.5 * 60 * 1000)  // 7.5 minutes after
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED", "PENDING"]
          }
        }
      });

      if (conflictingAppointment) {
        throw new AppError("This time slot is already booked. Please select a different time.", 400);
      }

      // Generate UHID and Visit ID
      const uhid = `UHID${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const visitId = `VISIT${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // For public appointments, always create a NEW patient record with the exact data entered
      // This allows same phone number with different names (family members, etc.)
      console.log(`Public appointment - creating new patient record with exact data: ${name} (${phone})`);
      
      const patient = await prisma.patient.create({
        data: {
          name,
          phone,
          dob: dob ? new Date(dob) : new Date('1990-01-01'),
          gender: gender || "OTHER",
          hospital: {
            connect: { id: hospitalId }
          },
          uhid,
          registrationMode: "OPD",
          registrationSource: source,
          registrationSourceDetails: `Public booking from ${source}`,
          referralPersonName: source === "REFERRAL" ? referralPersonName : null
        }
      });
      
      console.log(`Created patient: ${patient.name} (${patient.uhid})`);

      // Create appointment with slot blocking
      const appointment = await prisma.$transaction(async (prisma) => {
        const appointment = await prisma.appointment.create({
          data: {
            patientId: patient.id,
            doctorId,
            hospitalId,
            scheduledAt: new Date(scheduledAt),
            status: "SCHEDULED",
            visitType: "OPD",
            visitId,
            createdBy: null, // Public booking, no internal user
            source: source,
            vitals: {
              create: []
            }
          }
        });

        // Create slot record to block the time for staff members (same as staff system)
        await prisma.slot.create({
          data: {
            doctorId: doctorId,
            timeSlot: new Date(scheduledAt),
            appointment1Id: appointment.id,
            appointment2Id: null // Public appointments only use appointment1
          }
        });

        return appointment;
      });

      console.log(`Created appointment: ${appointment.id} for patient: ${patient.name}`);

      // Send WhatsApp notification (same format as staff system)
      try {
        if (phone) {
          console.log(`Sending WhatsApp notification to: ${phone} for patient: ${name}`);
          
          // Use EXACT same time formatting as staff system
          const appointmentIST = TimezoneUtil.toIST(appointment.scheduledAt);
          const appointmentTime = TimezoneUtil.formatTimeUTC(appointment.scheduledAt);

          if (appointment.visitType === "FOLLOW_UP") {
            await sendFollowUpAppointmentNotification(phone, {
              patientName: name,
              doctorName: doctor.name,
              appointmentDate: appointmentIST,
              appointmentTime: appointmentTime
            });
          } else {
            await sendAppointmentNotification(phone, {
              patientName: name,
              doctorName: doctor.name,
              appointmentDate: appointmentIST,
              appointmentTime: appointmentTime
            });
          }
        }
      } catch (whatsappError) {
        console.error("WhatsApp notification failed:", whatsappError);
        // Don't fail the appointment booking if WhatsApp fails
      }

      res.status(201).json(
        new ApiResponse("Appointment booked successfully", {
          appointment: {
            id: appointment.id,
            appointmentId: appointment.id,
            visitId: appointment.visitId,
            patientName: patient.name,
            doctorName: doctor.name,
            doctorSpecialization: doctor.specialisation,
            hospitalName: hospital.name,
            scheduledAt: appointment.scheduledAt,
            status: appointment.status,
            source: appointment.source
          }
        })
      );
    } catch (error: any) {
      console.error("Error booking public appointment:", error);
      errorHandler(error, res);
    }
  }

  // Get appointment status by visit ID (for patients to check their appointment)
  async getAppointmentStatus(req: Request, res: Response) {
    try {
      const { visitId } = req.params;

      if (!visitId) {
        throw new AppError("Visit ID is required", 400);
      }

      const appointment = await prisma.appointment.findUnique({
        where: { visitId },
        include: {
          patient: {
            select: {
              name: true,
              phone: true
            }
          },
          doctor: {
            select: {
              name: true,
              specialisation: true
            }
          },
          hospital: {
            select: {
              name: true,
              address: true,
              contactNumber: true
            }
          }
        }
      });

      if (!appointment) {
        throw new AppError("Appointment not found", 404);
      }

      res.status(200).json(
        new ApiResponse("Appointment status retrieved successfully", {
          visitId: appointment.visitId,
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          doctorSpecialization: appointment.doctor.specialisation,
          hospitalName: appointment.hospital.name,
          scheduledAt: appointment.scheduledAt,
          status: appointment.status,
          source: appointment.source || "PUBLIC_BOOKING"
        })
      );
    } catch (error: any) {
      console.error("Error fetching appointment status:", error);
      errorHandler(error, res);
    }
  }
}