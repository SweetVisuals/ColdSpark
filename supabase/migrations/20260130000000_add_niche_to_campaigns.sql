/*
  # Add niche column to campaigns table

  1. Changes
    - Add `niche` column to `campaigns` table
      - Type: text
      - Nullable: true (to avoid issues with existing data)
*/

ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS niche text;
