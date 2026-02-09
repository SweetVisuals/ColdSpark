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
-- Check if email_account_id column exists before attempting migration
DO $$
DECLARE
  schedule_record RECORD;
  column_exists BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'scheduled_emails' 
    AND column_name = 'email_account_id'
  ) INTO column_exists;

  IF column_exists THEN
    -- Migrate existing email_account_id values to schedule_email_accounts
    FOR schedule_record IN
      SELECT id, email_account_id 
      FROM scheduled_emails 
      WHERE email_account_id IS NOT NULL
    LOOP
      -- Insert into new schedule_email_accounts table
      INSERT INTO schedule_email_accounts (
        schedule_id, 
        email_account_id,
        emails_sent,
        emails_remaining
      )
      VALUES (
        schedule_record.id,
        schedule_record.email_account_id,
        0, -- emails_sent
        (SELECT emails_per_account FROM scheduled_emails WHERE id = schedule_record.id)
      );
    END LOOP;

    -- Verify migration
    IF EXISTS (
      SELECT 1 
      FROM scheduled_emails 
      WHERE email_account_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Migration failed - some scheduled emails still have email_account_id';
    END IF;
  ELSE
    RAISE NOTICE 'email_account_id column already migrated - no action needed';
  END IF;
END $$;
-- Remove duplicates, keeping the latest entry for each (campaign_id, lead_id) pair
DELETE FROM campaign_progress
WHERE id NOT IN (
  SELECT DISTINCT ON (campaign_id, lead_id) id
  FROM campaign_progress
  ORDER BY campaign_id, lead_id, updated_at DESC
);

-- Add unique constraint
-- Remove duplicates, keeping the latest entry for each (campaign_id, lead_id) pair
DELETE FROM campaign_progress
WHERE id NOT IN (
  SELECT DISTINCT ON (campaign_id, lead_id) id
  FROM campaign_progress
  ORDER BY campaign_id, lead_id, updated_at DESC
);

-- Add unique constraint
ALTER TABLE campaign_progress
ADD CONSTRAINT campaign_progress_campaign_id_lead_id_key UNIQUE (campaign_id, lead_id);
-- Enable RLS on campaigns table
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own campaigns
CREATE POLICY "Users can only access their own campaigns"
ON campaigns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable RLS on campaign_email_accounts table
ALTER TABLE campaign_email_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access campaign_email_accounts for their campaigns
CREATE POLICY "Users can only access campaign_email_accounts for their campaigns"
ON campaign_email_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_email_accounts.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

-- Add foreign key constraint to ensure data integrity
ALTER TABLE campaign_email_accounts
ADD CONSTRAINT fk_campaign_email_accounts_campaigns
FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
ON DELETE CASCADE;

ALTER TABLE campaign_email_accounts
ADD CONSTRAINT fk_campaign_email_accounts_email_accounts
FOREIGN KEY (email_account_id) REFERENCES email_accounts(id)
ON DELETE CASCADE;
-- Enable RLS on all user-specific tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Add user_id to tables if missing
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add RLS policies
-- Campaigns
DROP POLICY IF EXISTS "Users can only access their own campaigns" ON campaigns;
CREATE POLICY "Users can only access their own campaigns"
ON campaigns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Email Accounts
DROP POLICY IF EXISTS "Users can only access their own email accounts" ON email_accounts;
CREATE POLICY "Users can only access their own email accounts"
ON email_accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Campaign Email Accounts
DROP POLICY IF EXISTS "Users can only access campaign_email_accounts for their campaigns" ON campaign_email_accounts;
CREATE POLICY "Users can only access campaign_email_accounts for their campaigns"
ON campaign_email_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_email_accounts.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

-- Leads
DROP POLICY IF EXISTS "Users can only access their own leads" ON leads;
CREATE POLICY "Users can only access their own leads"
ON leads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Scheduled Emails
DROP POLICY IF EXISTS "Users can only access their own scheduled emails" ON scheduled_emails;
CREATE POLICY "Users can only access their own scheduled emails"
ON scheduled_emails
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE campaign_email_accounts
ADD CONSTRAINT fk_campaign_email_accounts_campaigns
FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
ON DELETE CASCADE;

ALTER TABLE campaign_email_accounts
ADD CONSTRAINT fk_campaign_email_accounts_email_accounts
FOREIGN KEY (email_account_id) REFERENCES email_accounts(id)
ON DELETE CASCADE;

ALTER TABLE leads
ADD CONSTRAINT fk_leads_campaigns
FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
ON DELETE CASCADE;

ALTER TABLE scheduled_emails
ADD CONSTRAINT fk_scheduled_emails_campaigns
FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
ON DELETE CASCADE;

-- Migrate existing data to associate with users
UPDATE leads SET user_id = campaigns.user_id
FROM campaigns
WHERE leads.campaign_id = campaigns.id;

UPDATE scheduled_emails SET user_id = campaigns.user_id
FROM campaigns
WHERE scheduled_emails.campaign_id = campaigns.id;
-- Verify RLS on all user-specific tables
DO $$
DECLARE
  tbl_name text;
BEGIN
  FOR tbl_name IN 
    SELECT t.table_name 
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
    AND t.table_name IN ('campaigns', 'email_accounts', 'campaign_email_accounts', 'leads', 'scheduled_emails')
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = tbl_name
      AND n.nspname = 'public'
      AND c.relrowsecurity = true
    ) THEN
      RAISE EXCEPTION 'RLS not enabled on table %', tbl_name;
    END IF;
  END LOOP;
END $$;

-- Verify user_id columns
DO $$
DECLARE
  current_table text;
BEGIN
  FOR current_table IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('campaigns', 'email_accounts', 'leads', 'scheduled_emails')
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns cols
      WHERE cols.table_name = current_table
      AND cols.column_name = 'user_id'
    ) THEN
      RAISE EXCEPTION 'user_id column not found in table %', current_table;
    END IF;
  END LOOP;
END $$;
-- Create auth.uid() function
CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS uuid 
LANGUAGE sql 
STABLE
AS $$
  SELECT 
    nullif(
      current_setting('request.jwt.claim.sub', true),
      ''
    )::uuid
$$;
-- Add email account deletion to user deletion function
create or replace function delete_user()
returns void
security definer
as $$
declare
  user_id uuid;
begin
  -- Get the current authenticated user's ID
  user_id := auth.uid();

  -- Delete associated email accounts
  delete from public.email_accounts where user_id = user_id;
  
  -- Delete user from auth schema
  delete from auth.users where id = user_id;

  -- Delete associated data from public schema
  delete from public.profiles where id = user_id;
end;
$$ language plpgsql;

-- Verify RLS policy for email_accounts deletion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'email_accounts'
    AND policyname = 'Allow users to delete their own email accounts'
  ) THEN
    CREATE POLICY "Allow users to delete their own email accounts"
    ON public.email_accounts
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;
-- Add RLS policy for creating email accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'email_accounts'
    AND policyname = 'Allow users to create their own email accounts'
  ) THEN
    CREATE POLICY "Allow users to create their own email accounts"
    ON public.email_accounts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
-- Verify and fix RLS policies for email_accounts table
DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'email_accounts'
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
  END IF;

  -- Drop existing insert policy if it exists
  DROP POLICY IF EXISTS "Allow users to create their own email accounts" ON public.email_accounts;
  
  -- Create insert policy
  CREATE POLICY "Allow users to create their own email accounts"
  ON public.email_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

  -- Drop existing delete policy if it exists
  DROP POLICY IF EXISTS "Allow users to delete their own email accounts" ON public.email_accounts;
  
  -- Create delete policy
  CREATE POLICY "Allow users to delete their own email accounts"
  ON public.email_accounts
  FOR DELETE
  USING (auth.uid() = user_id);
END $$;
