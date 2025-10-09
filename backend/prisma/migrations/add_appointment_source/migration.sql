-- Add source field to Appointment table
ALTER TABLE "Appointment" ADD COLUMN "source" TEXT;

-- Add index for source field for better query performance
CREATE INDEX "Appointment_source_idx" ON "Appointment"("source");
