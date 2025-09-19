-- Migration: Add createdBy field to Patient table
-- This migration adds the createdBy field to track who created each patient

-- Add createdBy column to Patient table
ALTER TABLE "Patient" ADD COLUMN "createdBy" TEXT;

-- Add foreign key constraint to HospitalStaff table
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX "Patient_createdBy_idx" ON "Patient"("createdBy");

-- Add composite index for sales person queries
CREATE INDEX "Patient_createdBy_hospitalId_idx" ON "Patient"("createdBy", "hospitalId");


