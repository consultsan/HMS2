import { PatientFamilyLink } from "@/pages/consultation/interfaces/PatinetInterface";
import { SurgicalStatus } from "@/types/types";

export interface PatientDocument {
    id: string;
    type: string;
    url: string;
    uploadedAt?: Date;
}

export interface Patient {
    id: string;
    patientUniqueId: string;
    name: string;
    dob: Date;
    gender: string;
    phone: string;
    registrationMode: 'OPD' | 'IPD' | 'EMERGENCY';
    registrationSource: 'WALK_IN' | 'REFERRAL' | 'DIGITAL' | 'AFFILIATE' | 'DOCTOR_REFERRAL';
    status: string;
    hospitalId: string;
    maritalStatus: string;
    email: string;
    address: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    allergy: string;
    bloodGroup: string;
    preExistingCondition: string;
    chronicDisease: string;
    documents: PatientDocument[];
    relativesAdded: PatientFamilyLink[];
    relativeOfOthers: PatientFamilyLink[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PatientFormData extends Omit<Patient, 'dob' | 'createdAt' | 'updatedAt'> {
    dob: string;
    documents: PatientDocument[];
}


export interface Appointment {
    id: string;
    scheduledAt: Date;
    visitType: 'OPD' | 'IPD' | 'EMERGENCY';
    status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    updatedAt: string;
    patient: Patient;
    doctor: {
        name: string;
        id: string;
    };
    bills?: Bill[];
}

export interface Bill {
    id: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    createdAt: Date;
    updatedAt: Date;
}   


export interface Surgery {
    id: string;
    category: string;
    description: string;
    scheduledAt: Date;
    status: SurgicalStatus;
    appointmentId: string;
    appointment: Appointment;
}

export interface Department {
    id: string;
    name: string;
    description: string;
}