/*
  # Fix Campaign Leads Structure and Policies

  1. Changes
    - Add created_at column if missing
    - Ensure proper foreign key constraints
    - Add proper indexes
    - Update RLS policies
    
  2. Security
    - Maintain data isolation between users
    - Ensure proper campaign ownership checks
*/

-- Ensure created_at column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_leads' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE campaign_leads ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create new policy with proper checks
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

-- Recreate foreign key constraints
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

-- Add optimized indexes
DROP INDEX IF EXISTS idx_campaign_leads_campaign_id;
DROP INDEX IF EXISTS idx_campaign_leads_lead_id;
DROP INDEX IF EXISTS idx_campaign_leads_lookup;

CREATE INDEX idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_lead_id ON campaign_leads(lead_id);
CREATE INDEX idx_campaign_leads_lookup ON campaign_leads(campaign_id, lead_id);

-- Update table statistics
ANALYZE campaign_leads;