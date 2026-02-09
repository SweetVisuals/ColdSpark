-- Create table to track warmup progress if it doesn't exist
CREATE TABLE IF NOT EXISTS email_warmup_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_received INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (email_account_id, date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_warmup_progress_account_date ON email_warmup_progress(email_account_id, date);

-- Add RLS policies for warmup progress table
ALTER TABLE email_warmup_progress ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'email_warmup_progress' AND policyname = 'Users can access their own warmup progress'
    ) THEN
        CREATE POLICY "Users can access their own warmup progress" 
        ON email_warmup_progress
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 
            FROM email_accounts 
            WHERE email_accounts.id = email_warmup_progress.email_account_id 
            AND email_accounts.user_id = auth.uid()
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'email_warmup_progress' AND policyname = 'Users can insert their own warmup progress'
    ) THEN
        CREATE POLICY "Users can insert their own warmup progress" 
        ON email_warmup_progress
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 
            FROM email_accounts 
            WHERE email_accounts.id = email_warmup_progress.email_account_id 
            AND email_accounts.user_id = auth.uid()
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'email_warmup_progress' AND policyname = 'Users can update their own warmup progress'
    ) THEN
        CREATE POLICY "Users can update their own warmup progress" 
        ON email_warmup_progress
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 
            FROM email_accounts 
            WHERE email_accounts.id = email_warmup_progress.email_account_id 
            AND email_accounts.user_id = auth.uid()
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'email_warmup_progress' AND policyname = 'Users can delete their own warmup progress'
    ) THEN
        CREATE POLICY "Users can delete their own warmup progress" 
        ON email_warmup_progress
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 
            FROM email_accounts 
            WHERE email_accounts.id = email_warmup_progress.email_account_id 
            AND email_accounts.user_id = auth.uid()
          )
        );
    END IF;
END $$;
