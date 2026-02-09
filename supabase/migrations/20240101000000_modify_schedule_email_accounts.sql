-- Create new table for schedule email accounts
CREATE TABLE schedule_email_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES scheduled_emails(id) ON DELETE CASCADE,
  email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  emails_sent INTEGER DEFAULT 0,
  emails_remaining INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, email_account_id)
);

-- Drop existing email_account_id column from scheduled_emails
ALTER TABLE scheduled_emails DROP COLUMN email_account_id;

-- Drop old index if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_scheduled_emails_email_account_id'
    AND n.nspname = 'public'
  ) THEN
    EXECUTE 'DROP INDEX idx_scheduled_emails_email_account_id';
  END IF;
END $$;

-- Create new index for better query performance
CREATE INDEX idx_schedule_email_accounts_schedule_id ON schedule_email_accounts(schedule_id);
CREATE INDEX idx_schedule_email_accounts_email_account_id ON schedule_email_accounts(email_account_id);
