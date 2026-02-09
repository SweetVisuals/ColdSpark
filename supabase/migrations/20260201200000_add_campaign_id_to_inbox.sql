-- Add campaign_id column to inbox_emails table if it doesn't exist
ALTER TABLE inbox_emails 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

-- Optional: Add index for performance given we filter by it
CREATE INDEX IF NOT EXISTS idx_inbox_emails_campaign_id ON inbox_emails(campaign_id);
