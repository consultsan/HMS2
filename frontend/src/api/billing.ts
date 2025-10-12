import { api } from '@/lib/api';
import {
    Insurance,
    Discount,
    BillCreateData,
    BillItemCreateData,
    PaymentCreateData,
    InsuranceCreateData,
    DiscountCreateData,
    BillStatus,
    PaymentStatus
} from '@/types/types';

export const billingApi = {
    // Bill Management APIs
    createBill: (billData: BillCreateData) => api.post('/api/billing/create', billData),
    getBillById: (id: string) => api.get(`/api/billing/${id}`),
    getBillsByPatient: (patientId: string, params?: { status?: string; page?: number; limit?: number }) =>
        api.get(`/api/billing/patient/${patientId}`, { params }),
    getBillsByHospital: (params?: {
        status?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number
    }) => api.get('/api/billing/hospital/all', { params }),
    updateBillStatus: (id: string, data: { status: BillStatus; notes?: string }) =>
        api.patch(`/api/billing/${id}/status`, data),
    addBillItem: (billId: string, itemData: BillItemCreateData) =>
        api.post(`/api/billing/${billId}/items`, itemData),
    getBillingStats: (params?: { startDate?: string; endDate?: string }) =>
        api.get('/api/billing/stats/overview', { params }),

    // Payment Management APIs
    processPayment: (paymentData: PaymentCreateData) =>
        api.post('/api/payment/process', paymentData),
    getPaymentById: (id: string) => api.get(`/api/payment/${id}`),
    getPaymentsByBill: (billId: string, params?: { status?: string; page?: number; limit?: number }) =>
        api.get(`/api/payment/bill/${billId}`, { params }),
    updatePaymentStatus: (id: string, data: { status: PaymentStatus; notes?: string }) =>
        api.patch(`/api/payment/${id}/status`, data),
    refundPayment: (id: string, data: { refundAmount?: number; reason?: string }) =>
        api.post(`/api/payment/${id}/refund`, data),
    getPaymentStats: (params?: {
        startDate?: string;
        endDate?: string;
        paymentMethod?: string
    }) => api.get('/api/payment/stats/overview', { params }),

    // Insurance Management APIs
    createInsurance: (insuranceData: InsuranceCreateData) =>
        api.post('/api/insurance', insuranceData),
    getInsuranceById: (id: string) => api.get(`/api/insurance/${id}`),
    getInsuranceByPatient: (patientId: string) =>
        api.get(`/api/insurance/patient/${patientId}`),
    updateInsurance: (id: string, insuranceData: Partial<Insurance>) =>
        api.patch(`/api/insurance/${id}`, insuranceData),
    deleteInsurance: (id: string) => api.delete(`/api/insurance/${id}`),

    // Discount Management APIs
    createDiscount: (discountData: DiscountCreateData) =>
        api.post('/api/discount', discountData),
    getDiscountById: (id: string) => api.get(`/api/discount/${id}`),
    getDiscountByCode: (code: string) => api.get(`/api/discount/code/${code}`),
    getAllDiscounts: (params?: { isActive?: boolean; page?: number; limit?: number }) =>
        api.get('/api/discount', { params }),
    updateDiscount: (id: string, discountData: Partial<Discount>) =>
        api.patch(`/api/discount/${id}`, discountData),
    deleteDiscount: (id: string) => api.delete(`/api/discount/${id}`),
    validateDiscount: (code: string, amount: number) =>
        api.post('/api/discount/validate', { code, amount }),

    // Patient Billing APIs
    getPatientBillingHistory: (patientId: string, params?: {
        status?: string;
        page?: number;
        limit?: number
    }) => api.get(`/api/patient/${patientId}/billing/history`, { params }),
    getPatientOutstandingBills: (patientId: string) =>
        api.get(`/api/patient/${patientId}/billing/outstanding`),
    getPatientPaymentHistory: (patientId: string, params?: {
        page?: number;
        limit?: number
    }) => api.get(`/api/patient/${patientId}/payment/history`, { params }),

    // Appointment Billing APIs
    generateAppointmentBill: (appointmentId: string, billData: BillCreateData) =>
        api.post(`/api/appointment/${appointmentId}/generate-bill`, billData),
    getAppointmentBilling: (appointmentId: string) => 
        api.get(`/api/appointment/${appointmentId}/billing`),
    // Lab Test Billing APIs
    generateLabTestBill: (appointmentLabTestId: string, data: {
        dueDate?: string;
        notes?: string
    }) => api.post(`/api/lab/orders/${appointmentLabTestId}/generate-bill`, data),
    getLabTestBilling: (appointmentLabTestId: string) =>
        api.get(`/api/lab/orders/${appointmentLabTestId}/billing`),

    // Utility Functions
    generateBillNumber: () => api.get('/api/billing/generate-number'),
    calculateBillTotal: (items: BillItemCreateData[]) =>
        api.post('/api/billing/calculate-total', { items }),
    applyDiscount: (billId: string, discountCode: string) =>
        api.post(`/api/billing/${billId}/apply-discount`, { discountCode }),
    removeDiscount: (billId: string) =>
        api.delete(`/api/billing/${billId}/discount`),

    // Export Functions
    exportBillPDF: (billId: string) =>
        api.get(`/api/billing/${billId}/export/pdf`, {
            responseType: 'blob'
        }),
    exportBillingReport: (params: {
        startDate: string;
        endDate: string;
        format: 'pdf' | 'excel'
    }) => api.get('/api/billing/export/report', {
        params,
        responseType: 'blob'
    }),

    // Bulk Operations
    bulkUpdateBillStatus: (billIds: string[], status: BillStatus) =>
        api.patch('/api/billing/bulk/status', { billIds, status }),
    bulkSendBills: (billIds: string[]) =>
        api.post('/api/billing/bulk/send', { billIds }),
    bulkGenerateBills: (appointmentIds: string[], billData: Omit<BillCreateData, 'patientId' | 'hospitalId'>) =>
        api.post('/api/billing/bulk/generate', { appointmentIds, billData })
}; 