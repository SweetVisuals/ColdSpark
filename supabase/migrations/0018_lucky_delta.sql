/*
  # Comprehensive Fix for Campaign Leads System

  1. Changes
    - Complete overhaul of RLS policies
    - Proper cascading permissions
    - Optimized indexes
    - Proper constraints
    
  2. Security
    - Ensure proper data isolation between users
    - Maintain referential integrity
    - Allow proper lead sharing between lists and campaigns
*/

-- First, ensure we have the right constraints
ALTER TABLE campaign_leads
  DROP CONSTRAINT IF EXISTS campaign_leads_campaign_id_fkey,
  DROP CONSTRAINT IF EXISTS campaign_leads_lead_id_fkey;

ALTER TABLE campaign_leads
  ADD CONSTRAINT campaign_leads_campaign_id_fkey 
    FOREIGN KEY (campaign_id) 
    REFERENCES campaigns(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT campaign_leads_lead_id_fkey 
    FOREIGN KEY (lead_id) 
    REFERENCES leads(id) 
    ON DELETE CASCADE;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;
DROP POLICY IF EXISTS "Users can create leads" ON leads;
DROP POLICY IF EXISTS "Users can read their leads" ON leads;

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

-- Create new campaign_leads policy with proper checks
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

-- Optimize indexes for common query patterns
DROP INDEX IF EXISTS idx_campaign_leads_campaign_id;
DROP INDEX IF EXISTS idx_campaign_leads_lead_id;
DROP INDEX IF EXISTS idx_campaign_leads_lookup;
DROP INDEX IF EXISTS idx_campaigns_user_id;
DROP INDEX IF EXISTS idx_leads_lookup;

CREATE INDEX idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_lead_id ON campaign_leads(lead_id);
CREATE INDEX idx_campaign_leads_lookup ON campaign_leads(campaign_id, lead_id);
CREATE INDEX idx_campaigns_user_lookup ON campaigns(user_id, id);
CREATE INDEX idx_leads_lookup ON leads(id) INCLUDE (email);

-- Update table statistics
ANALYZE leads;
ANALYZE campaigns;
ANALYZE campaign_leads;