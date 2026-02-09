/*
  # Add additional fields to leads table
  
  1. Changes
    - Add industry column
    - Add location column 
    - Add employees column
    - Add company_news column
    - Add indexes for improved query performance

  2. Notes
    - Using DO block to safely add columns if they don't exist
    - Added indexes on commonly queried fields
*/

DO $$ 
BEGIN
  -- Add industry column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'industry'
  ) THEN
    ALTER TABLE leads ADD COLUMN industry text;
  END IF;

  -- Add location column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'location'
  ) THEN
    ALTER TABLE leads ADD COLUMN location text;
  END IF;

  -- Add employees column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'employees'
  ) THEN
    ALTER TABLE leads ADD COLUMN employees text;
  END IF;

  -- Add company_news column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'company_news'
  ) THEN
    ALTER TABLE leads ADD COLUMN company_news text;
  END IF;
END $$;

-- Add indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
CREATE INDEX IF NOT EXISTS idx_leads_industry ON leads(industry);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(location);