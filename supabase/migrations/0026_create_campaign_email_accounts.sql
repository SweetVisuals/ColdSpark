-- Create campaign_email_accounts table with foreign key relationship

CREATE TABLE IF NOT EXISTS campaign_email_accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    email_account_id uuid NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_campaign_email_accounts_campaign 
    ON campaign_email_accounts(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_email_accounts_email_account 
    ON campaign_email_accounts(email_account_id);

-- Add unique constraint to prevent duplicate relationships
ALTER TABLE campaign_email_accounts 
    ADD CONSTRAINT unique_campaign_email_account 
    UNIQUE (campaign_id, email_account_id);
