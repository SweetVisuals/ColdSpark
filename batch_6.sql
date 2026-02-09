-- Add user_id column to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON leads(user_id);

-- Update existing leads to set user_id based on campaign ownership
DO $$
DECLARE
    lead_record RECORD;
BEGIN
    FOR lead_record IN SELECT l.id, c.user_id
        FROM leads l
        JOIN campaign_leads cl ON l.id = cl.lead_id
        JOIN campaigns c ON cl.campaign_id = c.id
    LOOP
        UPDATE leads
        SET user_id = lead_record.user_id
        WHERE id = lead_record.id;
    END LOOP;
END $$;
-- Disable RLS on campaigns table
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

-- Disable RLS on email_accounts table
ALTER TABLE email_accounts DISABLE ROW LEVEL SECURITY;
-- Add warmup settings columns to email_accounts table
ALTER TABLE email_accounts
ADD COLUMN warmup_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN warmup_filter_tag TEXT,
ADD COLUMN warmup_increase_per_day INTEGER DEFAULT 5,
ADD COLUMN warmup_daily_limit INTEGER DEFAULT 20,
ADD COLUMN warmup_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN warmup_status TEXT DEFAULT 'disabled' CHECK (warmup_status IN ('disabled', 'enabled', 'paused'));

-- Create table to track warmup progress
CREATE TABLE email_warmup_progress (
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
CREATE INDEX idx_email_warmup_progress_account_date ON email_warmup_progress(email_account_id, date);

-- Add RLS policies for warmup progress table
ALTER TABLE email_warmup_progress ENABLE ROW LEVEL SECURITY;

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
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted password column to email_accounts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'email_accounts' 
    AND column_name = 'encrypted_password'
  ) THEN
    ALTER TABLE email_accounts
    ADD COLUMN encrypted_password TEXT;
  END IF;
END $$;

-- Create function to encrypt password
CREATE OR REPLACE FUNCTION encrypt_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

-- Create function to verify password
CREATE OR REPLACE FUNCTION verify_password(password TEXT, encrypted_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN encrypted_password = crypt(password, encrypted_password);
END;
$$ LANGUAGE plpgsql;
-- Create function to handle campaign leads associations
CREATE OR REPLACE FUNCTION create_campaign_leads(campaign_id uuid, lead_ids uuid[])
RETURNS void AS $$
DECLARE
  lead_id uuid;
BEGIN
  -- Create campaign associations for each lead
  FOREACH lead_id IN ARRAY lead_ids LOOP
    -- Check if association already exists
    PERFORM 1 FROM campaign_leads
    WHERE campaign_id = create_campaign_leads.campaign_id
      AND lead_id = create_campaign_leads.lead_id;
    
    -- Insert only if association doesn't exist
    IF NOT FOUND THEN
      INSERT INTO campaign_leads (campaign_id, lead_id)
      VALUES (create_campaign_leads.campaign_id, lead_id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create RPC endpoint
CREATE OR REPLACE FUNCTION public.create_campaign_leads(campaign_id uuid, lead_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  SELECT create_campaign_leads(campaign_id, lead_ids);
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_campaign_leads(uuid, uuid[]) TO authenticated;
-- Create campaign_leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (campaign_id, lead_id)
);

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.create_campaign_leads(campaign_id uuid, lead_ids uuid[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  lead_id uuid;
BEGIN
  FOREACH lead_id IN ARRAY lead_ids LOOP
    INSERT INTO public.campaign_leads (campaign_id, lead_id)
    VALUES (create_campaign_leads.campaign_id, lead_id)
    ON CONFLICT (campaign_id, lead_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_campaign_leads(uuid, uuid[]) TO authenticated;
GRANT SELECT, INSERT ON TABLE public.campaign_leads TO authenticated;
-- Enable RLS on campaign_leads table
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to insert campaign_leads
CREATE POLICY "Authenticated users can insert campaign_leads"
ON campaign_leads
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_leads.campaign_id
    AND campaigns.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_leads.lead_id
    AND leads.user_id = auth.uid()
  )
);

-- Create policy for authenticated users to select their campaign_leads
CREATE POLICY "Authenticated users can select their campaign_leads"
ON campaign_leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_leads.campaign_id
    AND campaigns.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_leads.lead_id
    AND leads.user_id = auth.uid()
  )
);

-- Create policy for authenticated users to delete their campaign_leads
CREATE POLICY "Authenticated users can delete their campaign_leads"
ON campaign_leads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_leads.campaign_id
    AND campaigns.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_leads.lead_id
    AND leads.user_id = auth.uid()
  )
);
-- Drop dependent objects if they exist
DROP TRIGGER IF EXISTS campaign_leads_updated_at_trigger ON campaign_leads;
DROP FUNCTION IF EXISTS update_campaign_leads_updated_at();
DROP INDEX IF EXISTS idx_campaign_leads_campaign_id;
DROP INDEX IF EXISTS idx_campaign_leads_lead_id;

-- Drop existing table if it exists
DROP TABLE IF EXISTS campaign_leads CASCADE;

-- Create campaign_leads table
CREATE TABLE campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique combination of campaign and lead
  CONSTRAINT campaign_lead_unique UNIQUE (campaign_id, lead_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_campaign_leads_campaign_id ON campaign_leads (campaign_id);
CREATE INDEX idx_campaign_leads_lead_id ON campaign_leads (lead_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_leads_updated_at_trigger
BEFORE UPDATE ON campaign_leads
FOR EACH ROW
EXECUTE FUNCTION update_campaign_leads_updated_at();
-- Drop existing function if it exists
drop function if exists public.delete_user(uuid);

-- Create consolidated user deletion function
create function public.delete_user(p_user_id uuid)
returns json as $$
declare
  deleted_count integer;
begin
  -- Verify user exists
  if not exists (select 1 from auth.users where id = p_user_id) then
    return json_build_object('error', 'User not found');
  end if;

  -- Delete user data from all related tables
  delete from public.user_profiles where user_id = p_user_id;
  delete from public.email_accounts where user_id = p_user_id;
  delete from public.campaigns where user_id = p_user_id;
  delete from public.leads where user_id = p_user_id;

  -- Delete the auth user
  delete from auth.users where id = p_user_id;

  -- Return success
  return json_build_object('success', true);
exception
  when others then
    return json_build_object('error', sqlerrm);
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function public.delete_user(uuid) to authenticated;

-- Add function to supabase_functions schema
comment on function public.delete_user is 'Deletes a user and all related data';
-- Add new columns to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN start_date timestamp with time zone,
ADD COLUMN end_date timestamp with time zone,
ADD COLUMN interval_minutes integer;
