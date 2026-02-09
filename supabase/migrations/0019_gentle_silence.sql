/*
  # Fix Campaign Leads System

  1. Changes
    - Simplified RLS policies
    - Improved relationship handling
    - Optimized query performance
    
  2. Security
    - Maintain proper data isolation
    - Allow lead sharing between campaigns
    - Prevent unauthorized access
*/

-- Drop existing policies
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

-- Create function to check lead ownership
CREATE OR REPLACE FUNCTION check_lead_ownership(lead_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM campaigns c
    JOIN campaign_leads cl ON cl.campaign_id = c.id
    WHERE cl.lead_id = $1
    AND c.user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM saved_lists sl
    JOIN list_leads ll ON ll.list_id = sl.id
    WHERE ll.lead_id = $1
    AND sl.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to verify lead ownership on campaign_leads insert
CREATE OR REPLACE FUNCTION verify_campaign_lead_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user owns the campaign
  IF NOT EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = NEW.campaign_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User does not own this campaign';
  END IF;

  -- If the lead exists and user owns it, allow the insert
  IF check_lead_ownership(NEW.lead_id, auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- If the lead exists in leads table but user doesn't own it yet, allow it
  IF EXISTS (
    SELECT 1 FROM leads
    WHERE id = NEW.lead_id
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid lead';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS verify_campaign_lead_insert_trigger ON campaign_leads;
CREATE TRIGGER verify_campaign_lead_insert_trigger
  BEFORE INSERT ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION verify_campaign_lead_insert();

-- Optimize indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_lookup 
  ON campaign_leads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_combined_lookup 
  ON campaign_leads(campaign_id, lead_id);

-- Update statistics
ANALYZE campaign_leads;
ANALYZE leads;