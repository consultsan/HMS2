export enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN",
    DOCTOR = "DOCTOR",
    NURSE = "NURSE",
    RECEPTIONIST = "RECEPTIONIST",
    SALES_PERSON = "SALES_PERSON",
    LAB_TECHNICIAN = "LAB_TECHNICIAN",
    PHARMACIST = "PHARMACIST"
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    hospitalId?: string;
}

export enum RegistrationMode {
    OPD = "OPD",
    IPD = "IPD",
    EMERGENCY = "EMERGENCY"
}

export enum RegistrationSource {
    WALK_IN = "WALK_IN",
    REFERRAL = "REFERRAL",
    DIGITAL = "DIGITAL",
    AFFILIATE = "AFFILIATE",
    DOCTOR_REFERRAL = "DOCTOR_REFERRAL"
}

export enum Status {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE"
}

export enum PatientDoc {
    PHOTO = "PHOTO",
    ID_PROOF = "ID_PROOF",
    INSURANCE_CARD = "INSURANCE_CARD"
}

export enum Relation {
    PARENT_CHILD = "PARENT_CHILD",
    SPOUSE = "SPOUSE",
    SIBLING = "SIBLING"
}

export enum MaritalStatus {
    BACHELOR = "BACHELOR",
    MARRIED = "MARRIED",
    DIVORCED = "DIVORCED",
    WIDOWED = "WIDOWED"
}

export enum AppointmentStatus {
    SCHEDULED = "SCHEDULED",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
    DIAGNOSED = "DIAGNOSED",
    PENDING = "PENDING"
}

export enum VisitType {
    OPD = "OPD",
    IPD = "IPD",
    ER = "ER",
    FOLLOW_UP = "FOLLOW_UP"
}

export enum VitalType {
    BP_SYSTOLIC = "BP_SYSTOLIC",
    BP_DIASTOLIC = "BP_DIASTOLIC",
    HEART_RATE = "HEART_RATE",
    TEMPERATURE = "TEMPERATURE",
    WEIGHT = "WEIGHT",
    HEIGHT = "HEIGHT",
    SPO2 = "SPO2",
    RESPIRATORY_RATE = "RESPIRATORY_RATE"
}

export enum AppointmentAttachType {
    PRESCRIPTION = "PRESCRIPTION",
    LAB_REPORT = "LAB_REPORT",
    MEDICAL_REPORT = "MEDICAL_REPORT",
    OTHER = "OTHER"
}

export enum ShiftName {
    GENERAL = "GENERAL",
    NIGHT = "NIGHT"
}

export enum WeekDay {
    MONDAY = "MONDAY",
    TUESDAY = "TUESDAY",
    WEDNESDAY = "WEDNESDAY",
    THURSDAY = "THURSDAY",
    FRIDAY = "FRIDAY",
    SATURDAY = "SATURDAY",
    SUNDAY = "SUNDAY"
}

export enum BloodGroup {
    A_POSITIVE = "A_POSITIVE",
    A_NEGATIVE = "A_NEGATIVE",
    B_POSITIVE = "B_POSITIVE",
    B_NEGATIVE = "B_NEGATIVE",
    AB_POSITIVE = "AB_POSITIVE",
    AB_NEGATIVE = "AB_NEGATIVE",
    O_POSITIVE = "O_POSITIVE",
    O_NEGATIVE = "O_NEGATIVE"
}

export enum SurgicalStatus {
    NOT_REQUIRED = "NOT_REQUIRED",
    NOT_CONFIRMED = "NOT_CONFIRMED",
    CONFIRMED = "CONFIRMED"
}

export enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}

export enum LabTestStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    SENT_EXTERNAL = "SENT_EXTERNAL"
}

export interface PatientFamilyLink {
    id: string;
    patientId: string;
    relationship: Relation;
    relativeId: string;
}

export interface Patient {
    id: string;
    patientUniqueId: string;
    name: string;
    dob: Date;
    gender: Gender;
    phone: string;
    status: Status;
    registrationMode: RegistrationMode;
    registrationSource: RegistrationSource;
    registrationSourceDetails?: string;
    maritalStatus?: MaritalStatus;
    address?: string;
    preExistingCondition?: string;
    chronicDisease?: string;
    email?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    allergy?: string;
    bloodGroup?: BloodGroup;
    createdAt: Date;
    updatedAt: Date;
    hospitalId: string;
    documents?: PatientDocument[];
    relativesAdded?: PatientFamilyLink[];
    relativeOfOthers?: PatientFamilyLink[];
    appointments?: Appointment[];
}

export interface PatientDocument {
    id: string;
    type: PatientDoc;
    url: string;
    uploadedAt: Date;
    patientId: string;
}

export interface Hospital {
    id: string;
    name: string;
    address: string;
    contactNumber: string;
    email: string;
    status: Status;
    createdAt: Date;
    updatedAt: Date;
}

export interface HospitalAdmin {
    id: string;
    email: string;
    password: string;
    name: string;
    status: Status;
    role: UserRole;
    hospitalId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Department {
    id: string;
    name: string;
    hospitalId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface HospitalStaff {
    id: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    specialisation?: string;
    status: Status;
    hospitalId: string;
    deptId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Appointment {
    id: string;
    scheduledAt: Date;
    visitType: VisitType;
    status: AppointmentStatus;
    patientId: string;
    doctorId: string;
    hospitalId: string;
    createdAt: Date;
    updatedAt: Date;
    patient?: Patient;
    vitals?: Vital[];
    attachments?: AppointmentAttachment[];
    diagnosisRecord?: DiagnosisRecord;
    surgery?: Surgery;
}

export interface DiagnosisRecord {
    id: string;
    diagnosis: string;
    notes?: string;
    medicines: any; // JSON type
    appointmentId: string;
    followUpAppointmentId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Vital {
    id: string;
    type: VitalType;
    value: number;
    recordedAt: Date;
    unit?: string;
    notes?: string;
    appointmentId: string;
}

export interface AppointmentAttachment {
    id: string;
    type: AppointmentAttachType;
    url: string;
    createdAt: Date;
    appointmentId: string;
}

export interface LabTest {
    id: string;
    code: string;
    name: string;
    description?: string;
    sampleType?: string;
    createdAt: Date;
    updatedAt: Date;
    parameters?: LabTestParameter[];
}

export interface LabTestParameter {
    id: string;
    labTestId: string;
    name: string;
    unit?: string;
    lowerLimit?: number;
    upperLimit?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface AppointmentLabTest {
    id: string;
    appointmentId?: string;
    patientId?: string;
    labTestId: string;
    isSentExternal: boolean;
    externalLabName?: string;
    status: LabTestStatus;
    tentativeReportDate?: Date;
    referredFromOutside: boolean;
    createdAt: Date;
    updatedAt: Date;
    results?: AppointmentLabTestResult[];
}

export interface AppointmentLabTestResult {
    id: string;
    appointmentLabTestId: string;
    parameterId: string;
    value: number;
    unitOverride?: string;
    notes?: string;
    attachmentId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Shift {
    id: string;
    shiftName: ShiftName;
    day: WeekDay;
    startTime: string;
    endTime: string;
    status: Status;
    hospitalId: string;
    staffId: string;
    createdAt: Date;
    updatedAt: Date;
}


export interface TempShift {
    id: string;
    startTime: Date;
    endTime: Date;
    status: Status;
    hospitalId: string;
    staffId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Slot {
    id: string;
    timeSlot: Date;
    doctorId: string;
    appointment1Id: string;
    appointment2Id?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Surgery {
    id: string;
    category: string;
    description?: string;
    scheduledAt?: Date;
    status: SurgicalStatus;
    appointmentId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OpdCharge {
    id: string;
    amount: number;
    doctorId: string;
    hospitalId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface LabCharge {
    id: string;
    test: string;
    amount: number;
    hospitalId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DiseaseTemplate {
    id: string;
    name: string;
    medicines: any; // JSON type
    doctorId: string;
    labTests?: LabTest[];
}

export interface SuperAdmin {
    id: string;
    name: string;
    email: string;
    password: string;
    status: Status;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export interface AppointmentDateQuery {
    date: string;
    doctorId?: string;
    patientId?: string;
}

export interface AppointmentAttachment {
    file: File;
    appointmentId: string;
}

