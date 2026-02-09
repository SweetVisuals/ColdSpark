/*
  # Final Fix for Campaign Leads Structure

  1. Changes
    - Simplify RLS policy
    - Add proper indexes
    - Ensure proper constraints
    
  2. Security
    - Maintain data isolation between users
    - Ensure proper campaign ownership checks
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create simplified policy
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

-- Ensure proper indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_lookup 
  ON campaign_leads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_combined_lookup 
  ON campaign_leads(campaign_id, lead_id);

-- Update table statistics
ANALYZE campaign_leads;