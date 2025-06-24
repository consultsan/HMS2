export enum Relation {
    PARENT_CHILD = "PARENT_CHILD",
    SPOUSE = "SPOUSE",
    SIBLING = "SIBLING"
}

export interface PatientFamilyLink {
    patientId: string;
    relationship: Relation;
    relativeId: string
}

export interface Patient {
    id: string;
    patientUniqueId: string;
    name: string;
    dob: Date;
    gender: string;
    phone: string;
    status: string;
    registrationMode: 'OPD' | 'IPD' | 'EMERGENCY';
    registrationSource: 'WALK_IN' | 'REFERRAL' | 'DIGITAL' | 'AFFILIATE' | 'DOCTOR_REFERRAL';
    maritalStatus?: string;
    address?: string;
    preExistingCondition?: string;
    chronicDisease?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    allergy?: string;
    bloodGroup?: string;
    createdAt: Date;
    updatedAt: Date;

    documents?: any[];
    // PatientDocument[] relation
    // Appointments
    hospital?: any; // Hospital relation
    hospitalId: string;
}
