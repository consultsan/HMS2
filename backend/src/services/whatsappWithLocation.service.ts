import axios from 'axios';
import googleMapsService from './googleMaps.service';

interface WhatsAppMessage {
  messaging_product: string;
  to: string;
  type: string;
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

interface HospitalLocationData {
  name: string;
  address: string;
  contactNumber: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string;
}

export class WhatsAppWithLocationService {
  private phoneNumberId: string;
  private accessToken: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.phoneNumberId = process.env.WA_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WA_CLOUD_API_ACCESS_TOKEN || '';

    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error('WhatsApp credentials are required');
    }
  }

  /**
   * Send appointment confirmation message with hospital location
   */
  async sendAppointmentConfirmationWithLocation(
    patientPhone: string,
    appointmentData: {
      patientName: string;
      doctorName: string;
      appointmentDate: string;
      appointmentTime: string;
      hospital: HospitalLocationData;
    }
  ): Promise<boolean> {
    try {
      // Get hospital location data
      const locationData = await googleMapsService.getHospitalLocationData(
        appointmentData.hospital.name,
        appointmentData.hospital.address
      );

      // Create message with location
      const message = this.createAppointmentMessageWithLocation(
        appointmentData,
        locationData
      );

      // Send message
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('WhatsApp message error:', error);
      return false;
    }
  }

  /**
   * Create appointment message with location details
   */
  private createAppointmentMessageWithLocation(
    appointmentData: {
      patientName: string;
      doctorName: string;
      appointmentDate: string;
      appointmentTime: string;
      hospital: HospitalLocationData;
    },
    locationData: {
      coordinates: { latitude: number; longitude: number } | null;
      placeId: string | null;
      mapsLink: string;
      embedLink: string;
    }
  ): WhatsAppMessage {
    const { patientName, doctorName, appointmentDate, appointmentTime, hospital } = appointmentData;

    // Format appointment date and time
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedTime = new Date(`2000-01-01T${appointmentTime}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Create message body with location
    const messageBody = `🏥 *Appointment Confirmation*

Dear ${patientName},

Your appointment has been confirmed with Dr. ${doctorName}.

📅 *Date:* ${formattedDate}
🕐 *Time:* ${formattedTime}

📍 *Hospital Location:*
${hospital.name}
${hospital.address}
📞 ${hospital.contactNumber}

🗺️ *Get Directions:*
${locationData.mapsLink}

We look forward to seeing you!

Best regards,
${hospital.name} Team`;

    return {
      messaging_product: 'whatsapp',
      to: patientPhone,
      type: 'text',
      text: {
        body: messageBody,
      },
    };
  }

  /**
   * Send appointment reminder with location
   */
  async sendAppointmentReminderWithLocation(
    patientPhone: string,
    appointmentData: {
      patientName: string;
      doctorName: string;
      appointmentDate: string;
      appointmentTime: string;
      hospital: HospitalLocationData;
    }
  ): Promise<boolean> {
    try {
      // Get hospital location data
      const locationData = await googleMapsService.getHospitalLocationData(
        appointmentData.hospital.name,
        appointmentData.hospital.address
      );

      // Create reminder message with location
      const message = this.createReminderMessageWithLocation(
        appointmentData,
        locationData
      );

      // Send message
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('WhatsApp reminder error:', error);
      return false;
    }
  }

  /**
   * Create reminder message with location details
   */
  private createReminderMessageWithLocation(
    appointmentData: {
      patientName: string;
      doctorName: string;
      appointmentDate: string;
      appointmentTime: string;
      hospital: HospitalLocationData;
    },
    locationData: {
      coordinates: { latitude: number; longitude: number } | null;
      placeId: string | null;
      mapsLink: string;
      embedLink: string;
    }
  ): WhatsAppMessage {
    const { patientName, doctorName, appointmentDate, appointmentTime, hospital } = appointmentData;

    // Format appointment date and time
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedTime = new Date(`2000-01-01T${appointmentTime}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Create reminder message body with location
    const messageBody = `⏰ *Appointment Reminder*

Dear ${patientName},

This is a friendly reminder about your upcoming appointment.

👨‍⚕️ *Doctor:* Dr. ${doctorName}
📅 *Date:* ${formattedDate}
🕐 *Time:* ${formattedTime}

📍 *Hospital Location:*
${hospital.name}
${hospital.address}
📞 ${hospital.contactNumber}

🗺️ *Get Directions:*
${locationData.mapsLink}

Please arrive 15 minutes early for your appointment.

Best regards,
${hospital.name} Team`;

    return {
      messaging_product: 'whatsapp',
      to: patientPhone,
      type: 'text',
      text: {
        body: messageBody,
      },
    };
  }

  /**
   * Send appointment cancellation with location (for rescheduling)
   */
  async sendAppointmentCancellationWithLocation(
    patientPhone: string,
    appointmentData: {
      patientName: string;
      doctorName: string;
      appointmentDate: string;
      appointmentTime: string;
      hospital: HospitalLocationData;
    }
  ): Promise<boolean> {
    try {
      // Get hospital location data
      const locationData = await googleMapsService.getHospitalLocationData(
        appointmentData.hospital.name,
        appointmentData.hospital.address
      );

      // Create cancellation message with location
      const message = this.createCancellationMessageWithLocation(
        appointmentData,
        locationData
      );

      // Send message
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        message,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error('WhatsApp cancellation error:', error);
      return false;
    }
  }

  /**
   * Create cancellation message with location details
   */
  private createCancellationMessageWithLocation(
    appointmentData: {
      patientName: string;
      doctorName: string;
      appointmentDate: string;
      appointmentTime: string;
      hospital: HospitalLocationData;
    },
    locationData: {
      coordinates: { latitude: number; longitude: number } | null;
      placeId: string | null;
      mapsLink: string;
      embedLink: string;
    }
  ): WhatsAppMessage {
    const { patientName, doctorName, appointmentDate, appointmentTime, hospital } = appointmentData;

    // Format appointment date and time
    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedTime = new Date(`2000-01-01T${appointmentTime}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Create cancellation message body with location
    const messageBody = `❌ *Appointment Cancelled*

Dear ${patientName},

Your appointment has been cancelled.

👨‍⚕️ *Doctor:* Dr. ${doctorName}
📅 *Date:* ${formattedDate}
🕐 *Time:* ${formattedTime}

📍 *Hospital Location:*
${hospital.name}
${hospital.address}
📞 ${hospital.contactNumber}

🗺️ *Get Directions:*
${locationData.mapsLink}

Please contact us to reschedule your appointment.

Best regards,
${hospital.name} Team`;

    return {
      messaging_product: 'whatsapp',
      to: patientPhone,
      type: 'text',
      text: {
        body: messageBody,
      },
    };
  }
}

export default new WhatsAppWithLocationService();
