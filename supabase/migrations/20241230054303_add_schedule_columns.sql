-- Add new columns to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN start_date timestamp with time zone,
ADD COLUMN end_date timestamp with time zone,
ADD COLUMN interval_minutes integer;
