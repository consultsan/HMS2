-- CreateEnum
CREATE TYPE "public"."InsuranceVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "public"."InsuranceDocumentType" AS ENUM ('POLICY_CARD', 'ID_CARD', 'AUTHORIZATION_LETTER', 'MEDICAL_REPORTS', 'PRESCRIPTION', 'OTHER');

-- AlterTable
ALTER TABLE "public"."_DiseaseTemplateToLabTest" ADD CONSTRAINT "_DiseaseTemplateToLabTest_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_DiseaseTemplateToLabTest_AB_unique";

-- CreateTable
CREATE TABLE "public"."InsuranceDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "documentType" "public"."InsuranceDocumentType" NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admissionId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "InsuranceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InsuranceVerification" (
    "id" TEXT NOT NULL,
    "verificationStatus" "public"."InsuranceVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationDate" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationNotes" TEXT,
    "policyValidFrom" TIMESTAMP(3),
    "policyValidTo" TIMESTAMP(3),
    "coverageAmount" DOUBLE PRECISION,
    "deductibleAmount" DOUBLE PRECISION,
    "coPaymentPercentage" DOUBLE PRECISION,
    "preAuthorizationRequired" BOOLEAN NOT NULL DEFAULT false,
    "preAuthorizationNumber" TEXT,
    "preAuthorizationDate" TIMESTAMP(3),
    "preAuthorizationExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "admissionId" TEXT NOT NULL,
    "verifiedByStaffId" TEXT,

    CONSTRAINT "InsuranceVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsuranceDocument_admissionId_idx" ON "public"."InsuranceDocument"("admissionId");

-- CreateIndex
CREATE INDEX "InsuranceDocument_uploadedById_idx" ON "public"."InsuranceDocument"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceVerification_admissionId_key" ON "public"."InsuranceVerification"("admissionId");

-- CreateIndex
CREATE INDEX "InsuranceVerification_admissionId_idx" ON "public"."InsuranceVerification"("admissionId");

-- CreateIndex
CREATE INDEX "InsuranceVerification_verificationStatus_idx" ON "public"."InsuranceVerification"("verificationStatus");

-- AddForeignKey
ALTER TABLE "public"."InsuranceDocument" ADD CONSTRAINT "InsuranceDocument_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "public"."IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InsuranceDocument" ADD CONSTRAINT "InsuranceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InsuranceVerification" ADD CONSTRAINT "InsuranceVerification_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "public"."IPDAdmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InsuranceVerification" ADD CONSTRAINT "InsuranceVerification_verifiedByStaffId_fkey" FOREIGN KEY ("verifiedByStaffId") REFERENCES "public"."HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
