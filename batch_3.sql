/*
  # Fix Campaign Leads RLS and Triggers

  1. Changes
    - Simplify RLS policy to focus on campaign ownership
    - Improve trigger function to handle all lead access cases
    - Add proper indexes for performance
    
  2. Security
    - Maintain data isolation between users
    - Allow lead sharing between campaigns
    - Prevent unauthorized access
*/

-- Drop existing policies and triggers
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;
DROP TRIGGER IF EXISTS verify_campaign_lead_insert_trigger ON campaign_leads;
DROP FUNCTION IF EXISTS verify_campaign_lead_insert();

-- Create simplified campaign_leads policy
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Create improved trigger function for campaign_leads
CREATE OR REPLACE FUNCTION verify_campaign_lead_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- First verify campaign ownership
  IF NOT EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = NEW.campaign_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User does not own this campaign';
  END IF;

  -- Then verify lead access:
  -- 1. Lead exists in any of user's lists
  -- 2. Lead exists in any of user's campaigns
  -- 3. Lead exists but isn't associated with any user yet
  IF EXISTS (
    SELECT 1 FROM saved_lists sl
    JOIN list_leads ll ON ll.list_id = sl.id
    WHERE ll.lead_id = NEW.lead_id
    AND sl.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaigns c
    JOIN campaign_leads cl ON cl.campaign_id = c.id
    WHERE cl.lead_id = NEW.lead_id
    AND c.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = NEW.lead_id
    AND NOT EXISTS (
      SELECT 1 FROM campaign_leads cl2
      JOIN campaigns c2 ON c2.id = cl2.campaign_id
      WHERE cl2.lead_id = l.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM list_leads ll2
      JOIN saved_lists sl2 ON sl2.id = ll2.list_id
      WHERE ll2.lead_id = l.id
    )
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid lead access';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for campaign_leads
CREATE TRIGGER verify_campaign_lead_insert_trigger
  BEFORE INSERT ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION verify_campaign_lead_insert();

-- Optimize indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lookup 
  ON campaign_leads(campaign_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_lookup 
  ON campaigns(user_id, id);

CREATE INDEX IF NOT EXISTS idx_list_leads_lead_lookup
  ON list_leads(lead_id);

CREATE INDEX IF NOT EXISTS idx_saved_lists_user_lookup
  ON saved_lists(user_id);

-- Update statistics
ANALYZE campaign_leads;
ANALYZE campaigns;
ANALYZE leads;
ANALYZE list_leads;
ANALYZE saved_lists;
/*
  # Add Templates Table

  1. New Tables
    - `templates`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references campaigns)
      - `name` (text)
      - `subject` (text)
      - `content` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on templates table
    - Add policy for authenticated users to manage their templates
*/

-- Create templates table
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policy for managing templates
CREATE POLICY "Users can manage their campaign templates"
  ON templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = templates.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_templates_campaign_id ON templates(campaign_id);
CREATE INDEX idx_templates_created_at ON templates(created_at);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();
/*
  # Fix scheduled_emails table foreign key

  1. Changes
    - Drop existing foreign key constraint
    - Add new foreign key constraint referencing the correct templates table
    - Add indexes for better performance
*/

-- Drop existing foreign key constraint
ALTER TABLE scheduled_emails
  DROP CONSTRAINT IF EXISTS scheduled_emails_template_id_fkey;

-- Add new foreign key constraint
ALTER TABLE scheduled_emails
  ADD CONSTRAINT scheduled_emails_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES templates(id)
  ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_template_id 
  ON scheduled_emails(template_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for 
  ON scheduled_emails(scheduled_for);

-- Update statistics
ANALYZE scheduled_emails;
ANALYZE templates;
-- Combined migration for email accounts and leads fixes

-- Add smtp_port column to email_accounts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'email_accounts' 
    AND column_name = 'smtp_port'
  ) THEN
    ALTER TABLE email_accounts
    ADD COLUMN smtp_port text NOT NULL DEFAULT '587';
  END IF;
END $$;

-- Optimize indexes for leads system
CREATE INDEX IF NOT EXISTS idx_leads_lookup 
  ON leads(id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_lookup 
  ON campaign_leads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_combined_lookup 
  ON campaign_leads(campaign_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_list_leads_lookup 
  ON list_leads(lead_id, list_id);
-- Create campaign_email_accounts table with foreign key relationship

CREATE TABLE IF NOT EXISTS campaign_email_accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    email_account_id uuid NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_campaign_email_accounts_campaign 
    ON campaign_email_accounts(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_email_accounts_email_account 
    ON campaign_email_accounts(email_account_id);

-- Add unique constraint to prevent duplicate relationships
ALTER TABLE campaign_email_accounts 
    ADD CONSTRAINT unique_campaign_email_account 
    UNIQUE (campaign_id, email_account_id);
-- Ensure proper RLS policies for leads table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage leads for their campaigns" ON leads;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view leads for their campaigns"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert leads for their campaigns"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update leads for their campaigns"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete leads for their campaigns"
  ON leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );
-- Create table to track email sending progress
CREATE TABLE campaign_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_campaign_progress_campaign_id ON campaign_progress(campaign_id);
CREATE INDEX idx_campaign_progress_email_account_id ON campaign_progress(email_account_id);
CREATE INDEX idx_campaign_progress_lead_id ON campaign_progress(lead_id);

-- Enable RLS
ALTER TABLE campaign_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own campaign progress" 
ON campaign_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_progress.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own campaign progress" 
ON campaign_progress
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_progress.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own campaign progress" 
ON campaign_progress
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_progress.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own campaign progress" 
ON campaign_progress
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = campaign_progress.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);
-- Add email_account_id column to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_scheduled_emails_email_account_id ON scheduled_emails(email_account_id);
-- Add progress tracking columns to scheduled_emails table
ALTER TABLE scheduled_emails
ADD COLUMN total_emails integer NOT NULL DEFAULT 0,
ADD COLUMN sent_emails integer NOT NULL DEFAULT 0;
-- Add unique constraint to prevent duplicate schedules
ALTER TABLE scheduled_emails
ADD CONSTRAINT unique_email_account_template
UNIQUE (email_account_id, template_id);
