/*
  # Fix Leads and Campaign Leads RLS Policies

  1. Changes
    - Drop and recreate leads policies with proper checks
    - Fix campaign_leads policies to allow proper association
    - Add missing indexes for performance
    
  2. Security
    - Maintains data isolation between users
    - Allows proper lead management within campaigns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own leads" ON leads;
DROP POLICY IF EXISTS "Users can create leads" ON leads;
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create new leads policies
CREATE POLICY "Users can create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_leads cl ON cl.campaign_id = c.id
      WHERE cl.lead_id = leads.id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM saved_lists sl
      JOIN list_leads ll ON ll.list_id = sl.id
      WHERE ll.lead_id = leads.id
      AND sl.user_id = auth.uid()
    )
  );

-- Create new campaign_leads policies
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

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_created_at ON campaign_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_lists_user_id ON saved_lists(user_id);