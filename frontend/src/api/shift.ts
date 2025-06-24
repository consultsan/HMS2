import { api } from '@/lib/api';
import { Shift, Status, TempShift } from '@/types/types';

export const shiftApi = {
    // Get all staff shifts for a hospital
    getStaffShifts: () =>
        api.get('/api/hospital-admin/shifts'),

    // Get specific staff member's shifts
    getStaffShiftById: (staffId: string) =>
        api.get(`/api/hospital-admin/staff/fetch/${staffId}`),

    // Create a new shift
    createShift: (shift: Partial<Shift>) =>
        api.post('/api/hospital-admin/shift/create', shift),

    // Update an existing shift
    updateShift: (shiftId: string, shift: Partial<Shift>) =>
        api.patch(`/api/hospital-admin/shift/update/${shiftId}`, shift),

    // Delete a shift
    deleteShift: (shiftId: string) =>
        api.delete(`/api/hospital-admin/shift/delete/${shiftId}`),
    
    createTempShift: (shift: Partial<TempShift>) =>
        api.post('/api/hospital-admin/shift/create-temp', shift),
    getTempShiftByStaff: (staffId: string) =>
        api.get(`/api/hospital-admin/shift/temp-shift/${staffId}`),
    getTempShiftsByHospital: () =>
        api.get('/api/hospital-admin/shift/temp-shift'),
}; 