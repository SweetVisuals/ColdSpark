-- Remove duplicates, keeping the latest entry for each (campaign_id, lead_id) pair
DELETE FROM campaign_progress
WHERE id NOT IN (
  SELECT DISTINCT ON (campaign_id, lead_id) id
  FROM campaign_progress
  ORDER BY campaign_id, lead_id, updated_at DESC
);

-- Add unique constraint
-- Remove duplicates, keeping the latest entry for each (campaign_id, lead_id) pair
DELETE FROM campaign_progress
WHERE id NOT IN (
  SELECT DISTINCT ON (campaign_id, lead_id) id
  FROM campaign_progress
  ORDER BY campaign_id, lead_id, updated_at DESC
);

-- Add unique constraint
ALTER TABLE campaign_progress
ADD CONSTRAINT campaign_progress_campaign_id_lead_id_key UNIQUE (campaign_id, lead_id);
