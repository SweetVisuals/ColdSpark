-- Create a function to get pending leads
-- This avoids complex client-side join logic in the Deno function
CREATE OR REPLACE FUNCTION get_pending_campaign_leads(campaign_id_param UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  company TEXT,
  name TEXT,
  summary TEXT,
  personalized_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.email,
    l.company,
    l.name,
    l.summary,
    l.personalized_email
  FROM campaign_leads cl
  JOIN leads l ON cl.lead_id = l.id
  WHERE cl.campaign_id = campaign_id_param
  AND NOT EXISTS (
    SELECT 1 FROM campaign_progress cp 
    WHERE cp.campaign_id = campaign_id_param 
    AND cp.lead_id = l.id 
    AND cp.status = 'sent'
  );
END;
$$ LANGUAGE plpgsql;
