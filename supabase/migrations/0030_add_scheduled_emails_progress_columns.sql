-- Add progress tracking columns to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN total_emails integer NOT NULL DEFAULT 0,
ADD COLUMN sent_emails integer NOT NULL DEFAULT 0;
