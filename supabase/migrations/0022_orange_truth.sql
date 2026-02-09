/*
  # Add Templates Table

  1. New Tables
    - `templates`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references campaigns)
      - `name` (text)
      - `subject` (text)
      - `content` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on templates table
    - Add policy for authenticated users to manage their templates
*/

-- Create templates table
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Create policy for managing templates
CREATE POLICY "Users can manage their campaign templates"
  ON templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = templates.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_templates_campaign_id ON templates(campaign_id);
CREATE INDEX idx_templates_created_at ON templates(created_at);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_templates_updated_at();