-- Add missing columns to leads table to support scraper data and Lead interface
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS twitter text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS role text;
