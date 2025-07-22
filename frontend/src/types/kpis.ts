export interface DoctorKpis {
    id: string;
    doctorId: string;
    hospitalId: string;
    totalAppointments: number;
    totalRevenue: number;
    totalPatients: number;
    totalFollowUps: number;
    totalCancelledAppointments: number;
    totalCompletedAppointments: number;
}

export interface HospitalAdminKpis {
    id: string;
    hospitalId: string;
    totalAppointments: number;
    totalRevenue: number;
    totalPatients: number;
    activePatients: number;
    totalStaff: number;
    totalLabTests: number;
    pendingLabTests: number;
    totalFollowUps: number;
    totalCancelledAppointments: number;
    totalCompletedAppointments: number;
    averageRevenuePerAppointment: number;
}