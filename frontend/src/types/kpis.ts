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
    totalAppointments: number;
    totalPatients: number;
    activePatients: number;
    totalStaff: number;
    totalRevenue: number;
    averageRevenuePerAppointment: number;
    totalLabTests: number;
    pendingLabTests: number;
    totalCompletedAppointments: number;
    totalCancelledAppointments: number;
    totalFollowUps: number;
    period?: {
        start: string;
        end: string;
    };
}