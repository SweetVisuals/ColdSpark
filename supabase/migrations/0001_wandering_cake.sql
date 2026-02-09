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