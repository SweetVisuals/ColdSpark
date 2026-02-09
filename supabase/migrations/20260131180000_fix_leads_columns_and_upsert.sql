-- Add missing columns to leads table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'summary') THEN
    ALTER TABLE leads ADD COLUMN summary text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'personalized_email') THEN
    ALTER TABLE leads ADD COLUMN personalized_email text;
  END IF;

  -- Ensure other columns from types exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'facebook') THEN
    ALTER TABLE leads ADD COLUMN facebook text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'twitter') THEN
    ALTER TABLE leads ADD COLUMN twitter text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'instagram') THEN
    ALTER TABLE leads ADD COLUMN instagram text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'role') THEN
    ALTER TABLE leads ADD COLUMN role text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'website') THEN
    ALTER TABLE leads ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'user_id') THEN
    ALTER TABLE leads ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create a unique constraint for upsert
-- We use user_id, website, and email to uniquely identify a lead for a user.
-- Since we use empty strings for missing values in the scraper, this works well.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_user_id_website_email_key;
ALTER TABLE leads ADD CONSTRAINT leads_user_id_website_email_key UNIQUE (user_id, website, email);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
