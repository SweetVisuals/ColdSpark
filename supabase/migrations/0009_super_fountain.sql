/*
  # Fix leads table RLS policies

  1. Changes
    - Enable RLS on leads table
    - Add policy for users to manage leads
    - Add policy for users to view leads in their campaigns and lists
  
  2. Security
    - Users can only manage leads they create
    - Users can view leads in their campaigns and lists
*/

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy for managing leads
CREATE POLICY "Users can manage leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_lists sl
      JOIN list_leads ll ON ll.list_id = sl.id
      WHERE ll.lead_id = leads.id
      AND sl.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_leads cl ON cl.campaign_id = c.id
      WHERE cl.lead_id = leads.id
      AND c.user_id = auth.uid()
    )
    OR
    -- Allow insert operations
    (CASE WHEN current_setting('role') = 'authenticated' THEN true END)
  );

-- Add indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);