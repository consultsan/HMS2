import apiClient from './client';

export interface Hospital {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  hospital: {
    id: string;
    name: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
}

export interface KPIs {
  totalHospitals: number;
  totalAdmins: number;
  totalPatients: number;
  totalRevenue: number;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  status: 'ACTIVE' | 'INACTIVE';
  role: 'DOCTOR' | 'NURSE' | 'STAFF';
}

export interface OpdFee {
  id: string;
  amount: number;
  doctor: Doctor;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  specialisation?: string;
}

export interface Shift {
  id: string;
  staffId: string;
  staff?: Staff;
  staffName?: string;
  shiftName: 'GENERAL' | 'NIGHT';
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface StaffFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  specialisation: string;
  deptId: string;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
}

export const superAdminApi = {
  // KPIs
  getKPIs: () => apiClient.get<ApiResponse<KPIs>>('/api/super-admin/kpis').then(res => res.data.data),

  // Hospitals
  getHospitals: () => apiClient.get<ApiResponse<Hospital[]>>('/api/super-admin/hospital/fetch-all').then(res => res.data.data),
  createHospital: (data: Omit<Hospital, 'id' | 'status'>) =>
    apiClient.post<ApiResponse<Hospital>>('/api/super-admin/hospital/create', data).then(res => res.data.data),
  updateHospital: (id: string, data: Partial<Hospital>) =>
    apiClient.patch<ApiResponse<Hospital>>(`/api/super-admin/hospital/update/${id}`, data).then(res => res.data.data),
  deleteHospital: (id: string) =>
    apiClient.delete(`/api/super-admin/hospital/delete/${id}`),

  // Admins
  getAdmins: () => apiClient.get<ApiResponse<Admin[]>>('/api/super-admin/admin/fetch-all').then(res => res.data.data),
  createAdmin: (data: { name: string; email: string; password: string; hospitalId: string }) =>
    apiClient.post<ApiResponse<Admin>>('/api/super-admin/admin/create', data).then(res => res.data.data),
  updateAdmin: (id: string, data: { name?: string; password?: string; status?: 'ACTIVE' | 'INACTIVE' }) =>
    apiClient.patch<ApiResponse<Admin>>(`/api/super-admin/admin/update/${id}`, data).then(res => res.data.data),
  deleteAdmin: (id: string) =>
    apiClient.delete(`/api/super-admin/admin/delete/${id}`),

  // Departments
  getDepartments: () => apiClient.get<ApiResponse<Department[]>>('/api/hospital/departments').then(res => res.data.data),
  createDepartment: (data: { name: string; description: string }) =>
    apiClient.post<ApiResponse<Department>>('/api/hospital-admin/add/department', data).then(res => res.data.data),

  // OPD Fees
  getOpdFees: () => apiClient.get<ApiResponse<OpdFee[]>>('/api/hospital-admin/opd-charge/fetch').then(res => res.data.data),
  getDoctors: () => apiClient.get<ApiResponse<Doctor[]>>('/api/hospital-admin/staff/fetch').then(res => res.data.data),
  createOpdFee: (data: { doctorId: string; amount: number }) =>
    apiClient.post<ApiResponse<OpdFee>>(`/api/hospital-admin/opd-charge/create?doctorId=${data.doctorId}`, data).then(res => res.data.data),
  updateOpdFee: (id: string, data: { amount: number }) =>
    apiClient.patch<ApiResponse<OpdFee>>(`/api/hospital-admin/opd-charge/update/${id}`, data).then(res => res.data.data),
  deleteOpdFee: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/hospital-admin/opd-charge/delete/${id}`).then(res => res.data.data),

  // Shifts
  getShifts: () => apiClient.get<ApiResponse<Shift[]>>('/api/hospital-admin/shifts').then(res => res.data.data),
  getStaff: () => apiClient.get<ApiResponse<Staff[]>>('/api/hospital-admin/staff/fetch').then(res => res.data.data),
  createShift: (data: Omit<Shift, 'id' | 'status'>) =>
    apiClient.post<ApiResponse<Shift>>('/api/hospital-admin/shift/create', data).then(res => res.data.data),
  updateShift: (id: string, data: Partial<Omit<Shift, 'id' | 'status'>>) =>
    apiClient.patch<ApiResponse<Shift>>(`/api/hospital-admin/shift/update/${id}`, data).then(res => res.data.data),
  deleteShift: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/hospital-admin/shift/delete/${id}`).then(res => res.data.data),

  // Staff Management
  createStaff: (data: StaffFormData) =>
    apiClient.post<ApiResponse<Staff>>('/api/hospital-admin/staff/add', data).then(res => res.data.data),
  updateStaff: (id: string, data: Partial<StaffFormData>) =>
    apiClient.patch<ApiResponse<Staff>>(`/api/hospital-admin/staff/update/${id}`, data).then(res => res.data.data),
  deleteStaff: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/hospital-admin/staff/delete/${id}`).then(res => res.data.data),
}; 