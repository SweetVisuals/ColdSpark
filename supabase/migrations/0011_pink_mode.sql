/*
  # Fix Campaign Leads RLS Policies

  1. Changes
    - Drop and recreate RLS policies for leads table
    - Add more permissive policy for lead creation
    - Fix campaign_leads policies
    
  2. Security
    - Maintains security while allowing proper lead management
    - Ensures users can only access their own data
*/

-- Drop existing leads policies
DROP POLICY IF EXISTS "Users can manage leads" ON leads;

-- Create new leads policies
CREATE POLICY "Users can manage their own leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    -- Allow access if the lead is in user's lists
    EXISTS (
      SELECT 1 FROM saved_lists sl
      JOIN list_leads ll ON ll.list_id = sl.id
      WHERE ll.lead_id = leads.id
      AND sl.user_id = auth.uid()
    )
    OR
    -- Allow access if the lead is in user's campaigns
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_leads cl ON cl.campaign_id = c.id
      WHERE cl.lead_id = leads.id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drop existing campaign_leads policies
DROP POLICY IF EXISTS "Users can view leads in their campaigns" ON campaign_leads;
DROP POLICY IF EXISTS "Users can add leads to their campaigns" ON campaign_leads;
DROP POLICY IF EXISTS "Users can remove leads from their campaigns" ON campaign_leads;

-- Create new campaign_leads policy
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );