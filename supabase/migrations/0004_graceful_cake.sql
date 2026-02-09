/*
  # Update campaign policies

  1. Changes
    - Add policy to allow users to insert their own campaigns
    - Add policy to allow users to update their own campaigns
    - Add policy to allow users to delete their own campaigns

  2. Security
    - Enable RLS on campaigns table
    - Ensure users can only manage their own campaigns
*/

-- Update the existing RLS policy for campaigns
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON campaigns;

-- Create specific policies for each operation
CREATE POLICY "Users can insert their own campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON campaigns
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);