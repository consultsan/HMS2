import { Request, Response } from "express";
import { UserRole, Prisma, Slot, HospitalStaff } from "@prisma/client";
import prisma from "../utils/dbConfig";
import AppError from "../utils/AppError";
import ApiResponse from "../utils/ApiResponse";

const roles: string[] = [
    UserRole.SUPER_ADMIN,
    UserRole.HOSPITAL_ADMIN,
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST
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
                res.status(error.code || 500)
                    .json(new ApiResponse(error.message || "Internal Server Error"));
            }
        } else {
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

                res.status(200).json(new ApiResponse("Slots fetched successfully", slots));
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

                const slot = await prisma.slot.findFirst({
                    where: {
                        OR: [
                            { appointment1Id: appointmentId },
                            { appointment2Id: appointmentId }
                        ]
                    }
                });

                if (slot?.appointment2Id) {
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
                        where: { id: slot?.id },
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
