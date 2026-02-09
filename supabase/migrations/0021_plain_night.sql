/*
  # Fix Campaign Leads RLS and Triggers

  1. Changes
    - Simplify RLS policy to focus on campaign ownership
    - Improve trigger function to handle all lead access cases
    - Add proper indexes for performance
    
  2. Security
    - Maintain data isolation between users
    - Allow lead sharing between campaigns
    - Prevent unauthorized access
*/

-- Drop existing policies and triggers
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;
DROP TRIGGER IF EXISTS verify_campaign_lead_insert_trigger ON campaign_leads;
DROP FUNCTION IF EXISTS verify_campaign_lead_insert();

-- Create simplified campaign_leads policy
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

-- Create improved trigger function for campaign_leads
CREATE OR REPLACE FUNCTION verify_campaign_lead_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- First verify campaign ownership
  IF NOT EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = NEW.campaign_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User does not own this campaign';
  END IF;

  -- Then verify lead access:
  -- 1. Lead exists in any of user's lists
  -- 2. Lead exists in any of user's campaigns
  -- 3. Lead exists but isn't associated with any user yet
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
    SELECT 1 FROM leads l
    WHERE l.id = NEW.lead_id
    AND NOT EXISTS (
      SELECT 1 FROM campaign_leads cl2
      JOIN campaigns c2 ON c2.id = cl2.campaign_id
      WHERE cl2.lead_id = l.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM list_leads ll2
      JOIN saved_lists sl2 ON sl2.id = ll2.list_id
      WHERE ll2.lead_id = l.id
    )
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid lead access';
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

CREATE INDEX IF NOT EXISTS idx_list_leads_lead_lookup
  ON list_leads(lead_id);

CREATE INDEX IF NOT EXISTS idx_saved_lists_user_lookup
  ON saved_lists(user_id);

-- Update statistics
ANALYZE campaign_leads;
ANALYZE campaigns;
ANALYZE leads;
ANALYZE list_leads;
ANALYZE saved_lists;