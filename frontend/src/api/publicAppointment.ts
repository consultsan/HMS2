import { api } from '@/lib/api';
import { ApiResponse } from '@/types/types';

// Types for public appointment booking
export interface Hospital {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialisation: string;
}

export interface AvailableSlot {
  time: string;
  datetime: string;
  available: boolean;
}

export interface AppointmentBookingData {
  name: string;
  phone: string;
  dob?: string;
  gender?: string;
  hospitalId: string;
  doctorId: string;
  scheduledAt: string;
  source?: string;
}

export interface AppointmentStatus {
  visitId: string;
  patientName: string;
  doctorName: string;
  doctorSpecialization: string;
  hospitalName: string;
  scheduledAt: string;
  status: string;
  source: string;
}

export const publicAppointmentApi = {
  // Get all hospitals for public booking
  getHospitals: () => 
    api.get<ApiResponse<Hospital[]>>('/api/public/hospitals'),

  // Get doctors by hospital
  getDoctorsByHospital: (hospitalId: string) => 
    api.get<ApiResponse<{ hospital: Hospital; doctors: Doctor[] }>>(`/api/public/hospitals/${hospitalId}/doctors`),

  // Get available slots for a doctor
  getAvailableSlots: (doctorId: string, date: string) => 
    api.get<ApiResponse<{ doctor: Doctor; date: string; slots: AvailableSlot[] }>>(`/api/public/doctors/${doctorId}/slots`, {
      params: { doctorId: doctorId, date: date }
    }),

  // Book appointment
  bookAppointment: (data: AppointmentBookingData) => 
    api.post<ApiResponse<{ appointment: any }>>('/api/public/book', data),

  // Get appointment status
  getAppointmentStatus: (visitId: string) => 
    api.get<ApiResponse<AppointmentStatus>>(`/api/public/status/${visitId}`)
};
