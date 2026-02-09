-- Create campaign_leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (campaign_id, lead_id)
);

-- Create or replace the function
CREATE OR REPLACE FUNCTION public.create_campaign_leads(campaign_id uuid, lead_ids uuid[])
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  lead_id uuid;
BEGIN
  FOREACH lead_id IN ARRAY lead_ids LOOP
    INSERT INTO public.campaign_leads (campaign_id, lead_id)
    VALUES (create_campaign_leads.campaign_id, lead_id)
    ON CONFLICT (campaign_id, lead_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_campaign_leads(uuid, uuid[]) TO authenticated;
GRANT SELECT, INSERT ON TABLE public.campaign_leads TO authenticated;
