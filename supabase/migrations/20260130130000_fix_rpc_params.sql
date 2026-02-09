-- Drop the old function to avoid signature conflicts
DROP FUNCTION IF EXISTS get_email_accounts_with_stats();
DROP FUNCTION IF EXISTS get_email_accounts_with_stats(UUID);

-- Recreate function with explicit p_user_id parameter and text casts for ports
CREATE OR REPLACE FUNCTION get_email_accounts_with_stats(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  name TEXT,
  signature TEXT,
  imap_host TEXT,
  imap_port TEXT,
  smtp_host TEXT,
  smtp_port TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  warmup_enabled BOOLEAN,
  warmup_filter_tag TEXT,
  warmup_increase_per_day INTEGER,
  warmup_daily_limit INTEGER,
  warmup_start_date TIMESTAMP WITH TIME ZONE,
  warmup_status TEXT,
  health_score INTEGER,
  encrypted_password TEXT,
  total_sent BIGINT,
  total_warmup BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id,
    ea.user_id,
    ea.email,
    ea.name,
    ea.signature,
    ea.imap_host,
    ea.imap_port::TEXT, -- Cast to TEXT
    ea.smtp_host,
    ea.smtp_port::TEXT, -- Cast to TEXT
    ea.created_at,
    ea.warmup_enabled,
    ea.warmup_filter_tag,
    ea.warmup_increase_per_day,
    ea.warmup_daily_limit,
    ea.warmup_start_date,
    ea.warmup_status,
    ea.health_score,
    ea.encrypted_password,
    (
      SELECT COUNT(*)
      FROM campaign_progress cp
      WHERE cp.email_account_id = ea.id
      AND cp.status = 'sent'
    ) as total_sent,
    (
      SELECT CAST(COALESCE(SUM(ewp.emails_sent), 0) AS BIGINT)
      FROM email_warmup_progress ewp
      WHERE ewp.email_account_id = ea.id
    ) as total_warmup
  FROM email_accounts ea
  WHERE ea.user_id = p_user_id -- Use the passed parameter
  ORDER BY ea.created_at DESC;
END;
$$;
