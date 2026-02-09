-- Enable RLS on campaigns table
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own campaigns
CREATE POLICY "Users can only access their own campaigns"
ON campaigns
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable RLS on campaign_email_accounts table
ALTER TABLE campaign_email_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access campaign_email_accounts for their campaigns
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

-- Add foreign key constraint to ensure data integrity
ALTER TABLE campaign_email_accounts
ADD CONSTRAINT fk_campaign_email_accounts_campaigns
FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
ON DELETE CASCADE;

ALTER TABLE campaign_email_accounts
ADD CONSTRAINT fk_campaign_email_accounts_email_accounts
FOREIGN KEY (email_account_id) REFERENCES email_accounts(id)
ON DELETE CASCADE;
