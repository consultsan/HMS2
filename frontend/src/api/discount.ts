import { api } from '@/lib/api';
import {
    Discount,
    DiscountCreateData
} from '@/types/types';

export const discountApi = {
    // Discount Management
    createDiscount: (discountData: DiscountCreateData) =>
        api.post('/api/discount', discountData),
    getDiscountById: (id: string) => api.get(`/api/discount/${id}`),
    getDiscountByCode: (code: string) => api.get(`/api/discount/code/${code}`),
    getAllDiscounts: (params?: {
        isActive?: boolean;
        page?: number;
        limit?: number;
        discountType?: string;
    }) => api.get('/api/discount', { params }),
    updateDiscount: (id: string, discountData: Partial<Discount>) =>
        api.patch(`/api/discount/${id}`, discountData),
    deleteDiscount: (id: string) => api.delete(`/api/discount/${id}`),

    // Discount Validation
    validateDiscount: (code: string, amount: number) =>
        api.post('/api/discount/validate', { code, amount }),
    checkDiscountEligibility: (code: string, patientId: string, amount: number) =>
        api.post('/api/discount/eligibility', { code, patientId, amount }),

    // Discount Usage
    applyDiscountToBill: (billId: string, discountCode: string) =>
        api.post(`/api/billing/${billId}/apply-discount`, { discountCode }),
    removeDiscountFromBill: (billId: string) =>
        api.delete(`/api/billing/${billId}/discount`),
    getDiscountUsageHistory: (discountId: string) =>
        api.get(`/api/discount/${discountId}/usage`),

    // Discount Reports
    getDiscountReport: (params: {
        startDate: string;
        endDate: string;
        discountType?: string;
        isActive?: boolean;
    }) => api.get('/api/discount/report', { params }),

    // Discount Export
    exportDiscountReport: (params: {
        startDate: string;
        endDate: string;
        format: 'pdf' | 'excel';
        discountType?: string;
    }) => api.get('/api/discount/export', {
        params,
        responseType: 'blob'
    }),

    // Discount Categories
    getDiscountCategories: () => api.get('/api/discount/categories'),
    addDiscountCategory: (categoryData: {
        name: string;
        description?: string;
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    }) => api.post('/api/discount/categories', categoryData),

    // Bulk Operations
    bulkUpdateDiscounts: (discountIds: string[], updateData: Partial<Discount>) =>
        api.patch('/api/discount/bulk/update', { discountIds, updateData }),
    bulkActivateDiscounts: (discountIds: string[]) =>
        api.patch('/api/discount/bulk/activate', { discountIds }),
    bulkDeactivateDiscounts: (discountIds: string[]) =>
        api.patch('/api/discount/bulk/deactivate', { discountIds }),

    // Discount Analytics
    getDiscountAnalytics: (params: {
        startDate: string;
        endDate: string;
        discountId?: string;
    }) => api.get('/api/discount/analytics', { params }),

    // Auto Discount Rules
    getAutoDiscountRules: () => api.get('/api/discount/auto-rules'),
    createAutoDiscountRule: (ruleData: {
        name: string;
        condition: string; // JSON string for complex conditions
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        value: number;
        isActive: boolean;
    }) => api.post('/api/discount/auto-rules', ruleData),
    updateAutoDiscountRule: (ruleId: string, ruleData: Partial<{
        name: string;
        condition: string;
        discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
        value: number;
        isActive: boolean;
    }>) => api.patch(`/api/discount/auto-rules/${ruleId}`, ruleData),
    deleteAutoDiscountRule: (ruleId: string) =>
        api.delete(`/api/discount/auto-rules/${ruleId}`)
}; 