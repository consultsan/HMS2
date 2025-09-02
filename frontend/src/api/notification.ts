import { api } from '@/lib/api';
import { ApiResponse } from '@/types/types'; // adjust the import path as necessary
// import other types like Notification, etc. when you define them

export const notificationApi = {
    // Send lab report
    sendLabReport: (appointmentLabTestId: string) =>
        api.post<ApiResponse<any>>(`/api/notifications/lab-report/${appointmentLabTestId}`)
           .then(res => res.data.data),

    // Send diagnosis record
    sendDiagnosisRecord: (appointmentId: string) =>
        api.post<ApiResponse<any>>(`/api/notifications/diagnosis-record/${appointmentId}`)
           .then(res => res.data.data),

    // Get notification history
    getNotificationHistory: (patientId: string) =>
        api.get<ApiResponse<any[]>>(`/api/notifications/history/${patientId}`)
           .then(res => res.data.data),

    // Resend notification
    resendNotification: (type: string, attachmentId: string, data?: any) =>
        api.post<ApiResponse<any>>(`/api/notifications/resend/${type}/${attachmentId}`, data)
           .then(res => res.data.data),

    // Send appointment notification
    sendAppointmentNotification: (data: any) =>
        api.post<ApiResponse<any>>(`/api/notifications/appointment-msg`, data)
           .then(res => res.data.data),

    // Send lab test completion notification
    sendLabTestCompletionNotification: (data: any) =>
        api.post<ApiResponse<any>>(`/api/notifications/lab-completion`, data)
           .then(res => res.data.data),
};