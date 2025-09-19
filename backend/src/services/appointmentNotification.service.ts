import prisma from "../utils/dbConfig";
import whatsappWithLocationService from "./whatsappWithLocation.service";

interface AppointmentNotificationData {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  scheduledAt: Date;
  visitType: string;
}

export class AppointmentNotificationService {
  /**
   * Send appointment confirmation with location
   */
  async sendAppointmentConfirmation(appointmentId: string): Promise<boolean> {
    try {
      // Get appointment details with related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phone: true,
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
            }
          },
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              contactNumber: true,
              latitude: true,
              longitude: true,
              googlePlaceId: true,
            }
          }
        }
      });

      if (!appointment) {
        console.error(`Appointment not found: ${appointmentId}`);
        return false;
      }

      if (!appointment.patient.phone) {
        console.error(`Patient phone not found for appointment: ${appointmentId}`);
        return false;
      }

      // Format appointment date and time
      const appointmentDate = appointment.scheduledAt.toISOString().split('T')[0];
      const appointmentTime = appointment.scheduledAt.toTimeString().split(' ')[0].substring(0, 5);

      // Send WhatsApp message with location
      const success = await whatsappWithLocationService.sendAppointmentConfirmationWithLocation(
        appointment.patient.phone,
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          appointmentDate,
          appointmentTime,
          hospital: {
            name: appointment.hospital.name,
            address: appointment.hospital.address,
            contactNumber: appointment.hospital.contactNumber,
            latitude: appointment.hospital.latitude || undefined,
            longitude: appointment.hospital.longitude || undefined,
            googlePlaceId: appointment.hospital.googlePlaceId || undefined,
          }
        }
      );

      if (success) {
        // Log the notification
        await this.logNotification(appointmentId, 'CONFIRMATION_SENT');
      }

      return success;
    } catch (error) {
      console.error('Send appointment confirmation error:', error);
      return false;
    }
  }

  /**
   * Send appointment reminder with location
   */
  async sendAppointmentReminder(appointmentId: string): Promise<boolean> {
    try {
      // Get appointment details with related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phone: true,
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
            }
          },
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              contactNumber: true,
              latitude: true,
              longitude: true,
              googlePlaceId: true,
            }
          }
        }
      });

      if (!appointment) {
        console.error(`Appointment not found: ${appointmentId}`);
        return false;
      }

      if (!appointment.patient.phone) {
        console.error(`Patient phone not found for appointment: ${appointmentId}`);
        return false;
      }

      // Format appointment date and time
      const appointmentDate = appointment.scheduledAt.toISOString().split('T')[0];
      const appointmentTime = appointment.scheduledAt.toTimeString().split(' ')[0].substring(0, 5);

      // Send WhatsApp reminder with location
      const success = await whatsappWithLocationService.sendAppointmentReminderWithLocation(
        appointment.patient.phone,
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          appointmentDate,
          appointmentTime,
          hospital: {
            name: appointment.hospital.name,
            address: appointment.hospital.address,
            contactNumber: appointment.hospital.contactNumber,
            latitude: appointment.hospital.latitude || undefined,
            longitude: appointment.hospital.longitude || undefined,
            googlePlaceId: appointment.hospital.googlePlaceId || undefined,
          }
        }
      );

      if (success) {
        // Log the notification
        await this.logNotification(appointmentId, 'REMINDER_SENT');
      }

      return success;
    } catch (error) {
      console.error('Send appointment reminder error:', error);
      return false;
    }
  }

  /**
   * Send appointment cancellation with location
   */
  async sendAppointmentCancellation(appointmentId: string): Promise<boolean> {
    try {
      // Get appointment details with related data
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phone: true,
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
            }
          },
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              contactNumber: true,
              latitude: true,
              longitude: true,
              googlePlaceId: true,
            }
          }
        }
      });

      if (!appointment) {
        console.error(`Appointment not found: ${appointmentId}`);
        return false;
      }

      if (!appointment.patient.phone) {
        console.error(`Patient phone not found for appointment: ${appointmentId}`);
        return false;
      }

      // Format appointment date and time
      const appointmentDate = appointment.scheduledAt.toISOString().split('T')[0];
      const appointmentTime = appointment.scheduledAt.toTimeString().split(' ')[0].substring(0, 5);

      // Send WhatsApp cancellation with location
      const success = await whatsappWithLocationService.sendAppointmentCancellationWithLocation(
        appointment.patient.phone,
        {
          patientName: appointment.patient.name,
          doctorName: appointment.doctor.name,
          appointmentDate,
          appointmentTime,
          hospital: {
            name: appointment.hospital.name,
            address: appointment.hospital.address,
            contactNumber: appointment.hospital.contactNumber,
            latitude: appointment.hospital.latitude || undefined,
            longitude: appointment.hospital.longitude || undefined,
            googlePlaceId: appointment.hospital.googlePlaceId || undefined,
          }
        }
      );

      if (success) {
        // Log the notification
        await this.logNotification(appointmentId, 'CANCELLATION_SENT');
      }

      return success;
    } catch (error) {
      console.error('Send appointment cancellation error:', error);
      return false;
    }
  }

  /**
   * Send bulk appointment reminders (for scheduled reminders)
   */
  async sendBulkAppointmentReminders(): Promise<{ success: number; failed: number }> {
    try {
      // Get appointments for tomorrow (24 hours from now)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const appointments = await prisma.appointment.findMany({
        where: {
          scheduledAt: {
            gte: tomorrow,
            lt: dayAfterTomorrow,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          }
        },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              phone: true,
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
            }
          },
          hospital: {
            select: {
              id: true,
              name: true,
              address: true,
              contactNumber: true,
              latitude: true,
              longitude: true,
              googlePlaceId: true,
            }
          }
        }
      });

      let successCount = 0;
      let failedCount = 0;

      // Send reminders for each appointment
      for (const appointment of appointments) {
        if (appointment.patient.phone) {
          const appointmentDate = appointment.scheduledAt.toISOString().split('T')[0];
          const appointmentTime = appointment.scheduledAt.toTimeString().split(' ')[0].substring(0, 5);

          const success = await whatsappWithLocationService.sendAppointmentReminderWithLocation(
            appointment.patient.phone,
            {
              patientName: appointment.patient.name,
              doctorName: appointment.doctor.name,
              appointmentDate,
              appointmentTime,
              hospital: {
                name: appointment.hospital.name,
                address: appointment.hospital.address,
                contactNumber: appointment.hospital.contactNumber,
                latitude: appointment.hospital.latitude || undefined,
                longitude: appointment.hospital.longitude || undefined,
                googlePlaceId: appointment.hospital.googlePlaceId || undefined,
              }
            }
          );

          if (success) {
            successCount++;
            await this.logNotification(appointment.id, 'REMINDER_SENT');
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      }

      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('Send bulk appointment reminders error:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Log notification in database (optional - for tracking)
   */
  private async logNotification(appointmentId: string, notificationType: string): Promise<void> {
    try {
      // You can create a notification log table if needed
      console.log(`Notification logged: ${notificationType} for appointment ${appointmentId}`);
    } catch (error) {
      console.error('Log notification error:', error);
    }
  }
}

export default new AppointmentNotificationService();
