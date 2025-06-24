export interface DiagnosisRecordInterface {
    id: string;
    diagnosis: string;
    notes: string | null;
    medicines: { name: string; frequency: string }[];
    labTests: { name: string; status: boolean }[];
    appointmentId: string;
    followUpAppointmentId?: string;
    createdAt: string;
    updatedAt: string;
} 