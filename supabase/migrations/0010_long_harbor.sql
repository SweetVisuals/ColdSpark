/*
  # Fix campaign leads RLS policy

  1. Changes
    - Drop existing RLS policy for campaign_leads
    - Create new policy that allows inserting leads into campaigns owned by the user
    - Add WITH CHECK clause to validate campaign ownership on insert

  2. Security
    - Ensures users can only add leads to their own campaigns
    - Maintains data isolation between users
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage leads in their campaigns" ON campaign_leads;

-- Create separate policies for different operations
CREATE POLICY "Users can view leads in their campaigns"
  ON campaign_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add leads to their campaigns"
  ON campaign_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove leads from their campaigns"
  ON campaign_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );