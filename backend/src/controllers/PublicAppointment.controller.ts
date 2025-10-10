import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import ApiResponse from "../utils/ApiResponse";
import AppError from "../utils/AppError";
import errorHandler from "../utils/errorHandler";
import { UhidGenerator } from "../utils/uhidGenerator";
import { TimezoneUtil } from "../utils/timezone.util";
import { sendAppointmentNotification } from "../services/whatsapp.service";
import redisClient from "../utils/redisClient";

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
          specialisation: true
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

  // Get available slots for a doctor on a specific date
  async getAvailableSlots(req: Request, res: Response) {
    try {
      const { doctorId, date } = req.query;

      if (!doctorId || !date) {
        throw new AppError("Doctor ID and date are required", 400);
      }

      // Check cache first
      const cacheKey = `slots_${doctorId}_${date}`;
      try {
        const cachedSlots = await redisClient.get(cacheKey);
        if (cachedSlots) {
          const parsedSlots = JSON.parse(cachedSlots);
          return res.status(200).json(
            new ApiResponse("Available slots retrieved successfully (cached)", parsedSlots)
          );
        }
      } catch (cacheError) {
        console.error("Cache read error:", cacheError);
        // Continue with database query if cache fails
      }

      // Verify doctor exists
      const doctor = await prisma.hospitalStaff.findUnique({
        where: { id: doctorId as string },
        select: { id: true, name: true, specialisation: true }
      });

      if (!doctor) {
        throw new AppError("Doctor not found", 404);
      }

      // Parse the input date and create start/end of day in UTC
      const queryDate = TimezoneUtil.parseAsUTC(date as string);
      const { start: startOfDay, end: endOfDay } = TimezoneUtil.createDateRangeUTC(queryDate);

      // Get existing appointments for the doctor on this date
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          doctorId: doctorId as string,
          scheduledAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          status: {
            in: ["SCHEDULED", "CONFIRMED", "PENDING", "DIAGNOSED"]
          }
        },
        select: {
          scheduledAt: true
        }
      });

      // Generate available slots (assuming 30-minute slots from 9 AM to 6 PM IST)
      const availableSlots = [];
      const startHour = 9; // 9 AM IST
      const endHour = 18; // 6 PM IST
      const slotDuration = 30; // 30 minutes

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          // Create slot time in IST first, then convert to UTC for database storage
          const slotTimeIST = new Date(queryDate);
          slotTimeIST.setUTCHours(hour - 5, minute, 0, 0); // Convert IST to UTC (IST = UTC + 5:30)
          
          // Create the actual UTC time for database comparison
          const slotTimeUTC = new Date(slotTimeIST);

          // Check if this slot is available
          const isBooked = existingAppointments.some(appointment => {
            const appointmentTime = new Date(appointment.scheduledAt);
            // Check if appointment is within 15 minutes of this slot (to account for 30-min slots)
            return Math.abs(appointmentTime.getTime() - slotTimeUTC.getTime()) < 15 * 60 * 1000;
          });

          if (!isBooked) {
            availableSlots.push({
              time: TimezoneUtil.formatTimeIST(slotTimeUTC),
              datetime: slotTimeUTC.toISOString(),
              available: true
            });
          }
        }
      }

      const responseData = {
        doctor,
        date: TimezoneUtil.formatDateIST(queryDate),
        slots: availableSlots
      };

      // Cache the result for 5 minutes
      try {
        await redisClient.setex(cacheKey, 300, JSON.stringify(responseData)); // 5 minutes cache
      } catch (cacheError) {
        console.error("Cache write error:", cacheError);
        // Continue with response even if cache fails
      }

      res.status(200).json(
        new ApiResponse("Available slots retrieved successfully", responseData)
      );
    } catch (error: any) {
      console.error("Error fetching available slots:", error);
      errorHandler(error, res);
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
        source = "WEBSITE", // Default source
        referralPersonName // Optional referral person name
      } = req.body;

      // Validate required fields
      if (!name || !phone || !hospitalId || !doctorId || !scheduledAt) {
        throw new AppError("Name, phone, hospital ID, doctor ID, and scheduled time are required", 400);
      }

      // Validate phone number (10 digits)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        throw new AppError("Phone number must be exactly 10 digits", 400);
      }

      // Validate hospital exists
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: { id: true, name: true }
      });

      if (!hospital) {
        throw new AppError("Hospital not found", 404);
      }

      // Validate doctor exists and belongs to the hospital
      const doctor = await prisma.hospitalStaff.findUnique({
        where: { id: doctorId },
        select: { 
          id: true, 
          name: true, 
          specialisation: true,
          hospitalId: true
        }
      });

      if (!doctor) {
        throw new AppError("Doctor not found", 404);
      }

      if (doctor.hospitalId !== hospitalId) {
        throw new AppError("Doctor does not belong to the selected hospital", 400);
      }

      // Check if patient already exists with this phone number
      let patient = await prisma.patient.findFirst({
        where: {
          phone: phone,
          hospitalId: hospitalId
        }
      });

      // If patient doesn't exist, create new patient
      if (!patient) {
        // Generate UHID for new patient
        const uhid = await UhidGenerator.generateUHID(hospitalId);

        patient = await prisma.patient.create({
          data: {
            name,
            phone,
            dob: dob ? new Date(dob) : new Date('1990-01-01'),
            gender: gender || null,
            hospitalId,
            uhid,
            registrationMode: "OPD",
            registrationSource: source,
            registrationSourceDetails: `Public booking from ${source}`,
            referralPersonName: source === "REFERRAL" ? referralPersonName : null,
            createdBy: null // Public booking, no internal user
          }
        });
      }

      // Generate Visit ID
      const visitId = await UhidGenerator.generateVisitID(
        patient.uhid!,
        "OPD"
      );

      // Create appointment
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctorId,
          hospitalId: hospitalId,
          visitType: "OPD",
          scheduledAt: new Date(scheduledAt),
          status: "SCHEDULED",
          visitId,
          createdBy: null // Public booking, no internal user
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phone: true,
              uhid: true
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
              specialisation: true
            }
          },
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              contactNumber: true
            }
          }
        }
      });

      // Clear cache for this doctor's slots to ensure real-time availability
      try {
        const cacheKey = `slots_${doctorId}_${new Date(scheduledAt).toISOString().split('T')[0]}`;
        await redisClient.del(cacheKey);
        console.log(`Cache cleared for doctor ${doctorId} on ${new Date(scheduledAt).toISOString().split('T')[0]}`);
      } catch (cacheError) {
        console.error("Cache clearing failed:", cacheError);
        // Don't fail the appointment if cache clearing fails
      }

      // Send WhatsApp notification
      try {
        await sendAppointmentNotification(
          appointment.patient.phone,
          {
            patientName: appointment.patient.name,
            doctorName: appointment.doctor.name,
            appointmentDate: appointment.scheduledAt,
            appointmentTime: TimezoneUtil.formatTimeIST(appointment.scheduledAt)
          }
        );
      } catch (whatsappError) {
        console.error("WhatsApp notification failed:", whatsappError);
        // Don't fail the appointment if WhatsApp fails
      }

      res.status(201).json(
        new ApiResponse("Appointment booked successfully", {
          appointment: {
            id: appointment.id,
            visitId: appointment.visitId,
            patientName: appointment.patient.name,
            patientPhone: appointment.patient.phone,
            doctorName: appointment.doctor.name,
            doctorSpecialization: appointment.doctor.specialisation,
            hospitalName: appointment.hospital.name,
            scheduledAt: appointment.scheduledAt,
            status: appointment.status,
            source: source
          }
        })
      );
    } catch (error: any) {
      console.error("Error booking appointment:", error);
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
          source: "PUBLIC_BOOKING"
        })
      );
    } catch (error: any) {
      console.error("Error fetching appointment status:", error);
      errorHandler(error, res);
    }
  }
}
