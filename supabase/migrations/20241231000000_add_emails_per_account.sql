-- Add emails_per_account column to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN emails_per_account integer NOT NULL DEFAULT 0;
