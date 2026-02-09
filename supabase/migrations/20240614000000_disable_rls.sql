-- Disable RLS on all tables since we're using application-level security
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails DISABLE ROW LEVEL SECURITY;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can only access their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can only access their own email accounts" ON email_accounts;
DROP POLICY IF EXISTS "Users can only access campaign_email_accounts for their campaigns" ON campaign_email_accounts;
DROP POLICY IF EXISTS "Users can only access their own leads" ON leads;
DROP POLICY IF EXISTS "Users can only access their own scheduled emails" ON scheduled_emails;
