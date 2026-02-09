-- Add health score columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'health_score') THEN
        ALTER TABLE email_accounts ADD COLUMN health_score INTEGER DEFAULT 100;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'last_health_check') THEN
        ALTER TABLE email_accounts ADD COLUMN last_health_check TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'total_emails_sent') THEN
        ALTER TABLE email_accounts ADD COLUMN total_emails_sent INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'total_bounces') THEN
        ALTER TABLE email_accounts ADD COLUMN total_bounces INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_accounts' AND column_name = 'total_spam_reports') THEN
        ALTER TABLE email_accounts ADD COLUMN total_spam_reports INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create or replace function to calculate health score
CREATE OR REPLACE FUNCTION calculate_account_health_score(account_id UUID)
RETURNS INTEGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_score INTEGER := 100;
    v_daily_limit INTEGER;
    v_sent_last_24h INTEGER;
    v_warmup_sent INTEGER := 0;
    v_failed_last_24h INTEGER;
    v_warmup_status TEXT;
BEGIN
    -- Get account details
    SELECT warmup_daily_limit, warmup_status 
    INTO v_daily_limit, v_warmup_status
    FROM email_accounts 
    WHERE id = account_id;

    -- Default limit if null (safety net)
    IF v_daily_limit IS NULL OR v_daily_limit = 0 THEN
        v_daily_limit := 50; 
    END IF;

    -- Count sent emails in last 24h (Campaigns)
    SELECT COUNT(*) INTO v_sent_last_24h
    FROM campaign_progress
    WHERE email_account_id = account_id
    AND sent_at > NOW() - INTERVAL '24 hours'
    AND status = 'sent';

    -- Add Warmup emails sent today
    SELECT COALESCE(SUM(emails_sent), 0) INTO v_warmup_sent
    FROM email_warmup_progress
    WHERE email_account_id = account_id
    AND date >= CURRENT_DATE;
    
    v_sent_last_24h := v_sent_last_24h + v_warmup_sent;

    -- Count failures in last 24h
    SELECT COUNT(*) INTO v_failed_last_24h
    FROM campaign_progress
    WHERE email_account_id = account_id
    AND sent_at > NOW() - INTERVAL '24 hours'
    AND status = 'failed';

    -- HEALTH LOGIC RULES --

    -- 1. High Volume Penalty
    -- If sending > 100% of limit, score -20
    IF v_sent_last_24h > v_daily_limit THEN
        v_score := v_score - 20;
    END IF;
    -- If sending > 120% of limit, score -40 total
    IF v_sent_last_24h > (v_daily_limit * 1.2) THEN
        v_score := v_score - 20; 
    END IF;

    -- 2. Failure Rate Penalty
    -- If we have failures, deduct heavily
    IF v_failed_last_24h > 0 THEN
        -- -5 points per failure, max -50
        v_score := v_score - LEAST(50, v_failed_last_24h * 5);
    END IF;

    -- 3. Inactivity Penalty (Optional - if warmup enabled but 0 sent)
    IF v_warmup_status = 'enabled' AND v_warmup_sent = 0 AND v_sent_last_24h = 0 THEN
        v_score := v_score - 5; -- Slight decay for inactivity when supposed to be active
    END IF;
    
    -- Ensure score is 0-100
    v_score := GREATEST(0, LEAST(100, v_score));

    -- Update the account
    UPDATE email_accounts 
    SET health_score = v_score,
        last_health_check = NOW()
    WHERE id = account_id;

    RETURN v_score;
END;
$$;

-- Function to update all accounts
CREATE OR REPLACE FUNCTION update_all_health_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM email_accounts LOOP
        PERFORM calculate_account_health_score(r.id);
    END LOOP;
END;
$$;
