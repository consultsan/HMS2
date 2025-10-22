import { api } from '@/lib/api';
import {
  IPDQueueEntry,
  CreateIPDQueueData,
  UpdateIPDQueueStatusData,
  IPDAdmissionData,
  IPDAdmission,
  IPDVisitData,
  IPDVisit,
  Ward,
  InsuranceCompany,
  CreateWardData,
  UpdateWardBedCountData,
  CreateInsuranceCompanyData,
  IPDQueueResponse,
  IPDAdmissionResponse,
  IPDDashboardStatsResponse,
  WardsResponse,
  InsuranceCompaniesResponse,
  DoctorsResponse
} from '@/types/ipd';

export const ipdApi = {
  // IPD Queue Management
  createQueue: (data: CreateIPDQueueData) =>
    api.post<IPDQueueResponse>('/api/ipd/queue', data),

  getQueue: (params?: { doctorId?: string; status?: string }) =>
    api.get<{ data: IPDQueueEntry[] }>('/api/ipd/queue', { params }),

  getQueueById: (id: string) =>
    api.get<{ data: IPDQueueEntry }>(`/api/ipd/queue/${id}`),

  updateQueueStatus: (id: string, data: UpdateIPDQueueStatusData) =>
    api.patch<IPDQueueResponse>(`/api/ipd/queue/${id}/status`, data),

  // IPD Admission Management
  createAdmission: (data: IPDAdmissionData) =>
    api.post<IPDAdmissionResponse>('/api/ipd/admission', data),

  getAdmissions: (params?: { status?: string }) =>
    api.get<{ data: IPDAdmission[] }>('/api/ipd/admission', { params }),

  getAdmissionById: (id: string) =>
    api.get<{ data: IPDAdmission }>(`/api/ipd/admission/${id}`),

  updateAdmission: (id: string, data: Partial<IPDAdmissionData>) =>
    api.patch<IPDAdmissionResponse>(`/api/ipd/admission/${id}`, data),

  // IPD Visit Management
  createVisit: (data: IPDVisitData) =>
    api.post<{ message: string; data: IPDVisit }>('/api/ipd/visit', data),

  getVisits: (admissionId: string) =>
    api.get<{ data: IPDVisit[] }>(`/api/ipd/visit/${admissionId}`),

  // IPD Discharge Management
  createDischargeSummary: (data: {
    admissionId: string;
    dischargeDate: string;
    finalDiagnosis: string;
    treatmentSummary: string;
    proceduresPerformed?: string;
    medicationsPrescribed: string;
    followUpInstructions: string;
    doctorSignature?: string;
    hospitalStamp?: string;
  }) =>
    api.post<{ message: string; data: any }>('/api/ipd/discharge-summary', data),

  getDischargeSummary: (admissionId: string) =>
    api.get<{ data: any }>(`/api/ipd/discharge-summary/${admissionId}`),

  // Ward Management
  getWards: () =>
    api.get<WardsResponse>('/api/ipd/ward'),

  createWard: (data: CreateWardData) =>
    api.post<{ message: string; data: Ward }>('/api/ipd/ward', data),

  updateWardBedCount: (id: string, data: UpdateWardBedCountData) =>
    api.patch<{ message: string; data: Ward }>(`/api/ipd/ward/${id}/bed-count`, data),

  // Insurance Companies
  getInsuranceCompanies: () =>
    api.get<InsuranceCompaniesResponse>('/api/ipd/insurance-company'),

  createInsuranceCompany: (data: CreateInsuranceCompanyData) =>
    api.post<{ message: string; data: InsuranceCompany }>('/api/ipd/insurance-company', data),

  updateInsuranceCompany: (id: string, data: Partial<CreateInsuranceCompanyData>) =>
    api.patch<{ message: string; data: InsuranceCompany }>(`/api/ipd/insurance-company/${id}`, data),

  deleteInsuranceCompany: (id: string) =>
    api.delete<{ message: string }>(`/api/ipd/insurance-company/${id}`),

  // Dashboard Statistics
  getDashboardStats: () =>
    api.get<IPDDashboardStatsResponse>('/api/ipd/dashboard/stats'),

  // Doctor and Patient data
  getDoctors: () =>
    api.get<DoctorsResponse>('/api/doctor/get-by-hospital'),

  getPatients: (params?: { search?: string }) =>
    api.get<{ data: any[] }>('/api/patient', { params }),
};
