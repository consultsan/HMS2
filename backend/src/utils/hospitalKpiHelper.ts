import { HospitalController } from "../controllers/Hospital.controller";
import { Request, Response } from "express";
import prisma from "./dbConfig";

const hospitalController = new HospitalController();

export const fetchHospitalKpisByInterval = async (
  hospitalId: string,
  startDateTime: Date,
  endDateTime: Date
) => {

				// Set end time to end of day
				endDateTime.setHours(23, 59, 59, 999);

  				const appointments = await prisma.appointment.findMany({
					where: {
						hospitalId,
						scheduledAt: {
							gte: startDateTime,
							lte: endDateTime
						}
					},
					include: {
						bills: {
							include: {
								billItems: true,
								payments: true
							}
						},
						diagnosisRecord: {
							include: {
								followUpAppointment: true
							}
						},
						patient: true,
						doctor: true,
						labTests: {
							include: {
								labTest: true,
								results: true
							}
						}
					}
				});

				// Get all patients registered in the date range
				const patients = await prisma.patient.findMany({
					where: {
						hospitalId,
						createdAt: {
							gte: startDateTime,
							lte: endDateTime
						}
					}
				});

				// Get all staff members
				const staff = await prisma.hospitalStaff.findMany({
					where: { hospitalId }
				});

				// Get all lab tests in the date range
				const labTests = await prisma.appointmentLabTest.findMany({
					where: {
						appointment: {
							hospitalId,
							scheduledAt: {
								gte: startDateTime,
								lte: endDateTime
							}
						}
					},
					include: {
						labTest: true,
						results: true
					}
				});

				// Calculate KPIs
				const totalAppointments = appointments.length;
				const totalPatients = patients.length;
				const activePatients = new Set(appointments.map(apt => apt.patientId)).size;
				const totalStaff = staff.length;
				const totalLabTests = labTests.length;
				const pendingLabTests = labTests.filter(test => test.results.length === 0).length;

				// Calculate appointment statistics
				const completedAppointments = appointments.filter(
					apt => apt.status === "DIAGNOSED"
				).length;
				const cancelledAppointments = appointments.filter(
					apt => apt.status === "CANCELLED"
				).length;
				const followUps = appointments.filter(
					apt => apt.diagnosisRecord?.followUpAppointment
				).length;

				// Calculate revenue
				const totalRevenue = appointments.reduce((sum, apt) => {
					const billTotal = apt.bills.reduce((billSum: number, bill) => {
						return billSum + (bill.status === "PAID" ? bill.totalAmount : 0);
					}, 0);
					return sum + billTotal;
				}, 0);

				// Calculate average revenue per appointment
				const averageRevenuePerAppointment = totalAppointments > 0
					? totalRevenue / totalAppointments
					: 0;

				const kpis = {
					totalAppointments,
					totalPatients,
					activePatients,
					totalStaff,
					totalRevenue,
					averageRevenuePerAppointment,
					totalLabTests,
					pendingLabTests,
					totalCompletedAppointments: completedAppointments,
					totalCancelledAppointments: cancelledAppointments,
					totalFollowUps: followUps,
					period: {
						start: startDateTime,
						end: endDateTime
					}
  };
  return kpis;
};
