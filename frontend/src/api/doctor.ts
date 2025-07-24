import { api } from '@/lib/api';
import { DoctorKpis } from '@/types/kpis';
import { HospitalStaff, Slot, DiseaseTemplate, ApiResponse } from '@/types/types';

// Interface for slot creation data
interface SlotCreateData {
    timeSlot: Date;
    appointment1Id?: string;
    appointment2Id?: string;
}

// Interface for slot update data
interface SlotUpdateData {
    timeSlot?: Date;
    appointment1Id?: string;
    appointment2Id?: string;
}

// Interface for updating time slot by appointment ID
interface TimeSlotUpdateData {
    timeSlot: Date;
    appointmentId: string;
}

// Interface for doctor availability query
interface DoctorAvailabilityQuery {
    doctorId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
}

// Interface for slots query with date range
interface SlotsQuery {
    startDate?: string;
    endDate?: string;
}

// Interface for disease template creation/update
interface DiseaseTemplateData {
    name: string;
    medicines: any;
    clinicalNotes?: any;
    labTests?: string[];
}

export const doctorApi = {
    // Get all doctors by hospital
    getDoctorsByHospital: () =>
        api.get<ApiResponse<HospitalStaff[]>>('/api/doctor/get-by-hospital').then(res => res.data.data),

    // Get doctor availability
    getDoctorAvailability: (params: DoctorAvailabilityQuery = {}) => {
        const queryParams = new URLSearchParams();
        if (params.doctorId) queryParams.append('doctorId', params.doctorId);
        if (params.date) queryParams.append('date', params.date);
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);

        const queryString = queryParams.toString();
        return api.get(`/api/doctor/doctor-availability${queryString ? `?${queryString}` : ''}`);
    },

    // Add prescription template (disease template)
    addPrescriptionTemplate: (data: DiseaseTemplateData) =>
        api.post<ApiResponse<DiseaseTemplate>>('/api/doctor/add-prescription-template', data).then(res => res.data.data),

    // Update prescription template
    updatePrescriptionTemplate: (id: string, data: Partial<DiseaseTemplateData>) =>
        api.patch<ApiResponse<DiseaseTemplate>>(`/api/doctor/update-prescription-template/${id}`, data).then(res => res.data.data),

    // Get prescription templates
    getPrescriptionTemplates: () =>
        api.get<ApiResponse<DiseaseTemplate[]>>('/api/doctor/get-prescription-templates').then(res => res.data.data),

    // Add slot for a doctor
    addSlot: (doctorId: string, data: SlotCreateData) =>
        api.post<ApiResponse<Slot>>(`/api/doctor/add-slot/${doctorId}`, data).then(res => res.data.data),

    // Get slots for a doctor
    getSlots: (doctorId: string, params: SlotsQuery = {}) => {
        const queryParams = new URLSearchParams();
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);

        const queryString = queryParams.toString();
        return api.get<ApiResponse<Slot[]>>(`/api/doctor/get-slots/${doctorId}${queryString ? `?${queryString}` : ''}`).then(res => res.data.data);
    },

    // Update slot
    updateSlot: (slotId: string, data: SlotUpdateData) =>
        api.patch<ApiResponse<Slot>>(`/api/doctor/update-slot/${slotId}`, data).then(res => res.data.data),

    // Update time slot by appointment ID
    updateTimeSlotByAppointmentId: (data: TimeSlotUpdateData) =>
        api.patch<ApiResponse<void>>('/api/doctor/update-time-slot-by-appointment-id', data).then(res => res.data),

    // Get doctor KPIs
    getDoctorKpis: (doctorId: string) =>
        api.get<ApiResponse<DoctorKpis>>(`/api/doctor/kpis/${doctorId}`).then(res => res.data.data),

    // Get doctor KPIs by date range
    getDoctorKpisByDate: (doctorId: string, startDate: string, endDate: string) =>
        api.get<ApiResponse<DoctorKpis>>(`/api/doctor/kpis-by-interval/${doctorId}`, {
            params: { startDate, endDate }
        }).then(res => res.data.data),
}; 