/*
  # Create saved lists tables

  1. New Tables
    - `saved_lists`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `created_at` (timestamp)
    - `list_leads`
      - `list_id` (uuid, references saved_lists)
      - `lead_id` (uuid, references leads)
      - Composite primary key (list_id, lead_id)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create saved_lists table
CREATE TABLE saved_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create list_leads table
CREATE TABLE list_leads (
  list_id uuid REFERENCES saved_lists ON DELETE CASCADE,
  lead_id uuid REFERENCES leads ON DELETE CASCADE,
  PRIMARY KEY (list_id, lead_id)
);

-- Enable RLS
ALTER TABLE saved_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_lists
CREATE POLICY "Users can manage their own lists"
  ON saved_lists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for list_leads
CREATE POLICY "Users can manage leads in their lists"
  ON list_leads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_lists
      WHERE saved_lists.id = list_leads.list_id
      AND saved_lists.user_id = auth.uid()
    )
  );