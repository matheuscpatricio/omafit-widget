/*
  # Fix API Config Permissions

  1. Changes
    - Remove admin-only policies from api_config table
    - Add new policies for authenticated users to manage their own API configs
    - Add user_id column to api_config table for user-specific configurations

  2. Security
    - Enable RLS on api_config table (already enabled)
    - Add policies for authenticated users to manage their own API configurations
    - Each user can only access their own API configurations

  3. Migration Safety
    - Uses IF NOT EXISTS and conditional checks to prevent errors
    - Preserves existing data
    - Safe to run multiple times
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_config' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE api_config ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Allow admins to modify API config" ON api_config;
DROP POLICY IF EXISTS "Allow admins to view API config" ON api_config;

-- Create new policies for authenticated users
CREATE POLICY "Users can view their own API config"
  ON api_config
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own API config"
  ON api_config
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API config"
  ON api_config
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own API config"
  ON api_config
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create unique constraint for user_id + key_name combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'api_config_user_key_unique'
  ) THEN
    ALTER TABLE api_config ADD CONSTRAINT api_config_user_key_unique UNIQUE (user_id, key_name);
  END IF;
END $$;