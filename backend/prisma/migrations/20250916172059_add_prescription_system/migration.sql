-- CreateEnum
CREATE TYPE "public"."DrugCategory" AS ENUM ('ANTIBIOTIC', 'ANALGESIC', 'ANTI_INFLAMMATORY', 'CARDIOVASCULAR', 'RESPIRATORY', 'GASTROINTESTINAL', 'NEUROLOGICAL', 'PSYCHIATRIC', 'ENDOCRINE', 'DERMATOLOGICAL', 'OPHTHALMOLOGICAL', 'GYNECOLOGICAL', 'PEDIATRIC', 'EMERGENCY', 'VITAMIN_SUPPLEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DrugForm" AS ENUM ('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'INHALER', 'PATCH', 'SUPPOSITORY', 'POWDER', 'GEL', 'LOTION', 'SPRAY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PrescriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PrescriptionItemStatus" AS ENUM ('PENDING', 'DISPENSED', 'PARTIALLY_DISPENSED', 'CANCELLED', 'OUT_OF_STOCK');

-- CreateTable
CREATE TABLE "public"."Drug" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "brandName" TEXT,
    "category" "public"."DrugCategory" NOT NULL,
    "form" "public"."DrugForm" NOT NULL,
    "strength" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "description" TEXT,
    "isControlledSubstance" BOOLEAN NOT NULL DEFAULT false,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "maximumStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "contraindications" TEXT,
    "sideEffects" TEXT,
    "warnings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DrugInteraction" (
    "id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "drug1Id" TEXT NOT NULL,
    "drug2Id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrugInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Prescription" (
    "id" TEXT NOT NULL,
    "prescriptionNumber" TEXT NOT NULL,
    "status" "public"."PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "diagnosis" TEXT,
    "notes" TEXT,
    "instructions" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "admissionId" TEXT,
    "visitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "drugId" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "route" TEXT,
    "timing" TEXT,
    "specialInstructions" TEXT,
    "status" "public"."PrescriptionItemStatus" NOT NULL DEFAULT 'PENDING',
    "dispensedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PrescriptionHistory" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrescriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Drug_name_key" ON "public"."Drug"("name");

-- CreateIndex
CREATE INDEX "Drug_name_idx" ON "public"."Drug"("name");

-- CreateIndex
CREATE INDEX "Drug_category_idx" ON "public"."Drug"("category");

-- CreateIndex
CREATE INDEX "Drug_isActive_idx" ON "public"."Drug"("isActive");

-- CreateIndex
CREATE INDEX "Drug_isControlledSubstance_idx" ON "public"."Drug"("isControlledSubstance");

-- CreateIndex
CREATE INDEX "DrugInteraction_drug1Id_idx" ON "public"."DrugInteraction"("drug1Id");

-- CreateIndex
CREATE INDEX "DrugInteraction_drug2Id_idx" ON "public"."DrugInteraction"("drug2Id");

-- CreateIndex
CREATE UNIQUE INDEX "DrugInteraction_drug1Id_drug2Id_key" ON "public"."DrugInteraction"("drug1Id", "drug2Id");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_prescriptionNumber_key" ON "public"."Prescription"("prescriptionNumber");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "public"."Prescription"("patientId");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_idx" ON "public"."Prescription"("doctorId");

-- CreateIndex
CREATE INDEX "Prescription_hospitalId_idx" ON "public"."Prescription"("hospitalId");

-- CreateIndex
CREATE INDEX "Prescription_admissionId_idx" ON "public"."Prescription"("admissionId");

-- CreateIndex
CREATE INDEX "Prescription_visitId_idx" ON "public"."Prescription"("visitId");

-- CreateIndex
CREATE INDEX "Prescription_status_idx" ON "public"."Prescription"("status");

-- CreateIndex
CREATE INDEX "Prescription_validUntil_idx" ON "public"."Prescription"("validUntil");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "public"."PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_drugId_idx" ON "public"."PrescriptionItem"("drugId");

-- CreateIndex
CREATE INDEX "PrescriptionItem_status_idx" ON "public"."PrescriptionItem"("status");

-- CreateIndex
CREATE INDEX "PrescriptionHistory_prescriptionId_idx" ON "public"."PrescriptionHistory"("prescriptionId");

-- CreateIndex
CREATE INDEX "PrescriptionHistory_performedAt_idx" ON "public"."PrescriptionHistory"("performedAt");

-- AddForeignKey
ALTER TABLE "public"."DrugInteraction" ADD CONSTRAINT "DrugInteraction_drug1Id_fkey" FOREIGN KEY ("drug1Id") REFERENCES "public"."Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DrugInteraction" ADD CONSTRAINT "DrugInteraction_drug2Id_fkey" FOREIGN KEY ("drug2Id") REFERENCES "public"."Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prescription" ADD CONSTRAINT "Prescription_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "public"."Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prescription" ADD CONSTRAINT "Prescription_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "public"."IPDAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Prescription" ADD CONSTRAINT "Prescription_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "public"."IPDVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_drugId_fkey" FOREIGN KEY ("drugId") REFERENCES "public"."Drug"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PrescriptionHistory" ADD CONSTRAINT "PrescriptionHistory_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "public"."Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
