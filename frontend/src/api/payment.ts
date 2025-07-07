import { api } from '@/lib/api';
import {
    Payment,
    PaymentCreateData,
    PaymentStatus,
    PaymentMethod,
    PaymentStats
} from '@/types/types';

export const paymentApi = {
    // Payment Processing
    processPayment: (paymentData: PaymentCreateData) =>
        api.post('/api/payment/process', paymentData),

    // Payment Retrieval
    getPaymentById: (id: string) => api.get(`/api/payment/${id}`),
    getPaymentsByBill: (billId: string, params?: {
        status?: string;
        page?: number;
        limit?: number
    }) => api.get(`/api/payment/bill/${billId}`, { params }),

    // Payment Management
    updatePaymentStatus: (id: string, data: {
        status: PaymentStatus;
        notes?: string
    }) => api.patch(`/api/payment/${id}/status`, data),
    refundPayment: (id: string, data: {
        refundAmount?: number;
        reason?: string
    }) => api.post(`/api/payment/${id}/refund`, data),

    // Payment Statistics
    getPaymentStats: (params?: {
        startDate?: string;
        endDate?: string;
        paymentMethod?: PaymentMethod
    }) => api.get('/api/payment/stats/overview', { params }),

    // Payment Reports
    getPaymentReport: (params: {
        startDate: string;
        endDate: string;
        paymentMethod?: PaymentMethod;
        status?: PaymentStatus;
    }) => api.get('/api/payment/report', { params }),

    // Payment Export
    exportPaymentReport: (params: {
        startDate: string;
        endDate: string;
        format: 'pdf' | 'excel';
        paymentMethod?: PaymentMethod;
    }) => api.get('/api/payment/export', {
        params,
        responseType: 'blob'
    }),

    // Bulk Payment Operations
    bulkProcessPayments: (payments: PaymentCreateData[]) =>
        api.post('/api/payment/bulk/process', { payments }),
    bulkUpdatePaymentStatus: (paymentIds: string[], status: PaymentStatus) =>
        api.patch('/api/payment/bulk/status', { paymentIds, status }),

    // Payment Validation
    validatePaymentMethod: (paymentMethod: PaymentMethod, amount: number) =>
        api.post('/api/payment/validate', { paymentMethod, amount }),

    // Payment Gateway Integration (if needed)
    getPaymentGatewayStatus: () => api.get('/api/payment/gateway/status'),
    initiatePaymentGateway: (paymentData: PaymentCreateData) =>
        api.post('/api/payment/gateway/initiate', paymentData),
    verifyPaymentGateway: (transactionId: string) =>
        api.post('/api/payment/gateway/verify', { transactionId })
}; 