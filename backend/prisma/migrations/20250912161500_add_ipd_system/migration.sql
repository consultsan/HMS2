-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SALES_PERSON', 'LAB_TECHNICIAN', 'PHARMACIST');

-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('OPD', 'IPD', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "RegistrationSource" AS ENUM ('WALK_IN', 'REFERRAL', 'DIGITAL', 'AFFILIATE');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PatientDoc" AS ENUM ('PHOTO', 'ID_PROOF', 'INSURANCE_CARD', 'PRESCRIPTION', 'LAB_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "Relation" AS ENUM ('PARENT_CHILD', 'SPOUSE', 'SIBLING');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('BACHELOR', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'DIAGNOSED', 'PENDING');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('OPD', 'IPD', 'ER', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "VitalType" AS ENUM ('BP_SYSTOLIC', 'BP_DIASTOLIC', 'HEART_RATE', 'TEMPERATURE', 'WEIGHT', 'HEIGHT', 'SPO2', 'RESPIRATORY_RATE');

-- CreateEnum
CREATE TYPE "AppointmentAttachType" AS ENUM ('PRESCRIPTION', 'MEDICAL_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ShiftName" AS ENUM ('GENERAL', 'NIGHT');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE');

-- CreateEnum
CREATE TYPE "SurgicalStatus" AS ENUM ('NOT_REQUIRED', 'NOT_CONFIRMED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "LabTestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'SENT_EXTERNAL');

-- CreateEnum
CREATE TYPE "IPDStatus" AS ENUM ('QUEUED', 'ADMITTED', 'DISCHARGED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('CASHLESS', 'REIMBURSEMENT', 'NA');

-- CreateEnum
CREATE TYPE "WardType" AS ENUM ('GENERAL', 'ICU', 'PRIVATE', 'SEMI_PRIVATE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIALLY_PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'INSURANCE', 'CHEQUE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('OPD_CONSULTATION', 'LAB_TEST', 'SURGERY', 'MEDICINE', 'ROOM_CHARGE', 'PROCEDURE', 'EMERGENCY', 'FOLLOW_UP');

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'HOSPITAL_ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT NOT NULL,

    CONSTRAINT "HospitalAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalStaff" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "specialisation" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "deptId" TEXT NOT NULL,

    CONSTRAINT "HospitalStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "timeSlot" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointment1Id" TEXT NOT NULL,
    "appointment2Id" TEXT,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempShift" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "hospitalId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "TempShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "shiftName" "ShiftName" NOT NULL,
    "day" "WeekDay" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "hospitalId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "patientUniqueId" TEXT NOT NULL,
    "uhid" TEXT,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "registrationMode" "RegistrationMode" NOT NULL,
    "registrationSource" "RegistrationSource" NOT NULL,
    "registrationSourceDetails" TEXT,
    "maritalStatus" "MaritalStatus",
    "address" TEXT,
    "preExistingCondition" TEXT,
    "chronicDisease" TEXT,
    "email" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "allergy" TEXT,
    "bloodGroup" "BloodGroup",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientDocument" (
    "id" TEXT NOT NULL,
    "type" "PatientDoc" NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientId" TEXT NOT NULL,

    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientFamilyLink" (
    "id" TEXT NOT NULL,
    "relationship" "Relation" NOT NULL,
    "patientId" TEXT NOT NULL,
    "relativeId" TEXT NOT NULL,

    CONSTRAINT "PatientFamilyLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "visitId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "visitType" "VisitType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "orderedBy" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "urgentOrder" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billId" TEXT,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sampleType" TEXT,
    "charge" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestParameter" (
    "id" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "lowerLimit" DOUBLE PRECISION,
    "upperLimit" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentLabTestAttachment" (
    "id" TEXT NOT NULL,
    "appointmentLabTestId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentLabTestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentLabTest" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT,
    "referredFromOutside" BOOLEAN NOT NULL DEFAULT false,
    "patientId" TEXT,
    "labTestId" TEXT NOT NULL,
    "isSentExternal" BOOLEAN NOT NULL DEFAULT false,
    "externalLabName" TEXT,
    "status" "LabTestStatus" NOT NULL DEFAULT 'PENDING',
    "tentativeReportDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "labOrderId" TEXT,

    CONSTRAINT "AppointmentLabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentLabTestResult" (
    "id" TEXT NOT NULL,
    "appointmentLabTestId" TEXT NOT NULL,
    "parameterId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unitOverride" TEXT,
    "notes" TEXT,
    "attachmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentLabTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisRecord" (
    "id" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "medicines" JSONB NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "followUpAppointmentId" TEXT,

    CONSTRAINT "DiagnosisRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vital" (
    "id" TEXT NOT NULL,
    "type" "VitalType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unit" TEXT,
    "notes" TEXT,
    "appointmentId" TEXT NOT NULL,

    CONSTRAINT "Vital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentAttachment" (
    "id" TEXT NOT NULL,
    "type" "AppointmentAttachType" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appointmentId" TEXT NOT NULL,

    CONSTRAINT "AppointmentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabCharge" (
    "id" TEXT NOT NULL,
    "test" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hospitalId" TEXT NOT NULL,

    CONSTRAINT "LabCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueAmount" DOUBLE PRECISION NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "billDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appointmentId" TEXT,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillItem" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "itemType" "BillType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "labTestId" TEXT,
    "surgeryId" TEXT,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insurance" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "coverageType" TEXT NOT NULL,
    "coverageAmount" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "maxDiscount" DOUBLE PRECISION,
    "minAmount" DOUBLE PRECISION,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpdCharge" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "doctorId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,

    CONSTRAINT "OpdCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiseaseTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "medicines" JSONB NOT NULL,
    "clinicalNotes" JSONB,
    "doctorId" TEXT NOT NULL,

    CONSTRAINT "DiseaseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Surgery" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "SurgicalStatus" NOT NULL DEFAULT 'NOT_CONFIRMED',
    "appointmentId" TEXT NOT NULL,

    CONSTRAINT "Surgery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UhidSequence" (
    "id" TEXT NOT NULL,
    "yearCode" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UhidSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPDQueue" (
    "id" TEXT NOT NULL,
    "ipdNumber" TEXT NOT NULL,
    "status" "IPDStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "IPDQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPDAdmission" (
    "id" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargeDate" TIMESTAMP(3),
    "status" "IPDStatus" NOT NULL DEFAULT 'ADMITTED',
    "insuranceType" "InsuranceType" NOT NULL DEFAULT 'NA',
    "insuranceCompany" TEXT,
    "policyNumber" TEXT,
    "tpaName" TEXT,
    "wardType" "WardType" NOT NULL,
    "roomNumber" TEXT,
    "bedNumber" TEXT,
    "chiefComplaint" TEXT,
    "admissionNotes" TEXT,
    "dischargeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "queueId" TEXT NOT NULL,
    "assignedDoctorId" TEXT NOT NULL,

    CONSTRAINT "IPDAdmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPDVisit" (
    "id" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitNotes" TEXT NOT NULL,
    "clinicalObservations" TEXT,
    "treatmentGiven" TEXT,
    "medicationChanges" TEXT,
    "patientResponse" TEXT,
    "nextVisitPlan" TEXT,
    "admissionId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,

    CONSTRAINT "IPDVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPDVisitVital" (
    "id" TEXT NOT NULL,
    "type" "VitalType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitId" TEXT NOT NULL,

    CONSTRAINT "IPDVisitVital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IPDDischargeSummary" (
    "id" TEXT NOT NULL,
    "summaryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "dischargeDate" TIMESTAMP(3) NOT NULL,
    "totalStayDuration" INTEGER NOT NULL,
    "chiefComplaint" TEXT NOT NULL,
    "finalDiagnosis" TEXT NOT NULL,
    "treatmentSummary" TEXT NOT NULL,
    "proceduresPerformed" TEXT,
    "medicationsPrescribed" TEXT NOT NULL,
    "followUpInstructions" TEXT NOT NULL,
    "doctorSignature" TEXT,
    "hospitalStamp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "admissionId" TEXT NOT NULL,

    CONSTRAINT "IPDDischargeSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPartnered" BOOLEAN NOT NULL DEFAULT false,
    "tpaName" TEXT,
    "contactInfo" TEXT,
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WardType" NOT NULL,
    "totalBeds" INTEGER NOT NULL,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "availableBeds" INTEGER NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DiseaseTemplateToLabTest" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE INDEX "Department_hospitalId_idx" ON "Department"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalAdmin_email_key" ON "HospitalAdmin"("email");

-- CreateIndex
CREATE INDEX "HospitalAdmin_hospitalId_idx" ON "HospitalAdmin"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalStaff_email_key" ON "HospitalStaff"("email");

-- CreateIndex
CREATE INDEX "HospitalStaff_hospitalId_idx" ON "HospitalStaff"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_appointment1Id_key" ON "Slot"("appointment1Id");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_appointment2Id_key" ON "Slot"("appointment2Id");

-- CreateIndex
CREATE INDEX "Slot_doctorId_idx" ON "Slot"("doctorId");

-- CreateIndex
CREATE INDEX "Slot_timeSlot_idx" ON "Slot"("timeSlot");

-- CreateIndex
CREATE INDEX "Slot_appointment1Id_idx" ON "Slot"("appointment1Id");

-- CreateIndex
CREATE INDEX "Slot_appointment2Id_idx" ON "Slot"("appointment2Id");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_doctorId_timeSlot_key" ON "Slot"("doctorId", "timeSlot");

-- CreateIndex
CREATE INDEX "TempShift_hospitalId_idx" ON "TempShift"("hospitalId");

-- CreateIndex
CREATE INDEX "TempShift_staffId_idx" ON "TempShift"("staffId");

-- CreateIndex
CREATE INDEX "Shift_hospitalId_idx" ON "Shift"("hospitalId");

-- CreateIndex
CREATE INDEX "Shift_staffId_idx" ON "Shift"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientUniqueId_key" ON "Patient"("patientUniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_uhid_key" ON "Patient"("uhid");

-- CreateIndex
CREATE INDEX "Patient_hospitalId_idx" ON "Patient"("hospitalId");

-- CreateIndex
CREATE INDEX "Patient_patientUniqueId_idx" ON "Patient"("patientUniqueId");

-- CreateIndex
CREATE INDEX "Patient_uhid_idx" ON "Patient"("uhid");

-- CreateIndex
CREATE INDEX "PatientDocument_patientId_idx" ON "PatientDocument"("patientId");

-- CreateIndex
CREATE INDEX "PatientFamilyLink_patientId_idx" ON "PatientFamilyLink"("patientId");

-- CreateIndex
CREATE INDEX "PatientFamilyLink_relativeId_idx" ON "PatientFamilyLink"("relativeId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientFamilyLink_patientId_relativeId_key" ON "PatientFamilyLink"("patientId", "relativeId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_visitId_key" ON "Appointment"("visitId");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_hospitalId_idx" ON "Appointment"("hospitalId");

-- CreateIndex
CREATE INDEX "Appointment_createdBy_idx" ON "Appointment"("createdBy");

-- CreateIndex
CREATE INDEX "Appointment_visitId_idx" ON "Appointment"("visitId");

-- CreateIndex
CREATE INDEX "LabOrder_patientId_idx" ON "LabOrder"("patientId");

-- CreateIndex
CREATE INDEX "LabOrder_appointmentId_idx" ON "LabOrder"("appointmentId");

-- CreateIndex
CREATE INDEX "LabOrder_orderDate_idx" ON "LabOrder"("orderDate");

-- CreateIndex
CREATE INDEX "LabOrder_status_idx" ON "LabOrder"("status");

-- CreateIndex
CREATE INDEX "LabOrder_billId_idx" ON "LabOrder"("billId");

-- CreateIndex
CREATE INDEX "LabTestParameter_labTestId_idx" ON "LabTestParameter"("labTestId");

-- CreateIndex
CREATE UNIQUE INDEX "LabTestParameter_labTestId_name_key" ON "LabTestParameter"("labTestId", "name");

-- CreateIndex
CREATE INDEX "AppointmentLabTest_appointmentId_idx" ON "AppointmentLabTest"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentLabTest_labTestId_idx" ON "AppointmentLabTest"("labTestId");

-- CreateIndex
CREATE INDEX "AppointmentLabTest_status_idx" ON "AppointmentLabTest"("status");

-- CreateIndex
CREATE INDEX "AppointmentLabTest_labOrderId_idx" ON "AppointmentLabTest"("labOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentLabTestResult_attachmentId_key" ON "AppointmentLabTestResult"("attachmentId");

-- CreateIndex
CREATE INDEX "AppointmentLabTestResult_appointmentLabTestId_idx" ON "AppointmentLabTestResult"("appointmentLabTestId");

-- CreateIndex
CREATE INDEX "AppointmentLabTestResult_parameterId_idx" ON "AppointmentLabTestResult"("parameterId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentLabTestResult_appointmentLabTestId_parameterId_key" ON "AppointmentLabTestResult"("appointmentLabTestId", "parameterId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisRecord_appointmentId_key" ON "DiagnosisRecord"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisRecord_followUpAppointmentId_key" ON "DiagnosisRecord"("followUpAppointmentId");

-- CreateIndex
CREATE INDEX "Vital_appointmentId_idx" ON "Vital"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentAttachment_appointmentId_idx" ON "AppointmentAttachment"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");

-- CreateIndex
CREATE INDEX "Bill_patientId_idx" ON "Bill"("patientId");

-- CreateIndex
CREATE INDEX "Bill_hospitalId_idx" ON "Bill"("hospitalId");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "Bill_billDate_idx" ON "Bill"("billDate");

-- CreateIndex
CREATE INDEX "BillItem_billId_idx" ON "BillItem"("billId");

-- CreateIndex
CREATE INDEX "BillItem_itemType_idx" ON "BillItem"("itemType");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Insurance_patientId_idx" ON "Insurance"("patientId");

-- CreateIndex
CREATE INDEX "Insurance_isActive_idx" ON "Insurance"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_code_key" ON "Discount"("code");

-- CreateIndex
CREATE INDEX "Discount_isActive_idx" ON "Discount"("isActive");

-- CreateIndex
CREATE INDEX "Discount_validFrom_validTo_idx" ON "Discount"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "OpdCharge_doctorId_key" ON "OpdCharge"("doctorId");

-- CreateIndex
CREATE INDEX "OpdCharge_doctorId_idx" ON "OpdCharge"("doctorId");

-- CreateIndex
CREATE INDEX "OpdCharge_hospitalId_idx" ON "OpdCharge"("hospitalId");

-- CreateIndex
CREATE INDEX "DiseaseTemplate_doctorId_idx" ON "DiseaseTemplate"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Surgery_appointmentId_key" ON "Surgery"("appointmentId");

-- CreateIndex
CREATE INDEX "Surgery_appointmentId_idx" ON "Surgery"("appointmentId");

-- CreateIndex
CREATE INDEX "UhidSequence_yearCode_idx" ON "UhidSequence"("yearCode");

-- CreateIndex
CREATE UNIQUE INDEX "UhidSequence_yearCode_key" ON "UhidSequence"("yearCode");

-- CreateIndex
CREATE UNIQUE INDEX "IPDQueue_ipdNumber_key" ON "IPDQueue"("ipdNumber");

-- CreateIndex
CREATE INDEX "IPDQueue_patientId_idx" ON "IPDQueue"("patientId");

-- CreateIndex
CREATE INDEX "IPDQueue_hospitalId_idx" ON "IPDQueue"("hospitalId");

-- CreateIndex
CREATE INDEX "IPDQueue_status_idx" ON "IPDQueue"("status");

-- CreateIndex
CREATE INDEX "IPDQueue_createdById_idx" ON "IPDQueue"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "IPDAdmission_queueId_key" ON "IPDAdmission"("queueId");

-- CreateIndex
CREATE INDEX "IPDAdmission_queueId_idx" ON "IPDAdmission"("queueId");

-- CreateIndex
CREATE INDEX "IPDAdmission_assignedDoctorId_idx" ON "IPDAdmission"("assignedDoctorId");

-- CreateIndex
CREATE INDEX "IPDAdmission_status_idx" ON "IPDAdmission"("status");

-- CreateIndex
CREATE INDEX "IPDVisit_admissionId_idx" ON "IPDVisit"("admissionId");

-- CreateIndex
CREATE INDEX "IPDVisit_doctorId_idx" ON "IPDVisit"("doctorId");

-- CreateIndex
CREATE INDEX "IPDVisitVital_visitId_idx" ON "IPDVisitVital"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "IPDDischargeSummary_admissionId_key" ON "IPDDischargeSummary"("admissionId");

-- CreateIndex
CREATE INDEX "IPDDischargeSummary_admissionId_idx" ON "IPDDischargeSummary"("admissionId");

-- CreateIndex
CREATE INDEX "InsuranceCompany_hospitalId_idx" ON "InsuranceCompany"("hospitalId");

-- CreateIndex
CREATE INDEX "Ward_hospitalId_idx" ON "Ward"("hospitalId");

-- CreateIndex
CREATE INDEX "Ward_type_idx" ON "Ward"("type");

-- CreateIndex
CREATE UNIQUE INDEX "_DiseaseTemplateToLabTest_AB_unique" ON "_DiseaseTemplateToLabTest"("A", "B");

-- CreateIndex
CREATE INDEX "_DiseaseTemplateToLabTest_B_index" ON "_DiseaseTemplateToLabTest"("B");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalAdmin" ADD CONSTRAINT "HospitalAdmin_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalStaff" ADD CONSTRAINT "HospitalStaff_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HospitalStaff" ADD CONSTRAINT "HospitalStaff_deptId_fkey" FOREIGN KEY ("deptId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_appointment1Id_fkey" FOREIGN KEY ("appointment1Id") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_appointment2Id_fkey" FOREIGN KEY ("appointment2Id") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempShift" ADD CONSTRAINT "TempShift_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TempShift" ADD CONSTRAINT "TempShift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientFamilyLink" ADD CONSTRAINT "PatientFamilyLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientFamilyLink" ADD CONSTRAINT "PatientFamilyLink_relativeId_fkey" FOREIGN KEY ("relativeId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestParameter" ADD CONSTRAINT "LabTestParameter_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLabTestAttachment" ADD CONSTRAINT "AppointmentLabTestAttachment_appointmentLabTestId_fkey" FOREIGN KEY ("appointmentLabTestId") REFERENCES "AppointmentLabTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLabTest" ADD CONSTRAINT "AppointmentLabTest_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLabTest" ADD CONSTRAINT "AppointmentLabTest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLabTest" ADD CONSTRAINT "AppointmentLabTest_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLabTest" ADD CONSTRAINT "AppointmentLabTest_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLabTestResult" ADD CONSTRAINT "AppointmentLabTestResult_appointmentLabTestId_fkey" FOREIGN KEY ("appointmentLabTestId") REFERENCES "AppointmentLabTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLabTestResult" ADD CONSTRAINT "AppointmentLabTestResult_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "LabTestParameter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLabTestResult" ADD CONSTRAINT "AppointmentLabTestResult_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "AppointmentAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisRecord" ADD CONSTRAINT "DiagnosisRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisRecord" ADD CONSTRAINT "DiagnosisRecord_followUpAppointmentId_fkey" FOREIGN KEY ("followUpAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vital" ADD CONSTRAINT "Vital_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAttachment" ADD CONSTRAINT "AppointmentAttachment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabCharge" ADD CONSTRAINT "LabCharge_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "AppointmentLabTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "Surgery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insurance" ADD CONSTRAINT "Insurance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpdCharge" ADD CONSTRAINT "OpdCharge_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpdCharge" ADD CONSTRAINT "OpdCharge_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiseaseTemplate" ADD CONSTRAINT "DiseaseTemplate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDQueue" ADD CONSTRAINT "IPDQueue_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDQueue" ADD CONSTRAINT "IPDQueue_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDQueue" ADD CONSTRAINT "IPDQueue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDAdmission" ADD CONSTRAINT "IPDAdmission_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "IPDQueue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDAdmission" ADD CONSTRAINT "IPDAdmission_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDVisit" ADD CONSTRAINT "IPDVisit_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDVisit" ADD CONSTRAINT "IPDVisit_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDVisitVital" ADD CONSTRAINT "IPDVisitVital_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "IPDVisit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IPDDischargeSummary" ADD CONSTRAINT "IPDDischargeSummary_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCompany" ADD CONSTRAINT "InsuranceCompany_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ward" ADD CONSTRAINT "Ward_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiseaseTemplateToLabTest" ADD CONSTRAINT "_DiseaseTemplateToLabTest_A_fkey" FOREIGN KEY ("A") REFERENCES "DiseaseTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiseaseTemplateToLabTest" ADD CONSTRAINT "_DiseaseTemplateToLabTest_B_fkey" FOREIGN KEY ("B") REFERENCES "LabTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
