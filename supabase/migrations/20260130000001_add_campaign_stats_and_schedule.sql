/*
  # Add missing columns to campaigns table

  1. Changes
    - Add `niche` column (text)
    - Add `prospects` column (integer, default 0)
    - Add `replies` column (integer, default 0)
    - Add `open_rate` column (float, default 0)
    - Add `schedule` column (jsonb)
  
  Note: IF NOT EXISTS is used to prevent errors if some columns were already added.
*/

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS niche text,
ADD COLUMN IF NOT EXISTS prospects integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS replies integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS open_rate float DEFAULT 0,
ADD COLUMN IF NOT EXISTS schedule jsonb;
