/*
  # Fix scheduled_emails table foreign key

  1. Changes
    - Drop existing foreign key constraint
    - Add new foreign key constraint referencing the correct templates table
    - Add indexes for better performance
*/

-- Drop existing foreign key constraint
ALTER TABLE scheduled_emails
  DROP CONSTRAINT IF EXISTS scheduled_emails_template_id_fkey;

-- Add new foreign key constraint
ALTER TABLE scheduled_emails
  ADD CONSTRAINT scheduled_emails_template_id_fkey
  FOREIGN KEY (template_id)
  REFERENCES templates(id)
  ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_template_id 
  ON scheduled_emails(template_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for 
  ON scheduled_emails(scheduled_for);

-- Update statistics
ANALYZE scheduled_emails;
ANALYZE templates;