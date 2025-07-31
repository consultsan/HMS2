import { api } from '@/lib/api';
import {
    Patient, FamilyLink, VitalsData, PatientUpdateData,
    PatientCreateData, DocumentUploadData, FamilyLinkCreateData,
    PatientDoc,
    PatientDocument
} from '@/types/types';
import { get } from 'lodash';



interface ApiResponse<T> {
    data: T;
    message?: string;
    status?: string;
}

export const patientApi = {
    // Get all patients
    getAllPatients: () =>
        api.get<ApiResponse<Patient[]>>('/api/patient').then(res => res.data.data),

    // Create a new patient
    createPatient: (data: PatientCreateData) =>
        api.post<ApiResponse<Patient>>('/api/patient/create', data).then(res => res.data.data),

    // Get patient by name (search)
    getPatientByName: (name: string) =>
        api.get<ApiResponse<Patient[]>>(`/api/patient/get-by-name?name=${encodeURIComponent(name)}`).then(res => res.data.data),

    // Get patient by phone number
    getPatientByPhone: (phoneNumber: string) =>
        api.get<ApiResponse<Patient[]>>(`/api/patient/get-by-phone?phone=${(phoneNumber)}`).then(res => res.data.data),

    // Upload document for patient
    uploadDocument: (data: { file: File; patientId: string; type: string }) => {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('patientId', data.patientId);
        formData.append('type', data.type);
        return api.post(`/api/patient/upload-doc`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    getDocuments: (patientId: string) =>
        api.get<ApiResponse<PatientDocument[]>>(`/api/patient/get-documents/${patientId}`).then(res => res.data.data),

    // Delete a patient document
    deleteDocument: (documentId: string) =>
        api.delete<ApiResponse<void>>(`/api/patient/delete-document/${documentId}`).then(res => res.data.data),

    // Add vitals to appointment
    addVitals: (appointmentId: string, vitals: VitalsData) =>
        api.post<ApiResponse<any>>(`/api/patient/add-vitals/${appointmentId}`, vitals).then(res => res.data.data),

    // Get patient by ID
    getPatientById: (id: string) =>
        api.get<ApiResponse<Patient>>(`/api/patient/get/${id}`).then(res => res.data.data),

    // Update patient details
    updatePatientDetails: (id: string, data: PatientUpdateData) =>
        api.patch<ApiResponse<Patient>>(`/api/patient/update/${id}`, data).then(res => res.data.data),

    // Get family links
    listFamilyLinks: () =>
        api.get<ApiResponse<FamilyLink[]>>('/api/patient/family-links').then(res => res.data.data),
    // Add family link
    addFamilyLink: (data: FamilyLinkCreateData) =>
        api.post<ApiResponse<FamilyLink>>('/api/patient/add/family-link', data).then(res => res.data.data),
};
