-- Add source and status columns to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'New';
