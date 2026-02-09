-- Create function to handle campaign leads associations
CREATE OR REPLACE FUNCTION create_campaign_leads(campaign_id uuid, lead_ids uuid[])
RETURNS void AS $$
DECLARE
  lead_id uuid;
BEGIN
  -- Create campaign associations for each lead
  FOREACH lead_id IN ARRAY lead_ids LOOP
    -- Check if association already exists
    PERFORM 1 FROM campaign_leads
    WHERE campaign_id = create_campaign_leads.campaign_id
      AND lead_id = create_campaign_leads.lead_id;
    
    -- Insert only if association doesn't exist
    IF NOT FOUND THEN
      INSERT INTO campaign_leads (campaign_id, lead_id)
      VALUES (create_campaign_leads.campaign_id, lead_id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create RPC endpoint
CREATE OR REPLACE FUNCTION public.create_campaign_leads(campaign_id uuid, lead_ids uuid[])
RETURNS void
LANGUAGE sql
AS $$
  SELECT create_campaign_leads(campaign_id, lead_ids);
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_campaign_leads(uuid, uuid[]) TO authenticated;
