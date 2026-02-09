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