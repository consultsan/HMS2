-- Add reminderSent field to Appointment table
-- This field tracks whether a 3-hour reminder has been sent for the appointment

ALTER TABLE "Appointment" ADD COLUMN "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN "Appointment"."reminderSent" IS 'Tracks if 3-hour appointment reminder has been sent via WhatsApp';
