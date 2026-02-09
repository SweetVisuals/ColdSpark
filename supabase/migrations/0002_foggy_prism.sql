/*
  # Add Campaign Schedule Field

  1. Changes
    - Add schedule JSON field to campaigns table
  
  2. Details
    - schedule: Stores campaign scheduling configuration as JSON including:
      - frequency (daily/weekly)
      - maxEmailsPerDay
*/

ALTER TABLE campaigns 
ADD COLUMN schedule JSONB;