import { api } from '@/lib/api';
import { LabTest, LabTestParameter, AppointmentLabTest, AppointmentLabTestResult, LabOrder, LabOrderStatus } from '@/types/types';

export const labApi = {
    // Lab Test APIs
    getLabTests: () => api.get('/api/lab/tests'),
    getLabTestById: (id: string) => api.get(`/api/lab/tests/${id}`),
    createLabTest: (test: Partial<LabTest>) => api.post('/api/lab/tests', test),
    updateLabTest: (id: string, test: LabTest) => api.patch(`/api/lab/tests/${id}`, test),
    deleteLabTest: (id: string) => api.delete(`/api/lab/tests/${id}`),

    // Lab Test Parameter APIs
    createParameter: (parameter: Partial<LabTestParameter>) => api.post('/api/lab/parameters', parameter),
    getParametersByLabTest: (labTestId: string) => api.get(`/api/lab/tests/${labTestId}/parameters`),
    getParameterById: (id: string) => api.get(`/api/lab/parameters/${id}`),
    updateParameter: (id: string, parameter: LabTestParameter) => api.patch(`/api/lab/parameters/${id}`, parameter),
    deleteParameter: (id: string) => api.delete(`/api/lab/parameters/${id}`),

    // Lab Test Order APIs
    createLabOrder: (labOrder: { patientId: string; appointmentId?: string; appointmentLabTestIds: string[]; notes?: string; urgentOrder?: boolean }) => api.post('/api/lab/lab-order', labOrder),
    createExternalLabOrder: (labOrder: { patientId: string; appointmentId?: string; labTestIds: string[]; notes?: string; urgentOrder?: boolean }) => api.post('/api/lab/external-lab-order', labOrder),
    getInternalLabOrdersByHospital: (hospitalId: string) => api.get(`/api/lab/lab-orders-by-hospital?hospitalId=${hospitalId}`),
    getExternalLabOrdersByHospital: (hospitalId: string) => api.get(`/api/lab/external-lab-orders-by-hospital?hospitalId=${hospitalId}`),
    updateLabOrder: (id: string, data: { status?: LabOrderStatus; notes?: string; orderedBy?: string; orderDate?: Date; urgentOrder?: boolean; billId?: string }) => api.patch(`/api/lab/lab-orders/${id}`, data),
    orderLabTest: (order: Partial<AppointmentLabTest>) => api.post('/api/lab/orders', order),
    getOrderedTestsByAppointment: (appointmentId: string) => api.get(`/api/lab/appointments/${appointmentId}/orders`),
    getOrderedTestById: (id: string) => api.get(`/api/lab/orders/${id}`),
    updateLabTestOrder: (id: string, order: Partial<Pick<AppointmentLabTest, 'status' | 'tentativeReportDate' | 'isSentExternal' | 'externalLabName'>>) => api.patch(`/api/lab/orders/${id}`, order),
    updateLabTestOrderWithFile: (id: string, formData: FormData) => api.patch(`/api/lab/orders/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    cancelLabTestOrder: (id: string) => api.delete(`/api/lab/orders/${id}`),
    markTestSentExternal: (id: string, externalLabName: string) => api.patch(`/api/lab/orders/${id}/mark-external`, { externalLabName }),
    attachReportToOrder: (id: string, report: any) => api.patch(`/api/lab/orders/${id}/attach-report`, report),
    getOrderedTestsByPatient: (patientId: string) => api.get(`/api/lab/patients/${patientId}/orders`),
    getOrderedTestsByHospital: () => api.get(`/api/lab/hospitals/orders`),

    // Lab Test Result APIs
    recordTestResult: (result: Partial<Pick<AppointmentLabTestResult, 'appointmentLabTestId' | 'parameterId' | 'value' | 'unitOverride' | 'notes' | 'attachmentId'>>) => api.post('/api/lab/results', result),
    getResultsByOrder: (appointmentLabTestId: string) => api.get(`/api/lab/orders/${appointmentLabTestId}/results`),
    getResultById: (id: string) => api.get(`/api/lab/results/${id}`),
    updateTestResult: (id: string, result: Partial<Pick<AppointmentLabTestResult, 'value' | 'unitOverride' | 'notes' | 'attachmentId'>>) => api.patch(`/api/lab/results/${id}`, result),
    deleteTestResult: (id: string) => api.delete(`/api/lab/results/${id}`),
    // Lab Test KPI APIs
    getLabKpisByInterval: (startDate: string, endDate: string) => api.get(`/api/lab/kpis?startDate=${startDate}&endDate=${endDate}`),
    // Lab Test Attachment APIs
    uploadLabTestAttachment: (data: { file: File; appointmentLabTestId: string }) => {
        const formData = new FormData();
        formData.append('file', data.file);
        return api.post(`/api/lab/upload/attachment?appointmentLabTestId=${data.appointmentLabTestId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },   
        });
    },

    getLabTestAttachments: (appointmentLabTestId: string) => api.get(`/api/lab/attachments/${appointmentLabTestId}`),

    // Get internal lab orders
    getInternalLabOrders: () =>
        api.get('/api/lab/lab-orders-by-hospital'),

    // Get external lab orders
    getExternalLabOrders: () =>
        api.get('/api/lab/external-lab-orders-by-hospital'),

    // Generate lab test bill
    generateLabTestBill: (appointmentLabTestId: string, data: any) =>
        api.post(`/api/lab/orders/${appointmentLabTestId}/generate-bill`, data),
};

