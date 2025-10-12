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
      
      console.log(`Getting available slots for doctor ${doctorId} on date ${date}`);

      if (!doctorId || !date) {
        throw new AppError("Doctor ID and date are required", 400);
      }

      // No cache dependency - work like other controllers

      // Parse the input date and validate it (matching existing controller logic)
      let queryDate: Date;
      if (typeof date === "string") {
        // Try to parse as YYYY-MM-DD first (frontend format)
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          queryDate = new Date(`${date}T00:00:00.000Z`);
        } else {
          // Try to parse as dd/MM/yyyy (like existing controllers)
          const parts = date.split("/");
          if (parts.length === 3) {
            const [day, month, year] = parts;
            queryDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
          } else {
            // Try to parse as ISO or fallback
            queryDate = TimezoneUtil.parseAsUTC(date);
          }
        }
        if (isNaN(queryDate.getTime())) {
          throw new AppError("Invalid date format. Use YYYY-MM-DD, dd/MM/yyyy or ISO format", 400);
        }
      } else {
        throw new AppError("Date is required", 400);
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
        return res.status(200).json(
          new ApiResponse("Doctor is not available", {
            doctor: {
              id: doctor.id,
              name: doctor.name,
              specialisation: doctor.specialisation
            },
            date: TimezoneUtil.formatDateIST(queryDate),
            slots: [],
            message: "Doctor is not currently available for appointments"
          })
        );
      }
      
      // Check if date is in the past (using UTC like existing controllers)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (queryDate < today) {
        return res.status(200).json(
          new ApiResponse("No slots available for past dates", {
            doctor,
            date: TimezoneUtil.formatDateIST(queryDate),
            slots: [],
            message: "Cannot book appointments for past dates"
          })
        );
      }

      // Check if date is too far in the future (more than 3 months)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setUTCMonth(threeMonthsFromNow.getUTCMonth() + 3);
      if (queryDate > threeMonthsFromNow) {
        return res.status(200).json(
          new ApiResponse("No slots available for dates beyond 3 months", {
            doctor,
            date: TimezoneUtil.formatDateIST(queryDate),
            slots: [],
            message: "Cannot book appointments more than 3 months in advance"
          })
        );
      }

      // Check doctor's working hours for this day of the week
      const dayOfWeek = queryDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      console.log(`Looking for shifts for doctor ${doctorId} on ${dayOfWeek}`);
      
      const doctorShifts = await prisma.shift.findMany({
        where: {
          staffId: doctorId as string,
          day: dayOfWeek as any,
          status: "ACTIVE"
        },
        select: {
          startTime: true,
          endTime: true,
          shiftName: true
        }
      });
      
      console.log(`Found ${doctorShifts.length} shifts for doctor ${doctorId} on ${dayOfWeek}:`, doctorShifts);

      // If doctor has no shifts for this day, check if they have any shifts at all
      if (doctorShifts.length === 0) {
        console.log(`No shifts found for doctor ${doctorId} on ${dayOfWeek} - checking if doctor has any shifts`);
        
        // Check if doctor has any shifts at all
        const anyShifts = await prisma.shift.findFirst({
          where: {
            staffId: doctorId as string,
            status: "ACTIVE"
          },
          select: {
            day: true,
            shiftName: true
          }
        });

        if (!anyShifts) {
          console.log(`Doctor ${doctorId} has no shifts configured at all`);
          return res.status(200).json(
            new ApiResponse("Doctor has no working hours configured", {
              doctor,
              date: TimezoneUtil.formatDateIST(queryDate),
              slots: [],
              message: "Doctor has no working hours configured. Please contact the hospital."
            })
          );
        } else {
          console.log(`Doctor ${doctorId} has shifts on other days but not on ${dayOfWeek}`);
          return res.status(200).json(
            new ApiResponse("Doctor not available on this day", {
              doctor,
              date: TimezoneUtil.formatDateIST(queryDate),
              slots: [],
              message: `Doctor is not available on ${dayOfWeek}. Please select a different date.`
            })
          );
        }
      }

      const { start: startOfDay, end: endOfDay } = TimezoneUtil.createDateRangeUTC(queryDate);

      // Get existing appointments for the doctor on this date
      console.log(`Checking existing appointments for doctor ${doctorId} between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);
      
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
      
      // Check existing slots (same as staff system)
      const existingSlots = await prisma.slot.findMany({
        where: {
          doctorId: doctorId as string,
          timeSlot: {
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          appointment1: true,
          appointment2: true
        }
      });
      
      console.log(`Found ${existingAppointments.length} existing appointments and ${existingSlots.length} existing slots for doctor ${doctorId} on this date`);

      // Generate available slots based on doctor's working hours
      const availableSlots = [];
      const slotDuration = 15; // 15 minutes

      console.log(`Processing ${doctorShifts.length} shifts for doctor ${doctorId}`);

      try {
        // Process each shift for the doctor
        for (const shift of doctorShifts) {
        console.log(`Processing shift: ${shift.shiftName} (${shift.startTime} - ${shift.endTime})`);
        
        const [startHour, startMinute] = shift.startTime.split(':').map(Number);
        const [endHour, endMinute] = shift.endTime.split(':').map(Number);
        
        // Convert shift times to UTC for proper calculation
        const shiftStartUTC = new Date(queryDate);
        shiftStartUTC.setUTCHours(startHour - 5, startMinute, 0, 0); // IST to UTC conversion
        
        const shiftEndUTC = new Date(queryDate);
        shiftEndUTC.setUTCHours(endHour - 5, endMinute, 0, 0); // IST to UTC conversion

        // HARDCODE: Start 30 minutes earlier and end 30 minutes earlier for public appointments
        const publicStartUTC = new Date(shiftStartUTC);
        publicStartUTC.setUTCMinutes(publicStartUTC.getUTCMinutes() - 30); // Subtract 30 minutes to start
        
        const publicEndUTC = new Date(shiftEndUTC);
        publicEndUTC.setUTCMinutes(publicEndUTC.getUTCMinutes() - 30); // Subtract 30 minutes from end

        console.log(`Original shift times - Start: ${shiftStartUTC.toISOString()}, End: ${shiftEndUTC.toISOString()}`);
        console.log(`Public appointment times - Start: ${publicStartUTC.toISOString()}, End: ${publicEndUTC.toISOString()}`);

        // Generate slots for this shift using public times
        const currentSlot = new Date(publicStartUTC);
        let slotCount = 0;
        
        console.log(`Generating public slots from ${currentSlot.toISOString()} to ${publicEndUTC.toISOString()}`);
        
        while (currentSlot < publicEndUTC) {
          // Check if this slot is available (same logic as staff system)
          const isBookedBySlot = existingSlots.some(slot => {
            const slotTime = new Date(slot.timeSlot);
            // Check if slot is within 7.5 minutes of this slot (to account for 15-min slots)
            const timeDiff = Math.abs(slotTime.getTime() - currentSlot.getTime());
            const isWithinSlot = timeDiff < 7.5 * 60 * 1000;
            
            if (isWithinSlot) {
              // Check if slot is booked (same as staff system logic)
              return slot.appointment1 || slot.appointment2;
            }
            return false;
          });

          // Also check direct appointments (for backward compatibility)
          const isBookedByAppointment = existingAppointments.some(appointment => {
            const appointmentTime = new Date(appointment.scheduledAt);
            // Check if appointment is within 7.5 minutes of this slot (to account for 15-min slots)
            return Math.abs(appointmentTime.getTime() - currentSlot.getTime()) < 7.5 * 60 * 1000;
          });

          const isBooked = isBookedBySlot || isBookedByAppointment;

          if (!isBooked) {
            const slotTime = TimezoneUtil.formatTimeIST(currentSlot);
            const slotDateTime = currentSlot.toISOString();
            
            availableSlots.push({
              time: slotTime,
              datetime: slotDateTime,
              available: true
            });
            slotCount++;
            
            console.log(`Added slot: ${slotTime} (${slotDateTime})`);
          } else {
            console.log(`Slot ${TimezoneUtil.formatTimeIST(currentSlot)} is booked`);
          }

          // Move to next slot (15 minutes later)
          currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + slotDuration);
        }
        
        console.log(`Generated ${slotCount} available slots for shift ${shift.shiftName}`);
        }
      } catch (slotGenerationError: any) {
        console.error(`Error generating slots for doctor ${doctorId}:`, slotGenerationError);
        throw new AppError(`Failed to generate available slots: ${slotGenerationError.message}`, 500);
      }

      // Sort slots by time
      availableSlots.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

      // If no slots were generated, this might indicate an issue
      if (availableSlots.length === 0) {
        console.warn(`No slots generated for doctor ${doctorId} on ${date}. This might indicate an issue with shift configuration or slot generation.`);
      }

      const responseData = {
        doctor,
        date: TimezoneUtil.formatDateIST(queryDate),
        slots: availableSlots
      };

      // No cache dependency - work like other controllers

      // Determine appropriate message based on slot availability
      let message = "Available slots retrieved successfully";
      if (availableSlots.length === 0) {
        message = "No available slots for this date";
      } else {
        message = `${availableSlots.length} available slots found`;
      }

      console.log(`Returning ${availableSlots.length} slots for doctor ${doctorId} on ${date}`);

      res.status(200).json(
        new ApiResponse(message, responseData)
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
        source = "DIGITAL", // Default source to match frontend
        referralPersonName // Optional referral person name
      } = req.body;

      console.log(`Public appointment booking request:`, {
        name,
        phone,
        dob,
        gender,
        hospitalId,
        doctorId,
        scheduledAt,
        source,
        referralPersonName
      });

      // Debug timezone handling
      console.log(`ScheduledAt received: ${scheduledAt}`);
      console.log(`ScheduledAt as Date: ${new Date(scheduledAt)}`);
      console.log(`ScheduledAt ISO: ${new Date(scheduledAt).toISOString()}`);
      console.log(`ScheduledAt UTC: ${new Date(scheduledAt).getTime()}`);
      console.log(`ScheduledAt IST: ${new Date(scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

      // Validate required fields
      if (!name || !phone || !hospitalId || !doctorId || !scheduledAt) {
        throw new AppError("Name, phone, hospital ID, doctor ID, and scheduled time are required", 400);
      }

      // Validate phone number (10 digits)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(phone)) {
        throw new AppError("Phone number must be exactly 10 digits", 400);
      }

      // Validate scheduled date is not in the past (using UTC like existing controllers)
      const appointmentDate = new Date(scheduledAt);
      const now = new Date();
      if (appointmentDate < now) {
        throw new AppError("Cannot book appointments in the past", 400);
      }

      // Validate scheduled date is not too far in the future (more than 3 months)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setUTCMonth(threeMonthsFromNow.getUTCMonth() + 3);
      if (appointmentDate > threeMonthsFromNow) {
        throw new AppError("Cannot book appointments more than 3 months in advance", 400);
      }

      // Validate hospital exists
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
        select: { id: true, name: true }
      });

      if (!hospital) {
        throw new AppError("Hospital not found", 404);
      }

      // Validate doctor exists and belongs to the hospital (matching existing controller logic)
      const doctor = await prisma.hospitalStaff.findUnique({
        where: { id: doctorId },
        select: { 
          id: true, 
          name: true, 
          specialisation: true,
          hospitalId: true,
          status: true
        }
      });

      if (!doctor) {
        throw new AppError("Doctor not found", 404);
      }

      if (doctor.hospitalId !== hospitalId) {
        throw new AppError("Doctor does not belong to the selected hospital", 400);
      }

      if (doctor.status !== "ACTIVE") {
        throw new AppError("Doctor is not available for appointments", 400);
      }

      // For public appointments, always create a NEW patient record with the exact data entered
      // This ensures each appointment has its own patient record with the name entered by that specific patient
      console.log(`Public appointment - creating new patient record with exact data: ${name} (${phone})`);
      
      // Always create a new patient record for public appointments
      // This prevents updating existing patients and ensures each appointment has its own patient data
      
      // Generate UHID for new patient (matching existing controller logic)
      const uhid = await UhidGenerator.generateUHID(hospitalId);

      console.log(`Creating new patient with data:`, {
        name,
        phone,
        dob: dob ? new Date(dob) : new Date('1990-01-01'),
        gender: gender || null,
        hospitalId,
        uhid,
        registrationSource: source,
        referralPersonName: source === "REFERRAL" ? referralPersonName : null
      });

      const patient = await prisma.patient.create({
        data: {
          name,
          phone,
          dob: dob ? new Date(dob) : new Date('1990-01-01'),
          gender: gender || "OTHER", // Default to "OTHER" if not provided
          hospital: {
            connect: { id: hospitalId }
          },
          uhid,
          registrationMode: "OPD",
          registrationSource: source,
          registrationSourceDetails: `Public booking from ${source}`,
          referralPersonName: source === "REFERRAL" ? referralPersonName : null
          // createdBy is omitted for public bookings (no internal user)
        }
      });

      console.log(`Created new patient: ${patient.name} (ID: ${patient.id})`);

      // Validate patient has UHID (matching existing controller logic)
      if (!patient.uhid) {
        throw new AppError(
          "Patient UHID not found. Please ensure patient has a valid UHID.",
          400
        );
      }

      // Check for duplicate appointment (matching existing controller logic)
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          patientId: patient.id,
          doctorId: doctorId,
          scheduledAt: new Date(scheduledAt),
          status: {
            in: ["SCHEDULED", "CONFIRMED", "PENDING"]
          }
        }
      });

      if (existingAppointment) {
        throw new AppError("Appointment already exists for this patient, doctor, and time", 400);
      }

      // Generate Visit ID
      const visitId = await UhidGenerator.generateVisitID(
        patient.uhid!,
        "OPD"
      );

      // Create appointment with transaction (matching existing controller logic)
      console.log(`Creating appointment for patient: ${patient.name} (ID: ${patient.id})`);
      const appointment = await prisma.$transaction(async (prisma) => {
        const appointment = await prisma.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: doctorId,
            hospitalId: hospitalId,
            visitType: "OPD",
            scheduledAt: new Date(scheduledAt),
            status: "SCHEDULED",
            visitId,
            createdBy: null, // Public booking, no internal user
            source: source, // Add source field
            vitals: {
              create: new Array<Vital>() // Create empty vitals array like existing controller
            },
            attachments: { 
              create: new Array<AppointmentAttachment>() // Create empty attachments array like existing controller
            }
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

        return appointment;
      });

      // Debug the stored appointment time
      console.log(`Stored appointment time: ${appointment.scheduledAt}`);
      console.log(`Stored appointment ISO: ${appointment.scheduledAt.toISOString()}`);
      console.log(`Stored appointment IST: ${appointment.scheduledAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);

      // Create slot record to block the time for staff members (same as staff system)
      console.log(`Creating slot for appointment: ${appointment.id} at time: ${scheduledAt}`);
      const slot = await prisma.slot.create({
        data: {
          doctorId: doctorId,
          timeSlot: new Date(scheduledAt),
          appointment1Id: appointment.id,
          appointment2Id: null // Public appointments only use appointment1
        }
      });
      console.log(`Successfully created slot: ${slot.id} for appointment: ${appointment.id}`);

      // No Redis dependency - work like other controllers

      // No cache dependency - work like other controllers

      // Send WhatsApp notification using exact data from public form
      try {
        if (phone) { // Use phone from public form
          console.log(`Sending WhatsApp notification to: ${phone} for patient: ${name}`);
          // Convert UTC appointment time to IST for both time and date (matching existing controller)
          const appointmentIST = TimezoneUtil.toIST(appointment.scheduledAt);
          const appointmentTime = TimezoneUtil.formatTimeIST(appointment.scheduledAt);

          // Check if this is a follow-up appointment (matching existing controller logic)
          if (appointment.visitType === "FOLLOW_UP") {
            // Send follow-up specific WhatsApp notification
            await sendFollowUpAppointmentNotification(phone, {
              patientName: name, // Use name from public form
              doctorName: appointment.doctor.name,
              appointmentDate: appointmentIST,
              appointmentTime: appointmentTime
            });
          } else {
            // Send regular appointment notification
            await sendAppointmentNotification(phone, {
              patientName: name, // Use name from public form
              doctorName: appointment.doctor.name,
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
            visitId: appointment.visitId,
            patientName: name, // Use name from public form
            patientPhone: phone, // Use phone from public form
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
          source: appointment.source || "PUBLIC_BOOKING"
        })
      );
    } catch (error: any) {
      console.error("Error fetching appointment status:", error);
      errorHandler(error, res);
    }
  }
}
