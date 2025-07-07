import { api } from '@/lib/api';
import {
    Insurance,
    InsuranceCreateData
} from '@/types/types';

export const insuranceApi = {
    // Insurance Management
    createInsurance: (insuranceData: InsuranceCreateData) =>
        api.post('/api/insurance', insuranceData),
    getInsuranceById: (id: string) => api.get(`/api/insurance/${id}`),
    getInsuranceByPatient: (patientId: string) =>
        api.get(`/api/insurance/patient/${patientId}`),
    getAllInsurance: (params?: {
        isActive?: boolean;
        page?: number;
        limit?: number;
        patientId?: string;
    }) => api.get('/api/insurance', { params }),
    updateInsurance: (id: string, insuranceData: Partial<Insurance>) =>
        api.patch(`/api/insurance/${id}`, insuranceData),
    deleteInsurance: (id: string) => api.delete(`/api/insurance/${id}`),

    // Insurance Claims
    createInsuranceClaim: (insuranceId: string, claimData: {
        billId: string;
        claimAmount: number;
        description?: string;
    }) => api.post(`/api/insurance/${insuranceId}/claims`, claimData),
    getInsuranceClaims: (insuranceId: string) =>
        api.get(`/api/insurance/${insuranceId}/claims`),
    updateInsuranceClaim: (claimId: string, claimData: {
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        notes?: string;
    }) => api.patch(`/api/insurance/claims/${claimId}`, claimData),

    // Insurance Validation
    validateInsurance: (patientId: string, amount: number) =>
        api.post('/api/insurance/validate', { patientId, amount }),
    checkInsuranceCoverage: (insuranceId: string, serviceType: string) =>
        api.get(`/api/insurance/${insuranceId}/coverage/${serviceType}`),

    // Insurance Reports
    getInsuranceReport: (params: {
        startDate: string;
        endDate: string;
        providerName?: string;
    }) => api.get('/api/insurance/report', { params }),

    // Insurance Export
    exportInsuranceReport: (params: {
        startDate: string;
        endDate: string;
        format: 'pdf' | 'excel';
        providerName?: string;
    }) => api.get('/api/insurance/export', {
        params,
        responseType: 'blob'
    }),

    // Insurance Providers
    getInsuranceProviders: () => api.get('/api/insurance/providers'),
    addInsuranceProvider: (providerData: {
        name: string;
        contactInfo: string;
        description?: string;
    }) => api.post('/api/insurance/providers', providerData),

    // Bulk Operations
    bulkUpdateInsurance: (insuranceIds: string[], updateData: Partial<Insurance>) =>
        api.patch('/api/insurance/bulk/update', { insuranceIds, updateData }),
    bulkDeactivateInsurance: (insuranceIds: string[]) =>
        api.patch('/api/insurance/bulk/deactivate', { insuranceIds })
}; 