/*
  # Fix Campaign Leads RLS Policies

  1. Changes
    - Drop and recreate campaign_leads policies with proper checks
    - Add missing indexes for performance
    - Fix policy ordering and checks
    
  2. Security
    - Maintains data isolation between users
    - Allows proper lead management within campaigns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert campaign leads" ON campaign_leads;
DROP POLICY IF EXISTS "Users can view campaign leads" ON campaign_leads;
DROP POLICY IF EXISTS "Users can delete campaign leads" ON campaign_leads;

-- Create new unified policy
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Add composite index for campaign ownership check
CREATE INDEX IF NOT EXISTS idx_campaigns_user_campaign_lookup 
  ON campaigns(user_id, id);

-- Add index for campaign leads lookups
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lookup 
  ON campaign_leads(campaign_id, lead_id);