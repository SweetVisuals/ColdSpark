/*
  # Final Fix for Campaign Leads RLS

  1. Changes
    - Simplify RLS policies with a single unified policy
    - Add proper WITH CHECK clause for inserts
    - Ensure proper campaign ownership verification
    
  2. Security
    - Maintains data isolation between users
    - Allows proper lead management within campaigns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create new simplified policy
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

-- Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- Analyze tables to update statistics
ANALYZE campaign_leads;
ANALYZE campaigns;