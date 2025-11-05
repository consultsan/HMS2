import { Request, Response } from "express";
import { UserRole, Prisma, Slot, HospitalStaff } from "@prisma/client";
import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";

const roles: string[] = [
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.SALES_PERSON,
];

export class SlotController {
    // Create a new slot
    async createSlot(req: Request, res: Response) {
        if (req.user && roles.includes(req.user.role)) {
            try {
                const { id } = req.params as Pick<HospitalStaff, "id">
                const { timeSlot, appointment1Id, appointment2Id } = req.body as Pick<Slot, "timeSlot" | "appointment1Id" | "appointment2Id">;

                if (!id || !timeSlot) {
                    throw new AppError("Doctor ID and time slot are required", 400);
                }

                // Validate that the doctor exists and belongs to the hospital
                const doctor = await prisma.hospitalStaff.findFirst({
                    where: {
                        id,
                        role: UserRole.DOCTOR,
                        hospitalId: req.user.hospitalId
                    }
                });

                if (!doctor) {
                    throw new AppError("Invalid doctor ID or doctor not found in this hospital", 404);
                }

                const slot = await prisma.slot.create({
                    data: {
                        doctorId: id,
                        timeSlot: new Date(timeSlot),
                        appointment1Id,
                        appointment2Id
                    }
                });

                res.status(201).json(new ApiResponse("Slot created successfully", slot));
            } catch (error: any) {
                console.error("Create slot error:", error);
                res.status(500)
                    .json(new ApiResponse(error.message || "Internal Server Error"));
            }
        } else {
            console.log(req.user,req.user?.role);
            res.status(403).json(new ApiResponse("Unauthorized access"));
        }
    }

    // Get all slots for a doctor
    async getSlotsByDoctor(req: Request, res: Response) {
        if (req.user && roles.includes(req.user.role)) {
            try {
                const { id } = req.params as Pick<HospitalStaff, "id">
                const { startDate, endDate } = req.query as { startDate: string, endDate: string };
                // Validate that the doctor exists and belongs to the hospital
                const doctor = await prisma.hospitalStaff.findFirst({
                    where: {
                        id,
                        role: UserRole.DOCTOR,
                        hospitalId: req.user.hospitalId
                    }
                });

                if (!doctor) {
                    throw new AppError("Invalid doctor ID or doctor not found in this hospital", 404);
                }

                const whereClause: Prisma.SlotWhereInput = {
                    doctorId: id
                };

                // Add date range filter if provided
                if (startDate && endDate) {
                    whereClause.timeSlot = {
                        gte: new Date(startDate as string),
                        lte: new Date(endDate as string)
                    };
                }

                // Get slots from Slot table
                const slots = await prisma.slot.findMany({
                    where: whereClause,
                    include: {
                        appointment1: true,
                        appointment2: true
                    },
                    orderBy: {
                        timeSlot: 'desc'
                    }
                });

                // Also get all appointments directly to catch appointments without Slot records
                const appointmentWhereClause: Prisma.AppointmentWhereInput = {
                    doctorId: id
                };

                if (startDate && endDate) {
                    appointmentWhereClause.scheduledAt = {
                        gte: new Date(startDate as string),
                        lte: new Date(endDate as string)
                    };
                }

                const appointments = await prisma.appointment.findMany({
                    where: appointmentWhereClause,
                    select: {
                        id: true,
                        scheduledAt: true
                    },
                    orderBy: {
                        scheduledAt: 'desc'
                    }
                });

                // Create a map of appointment times to track which slots are booked
                const appointmentTimesMap = new Map<string, string[]>();
                appointments.forEach(appt => {
                    const timeSlot = new Date(appt.scheduledAt).toISOString();
                    if (!appointmentTimesMap.has(timeSlot)) {
                        appointmentTimesMap.set(timeSlot, []);
                    }
                    appointmentTimesMap.get(timeSlot)!.push(appt.id);
                });

                // Create a map of slots by timeSlot for quick lookup
                const slotsByTime = new Map<string, any>();
                slots.forEach(slot => {
                    const timeSlot = new Date(slot.timeSlot).toISOString();
                    slotsByTime.set(timeSlot, slot);
                });

                // Combine slots and appointments: if an appointment exists but no slot, create a virtual slot entry
                const allBookedSlots: any[] = [];
                
                // Add existing slots
                slots.forEach(slot => {
                    allBookedSlots.push(slot);
                });

                // Add appointments that don't have corresponding slots
                appointmentTimesMap.forEach((appointmentIds, timeSlot) => {
                    if (!slotsByTime.has(timeSlot)) {
                        // Create a virtual slot entry for appointments without Slot records
                        allBookedSlots.push({
                            id: `virtual-${appointmentIds[0]}`,
                            timeSlot: new Date(timeSlot),
                            doctorId: id,
                            appointment1Id: appointmentIds[0],
                            appointment2Id: appointmentIds[1] || null,
                            appointment1: appointmentIds[0] ? { id: appointmentIds[0] } : null,
                            appointment2: appointmentIds[1] ? { id: appointmentIds[1] } : null,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                });

                // Sort by timeSlot descending
                allBookedSlots.sort((a, b) => {
                    const timeA = new Date(a.timeSlot).getTime();
                    const timeB = new Date(b.timeSlot).getTime();
                    return timeB - timeA;
                });

                res.status(200).json(new ApiResponse("Slots fetched successfully", allBookedSlots));
            } catch (error: any) {
                console.error("Get slots error:", error);
                res.status(error.code || 500)
                    .json(new ApiResponse(error.message || "Internal Server Error"));
            }
        } else {
            res.status(403).json(new ApiResponse("Unauthorized access", null));
        }
    }

    // Update a slot
    async updateSlot(req: Request, res: Response) {
        if (req.user && roles.includes(req.user.role)) {
            try {
                const { id } = req.params;
                const { timeSlot, appointment1Id, appointment2Id } = req.body as Partial<Slot>;

                // First check if the slot exists and belongs to a doctor in the user's hospital
                const existingSlot = await prisma.slot.findFirst({
                    where: {
                        id
                    }
                });

                if (!existingSlot) {
                    throw new AppError("Slot not found or not accessible", 404);
                }

                const slot = await prisma.slot.update({
                    where: { id },
                    data: {
                        timeSlot,
                        appointment1Id,
                        appointment2Id
                    }
                });

                res.status(200).json(new ApiResponse("Slot updated successfully", slot));
            } catch (error: any) {
                console.error("Update slot error:", error);
                res.status(error.code || 500)
                    .json(new ApiResponse(error.message || "Internal Server Error"));
            }
        } else {
            res.status(403).json(new ApiResponse("Unauthorized access", null));
        }
    }

    async updateTimeSlotByAppointmentId(req: Request, res: Response) {
        if (req.user && roles.includes(req.user.role)) {
            try {
                const { timeSlot, appointmentId } = req.body as {
                    timeSlot: Date,
                    appointmentId: string
                }
                console.log("timeSlot", timeSlot);
                console.log("appointmentId", appointmentId);

                const slot = await prisma.slot.findFirst({
                    where: {
                        OR: [
                            { appointment1Id: appointmentId },
                            { appointment2Id: appointmentId }
                        ]
                    }
                });

                if (!slot) {
                    throw new AppError("No slot found for this appointment", 404);
                }

                if (slot.appointment2Id) {
                    if (slot.appointment2Id === appointmentId) {
                        await prisma.slot.update({
                            where: { id: slot.id },
                            data: { appointment2Id: null }
                        });
                    } else {
                        await prisma.slot.update({
                            where: { id: slot.id },
                            data: {
                                appointment1Id: slot.appointment2Id,
                                appointment2Id: null
                            }
                        });
                    }
                    await prisma.slot.create({
                        data: {
                            timeSlot,
                            appointment1Id: appointmentId,
                            doctorId: slot.doctorId
                        }
                    })
                } else {
                    await prisma.slot.update({
                        where: { id: slot.id },
                        data: { timeSlot }
                    });
                }
                res.status(200).json(new ApiResponse("Slot updated successfully"));
            } catch (error: any) {
                console.error("Update slot error:", error);
                res.status(error.code || 500)
                    .json(new ApiResponse(error.message || "Internal Server Error"));
            }
        } else {
            res.status(403).json(new ApiResponse("Unauthorized access", null));
        }
    }

    // Delete a slot
    async deleteSlot(req: Request, res: Response) {
        if (req.user && roles.includes(req.user.role)) {
            try {
                const { id } = req.params;

                // First check if the slot exists and belongs to a doctor in the user's hospital
                const existingSlot = await prisma.slot.findFirst({
                    where: {
                        id,
                        doctor: {
                            hospitalId: req.user.hospitalId
                        }
                    }
                });

                if (!existingSlot) {
                    throw new AppError("Slot not found or not accessible", 404);
                }

                await prisma.slot.delete({
                    where: { id }
                });

                res.status(200).json(new ApiResponse("Slot deleted successfully", null));
            } catch (error: any) {
                console.error("Delete slot error:", error);
                res.status(error.code || 500)
                    .json(new ApiResponse(error.message || "Internal Server Error"));
            }
        } else {
            res.status(403).json(new ApiResponse("Unauthorized access", null));
        }
    }
}
