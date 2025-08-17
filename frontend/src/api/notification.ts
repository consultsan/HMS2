// src/api/notification.api.ts
import axios from "axios";

const API_BASE = "/api/notifications"; // adjust if your backend prefix differs

// Send lab report
export const sendLabReport = (appointmentLabTestId: string) => {
  return axios.post(`${API_BASE}/lab-report/${appointmentLabTestId}`);
};

// Send diagnosis record
export const sendDiagnosisRecord = (appointmentId: string) => {
  return axios.post(`${API_BASE}/diagnosis-record/${appointmentId}`);
};

// Get notification history for a patient
export const getNotificationHistory = (patientId: string) => {
  return axios.get(`${API_BASE}/history/${patientId}`);
};

// Resend notification
export const resendNotification = (type: string, attachmentId: string, data?: any) => {
  return axios.post(`${API_BASE}/resend/${type}/${attachmentId}`, data);
};

// Send appointment notification
export const sendAppointmentNotification = (data: any) => {
  return axios.post(`${API_BASE}/appointment-msg`, data);
};

// Send lab test completion notification
export const sendLabTestCompletionNotification = (data: any) => {
  return axios.post(`${API_BASE}/lab-completion`, data);
};
