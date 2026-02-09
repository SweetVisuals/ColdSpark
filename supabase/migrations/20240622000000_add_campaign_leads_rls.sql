-- Enable RLS on campaign_leads table
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to insert campaign_leads
CREATE POLICY "Authenticated users can insert campaign_leads"
ON campaign_leads
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_leads.campaign_id
    AND campaigns.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_leads.lead_id
    AND leads.user_id = auth.uid()
  )
);

-- Create policy for authenticated users to select their campaign_leads
CREATE POLICY "Authenticated users can select their campaign_leads"
ON campaign_leads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_leads.campaign_id
    AND campaigns.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_leads.lead_id
    AND leads.user_id = auth.uid()
  )
);

-- Create policy for authenticated users to delete their campaign_leads
CREATE POLICY "Authenticated users can delete their campaign_leads"
ON campaign_leads
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_leads.campaign_id
    AND campaigns.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = campaign_leads.lead_id
    AND leads.user_id = auth.uid()
  )
);
