-- Enable RLS on all user-specific tables
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Add user_id to tables if missing
ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Add RLS policies
-- Campaigns
DROP POLICY IF EXISTS "Users can only access their own campaigns" ON campaigns;
CREATE POLICY "Users can only access their own campaigns"
ON campaigns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Email Accounts
DROP POLICY IF EXISTS "Users can only access their own email accounts" ON email_accounts;
CREATE POLICY "Users can only access their own email accounts"
ON email_accounts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Campaign Email Accounts
DROP POLICY IF EXISTS "Users can only access campaign_email_accounts for their campaigns" ON campaign_email_accounts;
CREATE POLICY "Users can only access campaign_email_accounts for their campaigns"
ON campaign_email_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_email_accounts.campaign_id
    AND campaigns.user_id = auth.uid()
  )
);

-- Leads
DROP POLICY IF EXISTS "Users can only access their own leads" ON leads;
CREATE POLICY "Users can only access their own leads"
ON leads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Scheduled Emails
DROP POLICY IF EXISTS "Users can only access their own scheduled emails" ON scheduled_emails;
CREATE POLICY "Users can only access their own scheduled emails"
ON scheduled_emails
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE campaign_email_accounts
ADD CONSTRAINT fk_campaign_email_accounts_campaigns
FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
ON DELETE CASCADE;

ALTER TABLE campaign_email_accounts
ADD CONSTRAINT fk_campaign_email_accounts_email_accounts
FOREIGN KEY (email_account_id) REFERENCES email_accounts(id)
ON DELETE CASCADE;

ALTER TABLE leads
ADD CONSTRAINT fk_leads_campaigns
FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
ON DELETE CASCADE;

ALTER TABLE scheduled_emails
ADD CONSTRAINT fk_scheduled_emails_campaigns
FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
ON DELETE CASCADE;

-- Migrate existing data to associate with users
UPDATE leads SET user_id = campaigns.user_id
FROM campaigns
WHERE leads.campaign_id = campaigns.id;

UPDATE scheduled_emails SET user_id = campaigns.user_id
FROM campaigns
WHERE scheduled_emails.campaign_id = campaigns.id;
