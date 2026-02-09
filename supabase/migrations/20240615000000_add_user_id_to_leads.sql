-- Add user_id column to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS leads_user_id_idx ON leads(user_id);

-- Update existing leads to set user_id based on campaign ownership
DO $$
DECLARE
    lead_record RECORD;
BEGIN
    FOR lead_record IN SELECT l.id, c.user_id
        FROM leads l
        JOIN campaign_leads cl ON l.id = cl.lead_id
        JOIN campaigns c ON cl.campaign_id = c.id
    LOOP
        UPDATE leads
        SET user_id = lead_record.user_id
        WHERE id = lead_record.id;
    END LOOP;
END $$;
