-- Combined migration for email accounts and leads fixes

-- Add smtp_port column to email_accounts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'email_accounts' 
    AND column_name = 'smtp_port'
  ) THEN
    ALTER TABLE email_accounts
    ADD COLUMN smtp_port text NOT NULL DEFAULT '587';
  END IF;
END $$;

-- Optimize indexes for leads system
CREATE INDEX IF NOT EXISTS idx_leads_lookup 
  ON leads(id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_lookup 
  ON campaign_leads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_combined_lookup 
  ON campaign_leads(campaign_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_list_leads_lookup 
  ON list_leads(lead_id, list_id);
