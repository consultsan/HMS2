import { api } from '@/lib/api';
import { Appointment, AppointmentStatus, Surgery, SurgicalStatus, AppointmentDateQuery, AppointmentAttachType, VisitType, ApiResponse } from '@/types/types';

// Upload attachment interface for API calls
interface UploadAttachmentData {
    file: File;
    type: AppointmentAttachType;
    appointmentId: string;
}

export const appointmentApi = {
    // Get appointment by ID
    getAppointmentById: (id: string) => api.get(`/api/appointment/${id}`),

    // Get patient appointment history
    getPatientHistory: () => api.get('/api/appointments/history'),

    // Book a new appointment
    bookAppointment: (appointment: Partial<Appointment>) =>
        api.post('/api/appointment/book', appointment),
 
    // Upload attachment for appointment 
    uploadAttachment: (data: UploadAttachmentData) => {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('type', data.type);
        return api.post(`/api/appointment/upload-attachment?id=${data.appointmentId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // Get attachments for appointment
    getAttachments: (id: string) =>
        api.get(`/api/appointment/get-attachments/${id}`),

    // Delete attachment
    deleteAttachment: (id: string) =>
        api.delete(`/api/appointment/delete-attachment/${id}`),

    // Update appointment status
    updateAppointmentStatus: (id: string, status: AppointmentStatus) =>
        api.patch(`/api/appointment/update-status/${id}`, { status }),

    // Get appointments by date and doctor
    getAppointmentsByDateAndDoctor: (query: AppointmentDateQuery) =>
        api.get('/api/appointment/get-by-date-and-doctor', { params: query }),

    // Get appointments by hospital
    getAppointmentsByHospital: () =>
        api.get<ApiResponse<Appointment[]>>('/api/appointment/get-by-hospital'),

    getAppointmentsByHospitalAndVisitType: (visitType: VisitType) =>
        api.get(`/api/appointment/get-by-hospital?visitType=${visitType}`),

    // Get appointments by date and patient
    getAppointmentsByDateAndPatient: (query: AppointmentDateQuery) =>
        api.get('/api/appointment/get-by-date-and-patient', { params: query }),

    // Get appointments by date
    getAppointmentsByDate: (query: AppointmentDateQuery) =>
        api.get('/api/appointment/get-by-date', { params: query }),

    // Get surgery by appointment ID
    getSurgeryByAppointmentId: (appointmentId: string) => {
        if (!appointmentId) {
            console.error('appointmentId is required but not provided');
            return Promise.reject(new Error('appointmentId is required'));
        }
        return api.get(`/api/appointment/get-surgery-by-appointment-id/${appointmentId}`);
    },
    


    // Add surgery to appointment
    addSurgery: (surgery: Partial<Surgery>) =>
        api.post('/api/appointment/add-surgery', surgery),

    // Update surgery status
    updateSurgeryStatus: (surgeryId: string, status: SurgicalStatus) =>
        api.patch(`/api/appointment/update-surgery-status/${surgeryId}`, { status }),

    // Get surgeries by hospital
    getSurgeryByHospitalId: () =>
        api.get('/api/appointment/get-surgery-by-hospital-id'),

    // Update appointment schedule
    updateAppointmentSchedule: (id: string, scheduledAt: Date) =>
        api.patch(`/api/appointment/update-appointment-schedule/${id}`, { scheduledAt }),
};
