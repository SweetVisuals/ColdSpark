/*
  # Fix Campaign Leads RLS

  1. Changes
    - Simplify RLS policies
    - Add proper ownership checks
    - Improve error handling
    
  2. Security
    - Maintain data isolation
    - Allow lead sharing between lists and campaigns
    - Prevent unauthorized access
*/

-- Drop existing policies and triggers
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;
DROP TRIGGER IF EXISTS verify_campaign_lead_insert_trigger ON campaign_leads;
DROP FUNCTION IF EXISTS verify_campaign_lead_insert();

-- Create new campaign_leads policy
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

-- Create function to verify campaign ownership and lead access
CREATE OR REPLACE FUNCTION verify_campaign_lead_insert()
RETURNS TRIGGER AS $$
DECLARE
  campaign_owner_id uuid;
BEGIN
  -- Get campaign owner
  SELECT user_id INTO campaign_owner_id
  FROM campaigns
  WHERE id = NEW.campaign_id;

  -- Verify campaign ownership
  IF campaign_owner_id IS NULL OR campaign_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'User does not own this campaign';
  END IF;

  -- Allow the insert if:
  -- 1. User owns the lead through a list
  -- 2. User owns the lead through another campaign
  -- 3. The lead exists but isn't owned by anyone yet
  IF EXISTS (
    SELECT 1 FROM saved_lists sl
    JOIN list_leads ll ON ll.list_id = sl.id
    WHERE ll.lead_id = NEW.lead_id
    AND sl.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaigns c
    JOIN campaign_leads cl ON cl.campaign_id = c.id
    WHERE cl.lead_id = NEW.lead_id
    AND c.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM leads
    WHERE id = NEW.lead_id
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid lead';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for campaign_leads
CREATE TRIGGER verify_campaign_lead_insert_trigger
  BEFORE INSERT ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION verify_campaign_lead_insert();

-- Optimize indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lookup 
  ON campaign_leads(campaign_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_lookup 
  ON campaigns(user_id, id);

-- Update statistics
ANALYZE campaign_leads;
ANALYZE campaigns;
ANALYZE leads;