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
  Bed,
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
  createAdmission: (data: IPDAdmissionData | FormData) =>
    api.post<IPDAdmissionResponse>('/api/ipd/admission', data, {
      headers: {
        'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json'
      }
    }),

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

  // Bed Management
  getAvailableBeds: (wardId: string) =>
    api.get<{ message: string; data: Bed[] }>(`/api/ipd/ward/${wardId}/beds`),

  // IPD Patient Document APIs
  uploadIPDPatientDocument: (data: FormData) =>
    api.post<{ message: string; data: any }>('/api/ipd/patient-document', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  
  getIPDPatientDocuments: (admissionId: string) =>
    api.get<{ message: string; data: any[] }>(`/api/ipd/patient-document/${admissionId}`),
  
  deleteIPDPatientDocument: (documentId: string) =>
    api.delete<{ message: string }>(`/api/ipd/patient-document/${documentId}`),

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

  // Comprehensive Patient Details
  getPatientDetails: (admissionId: string) =>
    api.get<{
      data: {
        admission: IPDAdmission;
        ipdDocuments: any[];
        ipdVisits: IPDVisit[];
        ipdLabTests: any[];
        ipdSurgeries: any[];
        opdLabTests: any[];
        opdSurgeries: any[];
        patientDocuments: any[];
      };
    }>(`/api/ipd/patient-details/${admissionId}`),

  // IPD Lab Test Management
  createIPDLabTest: (data: {
    admissionId: string;
    testName: string;
    testCode?: string;
    category?: string;
    priority: 'ROUTINE' | 'URGENT' | 'STAT';
    instructions?: string;
    fastingRequired?: boolean;
    fastingHours?: number;
    specialInstructions?: string;
    testCost?: number;
    labTestId?: string;
  }) =>
    api.post<{ message: string; data: any }>('/api/ipd/lab-test', data),

  getIPDLabTestsByHospital: (params?: { status?: string }) =>
    api.get<{ message: string; data: any[] }>('/api/ipd/lab-test/hospital/all', { params }),

  updateIPDLabTest: (id: string, data: {
    status?: string;
    scheduledAt?: string;
    completedAt?: string;
    resultDate?: string;
    resultValue?: string;
    resultUnit?: string;
    normalRange?: string;
    abnormalFlag?: boolean;
    resultNotes?: string;
    performedById?: string;
  }) =>
    api.patch<{ message: string; data: any }>(`/api/ipd/lab-test/${id}`, data),

  uploadIPDLabTestAttachment: (labTestId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('labTestId', labTestId);
    formData.append('attachmentType', 'RESULT_REPORT');
    return api.post<{ message: string; data: any }>('/api/ipd/lab-test/attachment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
