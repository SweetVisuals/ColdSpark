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