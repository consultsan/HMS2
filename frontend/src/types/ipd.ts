// IPD System Enums
export enum IPDStatus {
  QUEUED = 'QUEUED',
  ADMITTED = 'ADMITTED',
  DISCHARGED = 'DISCHARGED',
  TRANSFERRED = 'TRANSFERRED'
}

export enum InsuranceType {
  CASHLESS = 'CASHLESS',
  REIMBURSEMENT = 'REIMBURSEMENT',
  NA = 'NA'
}

export enum WardType {
  GENERAL = 'GENERAL',
  ICU = 'ICU',
  PRIVATE = 'PRIVATE',
  SEMI_PRIVATE = 'SEMI_PRIVATE',
  EMERGENCY = 'EMERGENCY'
}

export enum InsuranceVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  UNDER_REVIEW = 'UNDER_REVIEW'
}

export enum InsuranceDocumentType {
  POLICY_CARD = 'POLICY_CARD',
  ID_CARD = 'ID_CARD',
  AUTHORIZATION_LETTER = 'AUTHORIZATION_LETTER',
  MEDICAL_REPORTS = 'MEDICAL_REPORTS',
  PRESCRIPTION = 'PRESCRIPTION',
  OTHER = 'OTHER'
}

// IPD Queue Interfaces
export interface IPDQueueEntry {
  id: string;
  ipdNumber: string;
  status: IPDStatus;
  patient: {
    id: string;
    name: string;
    uhid: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    phone: string;
    dob: string;
  };
  createdBy: {
    id: string;
    name: string;
    specialisation: string;
  };
  hospital: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  admittedAt?: string;
  dischargedAt?: string;
  admission?: {
    id: string;
    admissionDate: string;
    dischargeDate?: string;
    status: string;
    insuranceType: InsuranceType;
    insuranceCompany: string;
    policyNumber: string;
    tpaName: string;
    wardType: WardType;
    roomNumber: string;
    bedNumber: string;
    chiefComplaint: string;
    admissionNotes: string;
    dischargeNotes?: string;
    assignedDoctor: {
      id: string;
      name: string;
      specialisation: string;
    };
  };
}

export interface CreateIPDQueueData {
  patientId: string;
  notes?: string;
}

export interface UpdateIPDQueueStatusData {
  status: IPDStatus;
  notes?: string;
}

// IPD Admission Interfaces
export interface IPDAdmissionData {
  queueId: string;
  assignedDoctorId: string;
  insuranceType: InsuranceType;
  insuranceCompany?: string;
  policyNumber?: string;
  tpaName?: string;
  wardType: WardType;
  roomNumber?: string;
  bedNumber?: string;
  chiefComplaint?: string;
  admissionNotes?: string;
  status?: IPDStatus;
  dischargeDate?: string;
  dischargeNotes?: string;
}

export interface IPDAdmission {
  id: string;
  admissionDate: string;
  dischargeDate?: string;
  status: IPDStatus;
  insuranceType: InsuranceType;
  insuranceCompany?: string;
  policyNumber?: string;
  tpaName?: string;
  wardType: WardType;
  roomNumber?: string;
  bedNumber?: string;
  chiefComplaint?: string;
  admissionNotes?: string;
  dischargeNotes?: string;
  createdAt: string;
  updatedAt: string;
  queueId: string;
  assignedDoctorId: string;
  queue: IPDQueueEntry;
  assignedDoctor: {
    id: string;
    name: string;
    specialisation: string;
  };
  visits?: IPDVisit[];
  dischargeSummary?: IPDDischargeSummary;
}

// IPD Visit Interfaces
export interface IPDVisitData {
  admissionId: string;
  visitNotes: string;
  clinicalObservations?: string;
  treatmentGiven?: string;
  medicationChanges?: string;
  patientResponse?: string;
  nextVisitPlan?: string;
  vitals?: IPDVisitVitalData[];
}

export interface IPDVisitVitalData {
  type: 'BP_SYSTOLIC' | 'BP_DIASTOLIC' | 'HEART_RATE' | 'TEMPERATURE' | 'WEIGHT' | 'HEIGHT' | 'SPO2' | 'RESPIRATORY_RATE';
  value: number;
  unit?: string;
  notes?: string;
}

export interface IPDVisit {
  id: string;
  admissionId: string;
  doctorId: string;
  visitNotes: string;
  clinicalObservations?: string;
  treatmentGiven?: string;
  medicationChanges?: string;
  patientResponse?: string;
  nextVisitPlan?: string;
  createdAt: string;
  vitals?: IPDVisitVital[];
  doctor: {
    id: string;
    name: string;
    specialisation: string;
  };
}

export interface IPDVisitVital {
  id: string;
  type: 'BP_SYSTOLIC' | 'BP_DIASTOLIC' | 'HEART_RATE' | 'TEMPERATURE' | 'WEIGHT' | 'HEIGHT' | 'SPO2' | 'RESPIRATORY_RATE';
  value: number;
  unit?: string;
  notes?: string;
  recordedAt: string;
}

// IPD Discharge Summary Interface
export interface IPDDischargeSummary {
  id: string;
  summaryDate: string;
  admissionDate: string;
  dischargeDate: string;
  totalStayDuration: number;
  chiefComplaint: string;
  finalDiagnosis: string;
  treatmentSummary: string;
  proceduresPerformed?: string;
  medicationsPrescribed: string;
  followUpInstructions: string;
  doctorSignature?: string;
  hospitalStamp?: string;
  createdAt: string;
  updatedAt: string;
}

// Ward Management Interfaces
export interface Ward {
  id: string;
  name: string;
  type: WardType;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  hospitalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWardData {
  name: string;
  type: WardType;
  totalBeds: number;
}

export interface UpdateWardBedCountData {
  occupiedBeds: number;
  availableBeds: number;
}

// Insurance Company Interfaces
export interface InsuranceCompany {
  id: string;
  name: string;
  isPartnered: boolean;
  tpaName?: string;
  contactInfo?: string;
  hospitalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInsuranceCompanyData {
  name: string;
  isPartnered?: boolean;
  tpaName?: string;
  contactInfo?: string;
}

// Insurance Processing Interfaces
export interface InsuranceVerification {
  id: string;
  verificationStatus: InsuranceVerificationStatus;
  policyValidFrom?: string;
  policyValidTo?: string;
  coverageAmount?: number;
  deductibleAmount?: number;
  coPaymentPercentage?: number;
  preAuthorizationRequired: boolean;
  preAuthorizationNumber?: string;
  preAuthorizationDate?: string;
  preAuthorizationExpiry?: string;
  admissionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInsuranceVerificationData {
  admissionId: string;
  policyValidFrom?: string;
  policyValidTo?: string;
  coverageAmount?: number;
  deductibleAmount?: number;
  coPaymentPercentage?: number;
  preAuthorizationRequired: boolean;
  preAuthorizationNumber?: string;
  preAuthorizationDate?: string;
  preAuthorizationExpiry?: string;
}

export interface InsuranceDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  documentType: InsuranceDocumentType;
  admissionId: string;
  uploadedById: string;
  createdAt: string;
}

export interface CreateInsuranceDocumentData {
  admissionId: string;
  uploadedById: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  documentType: InsuranceDocumentType;
}

// Dashboard Statistics Interface
export interface IPDDashboardStats {
  totalQueued: number;
  totalAdmitted: number;
  totalDischarged: number;
  wardOccupancy: Array<{
    name: string;
    type: WardType;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
  }>;
}

// Doctor Interface (shared with other modules)
export interface Doctor {
  id: string;
  name: string;
  specialisation: string;
  status: 'ACTIVE' | 'INACTIVE';
}

// API Response Types
export interface IPDQueueResponse {
  message: string;
  data: IPDQueueEntry;
}

export interface IPDAdmissionResponse {
  message: string;
  data: IPDAdmission;
}

export interface IPDDashboardStatsResponse {
  message: string;
  data: IPDDashboardStats;
}

export interface WardsResponse {
  message: string;
  data: Ward[];
}

export interface InsuranceCompaniesResponse {
  message: string;
  data: InsuranceCompany[];
}

export interface DoctorsResponse {
  message: string;
  data: Doctor[];
}
