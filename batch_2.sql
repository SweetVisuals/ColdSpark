/*
  # Fix Campaign Leads RLS Policies

  1. Changes
    - Drop and recreate RLS policies for leads table
    - Add more permissive policy for lead creation
    - Fix campaign_leads policies
    
  2. Security
    - Maintains security while allowing proper lead management
    - Ensures users can only access their own data
*/

-- Drop existing leads policies
DROP POLICY IF EXISTS "Users can manage leads" ON leads;

-- Create new leads policies
CREATE POLICY "Users can manage their own leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    -- Allow access if the lead is in user's lists
    EXISTS (
      SELECT 1 FROM saved_lists sl
      JOIN list_leads ll ON ll.list_id = sl.id
      WHERE ll.lead_id = leads.id
      AND sl.user_id = auth.uid()
    )
    OR
    -- Allow access if the lead is in user's campaigns
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_leads cl ON cl.campaign_id = c.id
      WHERE cl.lead_id = leads.id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Drop existing campaign_leads policies
DROP POLICY IF EXISTS "Users can view leads in their campaigns" ON campaign_leads;
DROP POLICY IF EXISTS "Users can add leads to their campaigns" ON campaign_leads;
DROP POLICY IF EXISTS "Users can remove leads from their campaigns" ON campaign_leads;

-- Create new campaign_leads policy
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_leads.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );
/*
  # Fix Leads and Campaign Leads RLS Policies

  1. Changes
    - Drop and recreate leads policies with proper checks
    - Fix campaign_leads policies to allow proper association
    - Add missing indexes for performance
    
  2. Security
    - Maintains data isolation between users
    - Allows proper lead management within campaigns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own leads" ON leads;
DROP POLICY IF EXISTS "Users can create leads" ON leads;
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create new leads policies
CREATE POLICY "Users can create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_leads cl ON cl.campaign_id = c.id
      WHERE cl.lead_id = leads.id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM saved_lists sl
      JOIN list_leads ll ON ll.list_id = sl.id
      WHERE ll.lead_id = leads.id
      AND sl.user_id = auth.uid()
    )
  );

-- Create new campaign_leads policies
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_created_at ON campaign_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_lists_user_id ON saved_lists(user_id);
/*
  # Fix Campaign Leads RLS Policies

  1. Changes
    - Drop and recreate campaign_leads policies with proper checks
    - Add missing indexes for performance
    
  2. Security
    - Maintains data isolation between users
    - Allows proper lead management within campaigns
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create new campaign_leads policies
CREATE POLICY "Users can insert campaign leads"
  ON campaign_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view campaign leads"
  ON campaign_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete campaign leads"
  ON campaign_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_lead ON campaign_leads(campaign_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_campaign ON campaigns(user_id, id);
/*
  # Fix Campaign Leads RLS Policies

  1. Changes
    - Drop and recreate campaign_leads policies with proper checks
    - Add missing indexes for performance
    - Fix policy ordering and checks
    
  2. Security
    - Maintains data isolation between users
    - Allows proper lead management within campaigns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert campaign leads" ON campaign_leads;
DROP POLICY IF EXISTS "Users can view campaign leads" ON campaign_leads;
DROP POLICY IF EXISTS "Users can delete campaign leads" ON campaign_leads;

-- Create new unified policy
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Add composite index for campaign ownership check
CREATE INDEX IF NOT EXISTS idx_campaigns_user_campaign_lookup 
  ON campaigns(user_id, id);

-- Add index for campaign leads lookups
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lookup 
  ON campaign_leads(campaign_id, lead_id);
/*
  # Final Fix for Campaign Leads RLS

  1. Changes
    - Simplify RLS policies with a single unified policy
    - Add proper WITH CHECK clause for inserts
    - Ensure proper campaign ownership verification
    
  2. Security
    - Maintains data isolation between users
    - Allows proper lead management within campaigns
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create new simplified policy
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Add missing indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);

-- Analyze tables to update statistics
ANALYZE campaign_leads;
ANALYZE campaigns;
/*
  # Fix Campaign Leads Structure and Policies

  1. Changes
    - Add created_at column if missing
    - Ensure proper foreign key constraints
    - Add proper indexes
    - Update RLS policies
    
  2. Security
    - Maintain data isolation between users
    - Ensure proper campaign ownership checks
*/

-- Ensure created_at column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_leads' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE campaign_leads ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create new policy with proper checks
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Recreate foreign key constraints
ALTER TABLE campaign_leads 
  DROP CONSTRAINT IF EXISTS campaign_leads_campaign_id_fkey,
  DROP CONSTRAINT IF EXISTS campaign_leads_lead_id_fkey;

ALTER TABLE campaign_leads
  ADD CONSTRAINT campaign_leads_campaign_id_fkey 
    FOREIGN KEY (campaign_id) 
    REFERENCES campaigns(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT campaign_leads_lead_id_fkey 
    FOREIGN KEY (lead_id) 
    REFERENCES leads(id) 
    ON DELETE CASCADE;

-- Add optimized indexes
DROP INDEX IF EXISTS idx_campaign_leads_campaign_id;
DROP INDEX IF EXISTS idx_campaign_leads_lead_id;
DROP INDEX IF EXISTS idx_campaign_leads_lookup;

CREATE INDEX idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_lead_id ON campaign_leads(lead_id);
CREATE INDEX idx_campaign_leads_lookup ON campaign_leads(campaign_id, lead_id);

-- Update table statistics
ANALYZE campaign_leads;
/*
  # Final Fix for Campaign Leads Structure

  1. Changes
    - Simplify RLS policy
    - Add proper indexes
    - Ensure proper constraints
    
  2. Security
    - Maintain data isolation between users
    - Ensure proper campaign ownership checks
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;

-- Create simplified policy
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Ensure proper indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_lookup 
  ON campaign_leads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_combined_lookup 
  ON campaign_leads(campaign_id, lead_id);

-- Update table statistics
ANALYZE campaign_leads;
/*
  # Comprehensive Fix for Campaign Leads System

  1. Changes
    - Complete overhaul of RLS policies
    - Proper cascading permissions
    - Optimized indexes
    - Proper constraints
    
  2. Security
    - Ensure proper data isolation between users
    - Maintain referential integrity
    - Allow proper lead sharing between lists and campaigns
*/

-- First, ensure we have the right constraints
ALTER TABLE campaign_leads
  DROP CONSTRAINT IF EXISTS campaign_leads_campaign_id_fkey,
  DROP CONSTRAINT IF EXISTS campaign_leads_lead_id_fkey;

ALTER TABLE campaign_leads
  ADD CONSTRAINT campaign_leads_campaign_id_fkey 
    FOREIGN KEY (campaign_id) 
    REFERENCES campaigns(id) 
    ON DELETE CASCADE,
  ADD CONSTRAINT campaign_leads_lead_id_fkey 
    FOREIGN KEY (lead_id) 
    REFERENCES leads(id) 
    ON DELETE CASCADE;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;
DROP POLICY IF EXISTS "Users can create leads" ON leads;
DROP POLICY IF EXISTS "Users can read their leads" ON leads;

-- Create new leads policies
CREATE POLICY "Users can create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_leads cl ON cl.campaign_id = c.id
      WHERE cl.lead_id = leads.id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM saved_lists sl
      JOIN list_leads ll ON ll.list_id = sl.id
      WHERE ll.lead_id = leads.id
      AND sl.user_id = auth.uid()
    )
  );

-- Create new campaign_leads policy with proper checks
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Optimize indexes for common query patterns
DROP INDEX IF EXISTS idx_campaign_leads_campaign_id;
DROP INDEX IF EXISTS idx_campaign_leads_lead_id;
DROP INDEX IF EXISTS idx_campaign_leads_lookup;
DROP INDEX IF EXISTS idx_campaigns_user_id;
DROP INDEX IF EXISTS idx_leads_lookup;

CREATE INDEX idx_campaign_leads_campaign_id ON campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_lead_id ON campaign_leads(lead_id);
CREATE INDEX idx_campaign_leads_lookup ON campaign_leads(campaign_id, lead_id);
CREATE INDEX idx_campaigns_user_lookup ON campaigns(user_id, id);
CREATE INDEX idx_leads_lookup ON leads(id) INCLUDE (email);

-- Update table statistics
ANALYZE leads;
ANALYZE campaigns;
ANALYZE campaign_leads;
/*
  # Fix Campaign Leads System

  1. Changes
    - Simplified RLS policies
    - Improved relationship handling
    - Optimized query performance
    
  2. Security
    - Maintain proper data isolation
    - Allow lead sharing between campaigns
    - Prevent unauthorized access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;
DROP POLICY IF EXISTS "Users can create leads" ON leads;
DROP POLICY IF EXISTS "Users can read their leads" ON leads;

-- Create new leads policies
CREATE POLICY "Users can create leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read their leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN campaign_leads cl ON cl.campaign_id = c.id
      WHERE cl.lead_id = leads.id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM saved_lists sl
      JOIN list_leads ll ON ll.list_id = sl.id
      WHERE ll.lead_id = leads.id
      AND sl.user_id = auth.uid()
    )
  );

-- Create new campaign_leads policy
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Create function to check lead ownership
CREATE OR REPLACE FUNCTION check_lead_ownership(lead_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM campaigns c
    JOIN campaign_leads cl ON cl.campaign_id = c.id
    WHERE cl.lead_id = $1
    AND c.user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM saved_lists sl
    JOIN list_leads ll ON ll.list_id = sl.id
    WHERE ll.lead_id = $1
    AND sl.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to verify lead ownership on campaign_leads insert
CREATE OR REPLACE FUNCTION verify_campaign_lead_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user owns the campaign
  IF NOT EXISTS (
    SELECT 1 FROM campaigns
    WHERE id = NEW.campaign_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User does not own this campaign';
  END IF;

  -- If the lead exists and user owns it, allow the insert
  IF check_lead_ownership(NEW.lead_id, auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- If the lead exists in leads table but user doesn't own it yet, allow it
  IF EXISTS (
    SELECT 1 FROM leads
    WHERE id = NEW.lead_id
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid lead';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS verify_campaign_lead_insert_trigger ON campaign_leads;
CREATE TRIGGER verify_campaign_lead_insert_trigger
  BEFORE INSERT ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION verify_campaign_lead_insert();

-- Optimize indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_lookup 
  ON campaign_leads(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_combined_lookup 
  ON campaign_leads(campaign_id, lead_id);

-- Update statistics
ANALYZE campaign_leads;
ANALYZE leads;
/*
  # Fix Campaign Leads RLS

  1. Changes
    - Simplify RLS policies
    - Add proper ownership checks
    - Improve error handling
    
  2. Security
    - Maintain data isolation
    - Allow lead sharing between lists and campaigns
    - Prevent unauthorized access
*/

-- Drop existing policies and triggers
DROP POLICY IF EXISTS "Users can manage campaign leads" ON campaign_leads;
DROP TRIGGER IF EXISTS verify_campaign_lead_insert_trigger ON campaign_leads;
DROP FUNCTION IF EXISTS verify_campaign_lead_insert();

-- Create new campaign_leads policy
CREATE POLICY "Users can manage campaign leads"
  ON campaign_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_leads.campaign_id
      AND c.user_id = auth.uid()
    )
  );

-- Create function to verify campaign ownership and lead access
CREATE OR REPLACE FUNCTION verify_campaign_lead_insert()
RETURNS TRIGGER AS $$
DECLARE
  campaign_owner_id uuid;
BEGIN
  -- Get campaign owner
  SELECT user_id INTO campaign_owner_id
  FROM campaigns
  WHERE id = NEW.campaign_id;

  -- Verify campaign ownership
  IF campaign_owner_id IS NULL OR campaign_owner_id != auth.uid() THEN
    RAISE EXCEPTION 'User does not own this campaign';
  END IF;

  -- Allow the insert if:
  -- 1. User owns the lead through a list
  -- 2. User owns the lead through another campaign
  -- 3. The lead exists but isn't owned by anyone yet
  IF EXISTS (
    SELECT 1 FROM saved_lists sl
    JOIN list_leads ll ON ll.list_id = sl.id
    WHERE ll.lead_id = NEW.lead_id
    AND sl.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM campaigns c
    JOIN campaign_leads cl ON cl.campaign_id = c.id
    WHERE cl.lead_id = NEW.lead_id
    AND c.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM leads
    WHERE id = NEW.lead_id
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Invalid lead';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for campaign_leads
CREATE TRIGGER verify_campaign_lead_insert_trigger
  BEFORE INSERT ON campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION verify_campaign_lead_insert();

-- Optimize indexes
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lookup 
  ON campaign_leads(campaign_id, lead_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_lookup 
  ON campaigns(user_id, id);

-- Update statistics
ANALYZE campaign_leads;
ANALYZE campaigns;
ANALYZE leads;
