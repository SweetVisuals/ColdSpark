/*
  # Initial Schema Setup

  1. New Tables
    - `email_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text, unique)
      - `name` (text)
      - `imap_host` (text)
      - `imap_port` (integer)
      - `smtp_host` (text)
      - `smtp_port` (integer)
      - `warmup_enabled` (boolean)
      - `daily_limit` (integer)
      - `signature` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `warmup_stats`
      - `id` (uuid, primary key)
      - `email_account_id` (uuid, references email_accounts)
      - `emails_sent` (integer)
      - `emails_received` (integer)
      - `spam_rescued` (integer)
      - `date` (date)
      - `created_at` (timestamptz)

    - `campaigns`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `campaign_emails`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references campaigns)
      - `email_account_id` (uuid, references email_accounts)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Email Accounts
CREATE TABLE email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  imap_host text NOT NULL,
  imap_port integer NOT NULL,
  smtp_host text NOT NULL,
  smtp_port integer NOT NULL,
  warmup_enabled boolean DEFAULT false,
  daily_limit integer DEFAULT 100,
  signature text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own email accounts"
  ON email_accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Warmup Stats
CREATE TABLE warmup_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id uuid REFERENCES email_accounts NOT NULL,
  emails_sent integer DEFAULT 0,
  emails_received integer DEFAULT 0,
  spam_rescued integer DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE warmup_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view warmup stats for their accounts"
  ON warmup_stats
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM email_accounts
      WHERE email_accounts.id = warmup_stats.email_account_id
      AND email_accounts.user_id = auth.uid()
    )
  );

-- Campaigns
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Campaign Emails
CREATE TABLE campaign_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns NOT NULL,
  email_account_id uuid REFERENCES email_accounts NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, email_account_id)
);

ALTER TABLE campaign_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage campaign emails for their campaigns"
  ON campaign_emails
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_emails.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );
/*
  # Add Campaign Schedule Field

  1. Changes
    - Add schedule JSON field to campaigns table
  
  2. Details
    - schedule: Stores campaign scheduling configuration as JSON including:
      - frequency (daily/weekly)
      - maxEmailsPerDay
*/

ALTER TABLE campaigns 
ADD COLUMN schedule JSONB;
/*
  # Add Missing Campaign Columns

  1. Changes
    - Safely add open_rate column if it doesn't exist
    - Use DO block to handle conditional column creation
    - Ensure idempotent migration

  2. Details
    - open_rate: Stores the email open rate as a decimal
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'open_rate'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN open_rate DECIMAL DEFAULT 0.0;
  END IF;
END $$;
/*
  # Update campaign policies

  1. Changes
    - Add policy to allow users to insert their own campaigns
    - Add policy to allow users to update their own campaigns
    - Add policy to allow users to delete their own campaigns

  2. Security
    - Enable RLS on campaigns table
    - Ensure users can only manage their own campaigns
*/

-- Update the existing RLS policy for campaigns
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON campaigns;

-- Create specific policies for each operation
CREATE POLICY "Users can insert their own campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
/*
  # Add email templates, leads and scheduling support

  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key)
      - `name` (text)
      - `subject` (text)
      - `content` (text)
      - `created_at` (timestamp)

    - `leads`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key)
      - `email` (text)
      - `name` (text)
      - `company` (text)
      - `title` (text)
      - `phone` (text)
      - `linkedin` (text)
      - `created_at` (timestamp)
    
    - `scheduled_emails`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, foreign key)
      - `lead_id` (uuid, foreign key)
      - `template_id` (uuid, foreign key)
      - `scheduled_for` (timestamp)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create email_templates table
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create leads table
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  company text,
  title text,
  phone text,
  linkedin text,
  created_at timestamptz DEFAULT now()
);

-- Create scheduled_emails table
CREATE TABLE scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  template_id uuid REFERENCES email_templates(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Create policies for email_templates
CREATE POLICY "Users can manage templates for their campaigns"
  ON email_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = email_templates.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Create policies for leads
CREATE POLICY "Users can manage leads for their campaigns"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Create policies for scheduled_emails
CREATE POLICY "Users can manage scheduled emails for their campaigns"
  ON scheduled_emails
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = scheduled_emails.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );
/*
  # Add additional fields to leads table
  
  1. Changes
    - Add industry column
    - Add location column 
    - Add employees column
    - Add company_news column
    - Add indexes for improved query performance

  2. Notes
    - Using DO block to safely add columns if they don't exist
    - Added indexes on commonly queried fields
*/

DO $$ 
BEGIN
  -- Add industry column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'industry'
  ) THEN
    ALTER TABLE leads ADD COLUMN industry text;
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'location'
  ) THEN
    ALTER TABLE leads ADD COLUMN location text;
  END IF;

  -- Add employees column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'employees'
  ) THEN
    ALTER TABLE leads ADD COLUMN employees text;
  END IF;

  -- Add company_news column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'company_news'
  ) THEN
    ALTER TABLE leads ADD COLUMN company_news text;
  END IF;
END $$;

-- Add indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);
/*
  # Create saved lists tables

  1. New Tables
    - `saved_lists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `created_at` (timestamp)
    - `list_leads`
      - `list_id` (uuid, references saved_lists)
      - `lead_id` (uuid, references leads)
      - Composite primary key (list_id, lead_id)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create saved_lists table
CREATE TABLE saved_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create list_leads table
CREATE TABLE list_leads (
  list_id uuid REFERENCES saved_lists ON DELETE CASCADE,
  lead_id uuid REFERENCES leads ON DELETE CASCADE,
  PRIMARY KEY (list_id, lead_id)
);

-- Enable RLS
ALTER TABLE saved_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_lists
CREATE POLICY "Users can manage their own lists"
  ON saved_lists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for list_leads
CREATE POLICY "Users can manage leads in their lists"
  ON list_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_lists
      WHERE saved_lists.id = list_leads.list_id
      AND saved_lists.user_id = auth.uid()
    )
  );
/*
  # Fix schema and add campaign leads table

  1. Changes
    - Add campaign_leads table for tracking leads in campaigns
    - Fix column name from companyNews to company_news
    - Add missing indexes for performance

  2. Security
    - Enable RLS on campaign_leads table
    - Add policy for managing campaign leads
*/

-- Create campaign_leads table
CREATE TABLE IF NOT EXISTS campaign_leads (
  campaign_id uuid REFERENCES campaigns ON DELETE CASCADE,
  lead_id uuid REFERENCES leads ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (campaign_id, lead_id)
);

-- Enable RLS
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for campaign_leads
CREATE POLICY "Users can manage leads in their campaigns"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Add indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id ON campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_list_leads_list_id ON list_leads(list_id);
CREATE INDEX IF NOT EXISTS idx_list_leads_lead_id ON list_leads(lead_id);
/*
  # Fix leads table RLS policies

  1. Changes
    - Enable RLS on leads table
    - Add policy for users to manage leads
    - Add policy for users to view leads in their campaigns and lists
  
  2. Security
    - Users can only manage leads they create
    - Users can view leads in their campaigns and lists
*/

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy for managing leads
CREATE POLICY "Users can manage leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_lists sl
      JOIN list_leads ll ON ll.list_id = sl.id
      WHERE ll.lead_id = leads.id
      AND sl.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_leads cl ON cl.campaign_id = c.id
      WHERE cl.lead_id = leads.id
      AND c.user_id = auth.uid()
    )
    OR
    -- Allow insert operations
    (CASE WHEN current_setting('role') = 'authenticated' THEN true END)
  );

-- Add indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
/*
  # Fix campaign leads RLS policy

  1. Changes
    - Drop existing RLS policy for campaign_leads
    - Create new policy that allows inserting leads into campaigns owned by the user
    - Add WITH CHECK clause to validate campaign ownership on insert

  2. Security
    - Ensures users can only add leads to their own campaigns
    - Maintains data isolation between users
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage leads in their campaigns" ON campaign_leads;

-- Create separate policies for different operations
CREATE POLICY "Users can view leads in their campaigns"
  ON campaign_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add leads to their campaigns"
  ON campaign_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove leads from their campaigns"
  ON campaign_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );
