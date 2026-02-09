-- Add email_account_id column to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_scheduled_emails_email_account_id ON scheduled_emails(email_account_id);
