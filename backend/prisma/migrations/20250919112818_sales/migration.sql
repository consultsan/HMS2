-- AlterTable
ALTER TABLE "public"."Patient" ADD COLUMN     "createdBy" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Patient" ADD CONSTRAINT "Patient_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."HospitalStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
