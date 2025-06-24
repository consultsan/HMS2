import { api } from '@/lib/api';
import { TempShift } from '@/types/types';

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
    phoneNumber: string;
    status: 'ACTIVE' | 'INACTIVE';
    specialisation?: string;
}

export interface StaffFormData {
    name: string;
    email: string;
    password: string;
    role: string;
    specialisation: string;
    deptId: string;
    status?: 'ACTIVE' | 'INACTIVE';
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

interface ApiResponse<T> {
    data: T;
    message?: string;
    status?: string;
}

export const hospitalAdminApi = {
    // Departments
    getDepartments: () => api.get<ApiResponse<Department[]>>('/api/hospital-admin/departments').then(res => res.data.data),
    createDepartment: (data: { name: string; description: string }) =>
        api.post<ApiResponse<Department>>('/api/hospital-admin/add/department', data).then(res => res.data.data),

    // OPD Fees
    getOpdFees: () => api.get<ApiResponse<OpdFee[]>>('/api/hospital-admin/opd-charge/fetch').then(res => res.data.data),
    getDoctors: () => api.get<ApiResponse<Doctor[]>>('/api/hospital-admin/staff/fetch').then(res => res.data.data),
    createOpdFee: (data: { doctorId: string; amount: number }) =>
        api.post<ApiResponse<OpdFee>>(`/api/hospital-admin/opd-charge/create?doctorId=${data.doctorId}`, data).then(res => res.data.data),
    updateOpdFee: (id: string, data: { amount: number }) =>
        api.patch<ApiResponse<OpdFee>>(`/api/hospital-admin/opd-charge/update/${id}`, data).then(res => res.data.data),
    deleteOpdFee: (id: string) =>
        api.delete<ApiResponse<void>>(`/api/hospital-admin/opd-charge/delete/${id}`).then(res => res.data.data),

    // Staff Management
    getStaff: () => api.get<ApiResponse<Staff[]>>('/api/hospital-admin/staff/fetch').then(res => res.data.data),
    createStaff: (data: StaffFormData) =>
        api.post<ApiResponse<Staff>>('/api/hospital-admin/staff/add', data).then(res => res.data.data),
    updateStaff: (id: string, data: Partial<StaffFormData>) =>
        api.patch<ApiResponse<Staff>>(`/api/hospital-admin/staff/update/${id}`, data).then(res => res.data.data),
    deleteStaff: (id: string) =>
        api.delete<ApiResponse<void>>(`/api/hospital-admin/staff/delete/${id}`).then(res => res.data.data),

    // Shifts
    getShifts: () => api.get<ApiResponse<Shift[]>>('/api/hospital-admin/shifts').then(res => res.data.data),
    createShift: (data: Omit<Shift, 'id' | 'status'>) =>
        api.post<ApiResponse<Shift>>('/api/hospital-admin/shift/create', data).then(res => res.data.data),
    updateShift: (id: string, data: Partial<Omit<Shift, 'id' | 'status'>>) =>
        api.patch<ApiResponse<Shift>>(`/api/hospital-admin/shift/update/${id}`, data).then(res => res.data.data),
    deleteShift: (id: string) =>
        api.delete<ApiResponse<void>>(`/api/hospital-admin/shift/delete/${id}`).then(res => res.data.data),

    // Temp Shifts
    getTempShifts: (staffId: string) => api.get<ApiResponse<Shift[]>>(`/api/hospital-admin/shift/temp-shift/${staffId}`).then(res => res.data.data),
    createTempShift: (data: TempShift) =>
        api.post<ApiResponse<TempShift>>('/api/hospital-admin/shift/create-temp', data).then(res => res.data.data),
    deleteTempShift: (id: string) =>
        api.delete<ApiResponse<void>>(`/api/hospital-admin/shift/temp-shift/${id}`).then(res => res.data.data),
};
