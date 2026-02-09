-- Triggers to automatically update health score
CREATE OR REPLACE FUNCTION trigger_update_health_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Run calculation for the affected account
    PERFORM calculate_account_health_score(NEW.email_account_id);
    RETURN NEW;
END;
$$;

-- Drop triggers if they exist to avoid duplication errors on re-run
DROP TRIGGER IF EXISTS update_health_score_on_campaign_progress ON campaign_progress;
DROP TRIGGER IF EXISTS update_health_score_on_warmup_progress ON email_warmup_progress;

CREATE TRIGGER update_health_score_on_campaign_progress
AFTER INSERT OR UPDATE OF status ON campaign_progress
FOR EACH ROW
EXECUTE FUNCTION trigger_update_health_score();

CREATE TRIGGER update_health_score_on_warmup_progress
AFTER INSERT OR UPDATE OF emails_sent ON email_warmup_progress
FOR EACH ROW
EXECUTE FUNCTION trigger_update_health_score();
