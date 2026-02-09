-- Drop dependent objects if they exist
DROP TRIGGER IF EXISTS campaign_leads_updated_at_trigger ON campaign_leads;
DROP FUNCTION IF EXISTS update_campaign_leads_updated_at();
DROP INDEX IF EXISTS idx_campaign_leads_campaign_id;
DROP INDEX IF EXISTS idx_campaign_leads_lead_id;

-- Drop existing table if it exists
DROP TABLE IF EXISTS campaign_leads CASCADE;

-- Create campaign_leads table
CREATE TABLE campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique combination of campaign and lead
  CONSTRAINT campaign_lead_unique UNIQUE (campaign_id, lead_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_campaign_leads_campaign_id ON campaign_leads (campaign_id);
CREATE INDEX idx_campaign_leads_lead_id ON campaign_leads (lead_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_leads_updated_at_trigger
BEFORE UPDATE ON campaign_leads
FOR EACH ROW
EXECUTE FUNCTION update_campaign_leads_updated_at();
