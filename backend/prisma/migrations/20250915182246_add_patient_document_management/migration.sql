-- CreateEnum
CREATE TYPE "public"."PatientDocumentCategory" AS ENUM ('MEDICAL_REPORTS', 'LAB_REPORTS', 'IMAGING_REPORTS', 'PRESCRIPTION', 'CONSENT_FORMS', 'DISCHARGE_SUMMARY', 'REFERRAL_LETTERS', 'INSURANCE_DOCUMENTS', 'ID_PROOF', 'EMERGENCY_CONTACT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'VERIFIED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."PatientDocumentFolder" (
    "id" TEXT NOT NULL,
    "folderName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "PatientDocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatientDocumentFile" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" "public"."PatientDocumentCategory" NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "tags" TEXT[],
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "patientId" TEXT NOT NULL,
    "folderId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "admissionId" TEXT,
    "previousVersionId" TEXT,

    CONSTRAINT "PatientDocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "documentId" TEXT NOT NULL,
    "accessedById" TEXT NOT NULL,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientDocumentFolder_patientId_idx" ON "public"."PatientDocumentFolder"("patientId");

-- CreateIndex
CREATE INDEX "PatientDocumentFolder_createdById_idx" ON "public"."PatientDocumentFolder"("createdById");

-- CreateIndex
CREATE INDEX "PatientDocumentFile_patientId_idx" ON "public"."PatientDocumentFile"("patientId");

-- CreateIndex
CREATE INDEX "PatientDocumentFile_folderId_idx" ON "public"."PatientDocumentFile"("folderId");

-- CreateIndex
CREATE INDEX "PatientDocumentFile_uploadedById_idx" ON "public"."PatientDocumentFile"("uploadedById");

-- CreateIndex
CREATE INDEX "PatientDocumentFile_admissionId_idx" ON "public"."PatientDocumentFile"("admissionId");

-- CreateIndex
CREATE INDEX "PatientDocumentFile_category_idx" ON "public"."PatientDocumentFile"("category");

-- CreateIndex
CREATE INDEX "PatientDocumentFile_status_idx" ON "public"."PatientDocumentFile"("status");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_documentId_idx" ON "public"."DocumentAccessLog"("documentId");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_accessedById_idx" ON "public"."DocumentAccessLog"("accessedById");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_accessedAt_idx" ON "public"."DocumentAccessLog"("accessedAt");

-- AddForeignKey
ALTER TABLE "public"."PatientDocumentFolder" ADD CONSTRAINT "PatientDocumentFolder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientDocumentFolder" ADD CONSTRAINT "PatientDocumentFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientDocumentFile" ADD CONSTRAINT "PatientDocumentFile_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientDocumentFile" ADD CONSTRAINT "PatientDocumentFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."PatientDocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientDocumentFile" ADD CONSTRAINT "PatientDocumentFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientDocumentFile" ADD CONSTRAINT "PatientDocumentFile_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "public"."IPDAdmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientDocumentFile" ADD CONSTRAINT "PatientDocumentFile_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "public"."PatientDocumentFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."PatientDocumentFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_accessedById_fkey" FOREIGN KEY ("accessedById") REFERENCES "public"."HospitalStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
