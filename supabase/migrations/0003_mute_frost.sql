/*
  # Add Missing Campaign Columns

  1. Changes
    - Safely add open_rate column if it doesn't exist
    - Use DO block to handle conditional column creation
    - Ensure idempotent migration

  2. Details
    - open_rate: Stores the email open rate as a decimal
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaigns' AND column_name = 'open_rate'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN open_rate DECIMAL DEFAULT 0.0;
  END IF;
END $$;