/*
  # Fix Campaign Leads RLS Policies

  1. Changes
    - Drop and recreate campaign_leads policies with proper checks
    - Add missing indexes for performance
    
  2. Security
    - Maintains data isolation between users
    - Allows proper lead management within campaigns
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create new campaign_leads policies
CREATE POLICY "Users can insert campaign leads"
  ON campaign_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view campaign leads"
  ON campaign_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campaign leads"
  ON campaign_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_lead ON campaign_leads(campaign_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_campaign ON campaigns(user_id, id);