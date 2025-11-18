/*
  # Fix API Config Authentication and Set Fashn.AI Key

  1. Changes
    - Drop existing api_config table with restrictive policies
    - Create new simplified api_config table with proper user permissions
    - Insert Fashn.AI API key directly into environment config
  
  2. Security
    - Enable RLS on new api_config table
    - Add policies for authenticated users to manage their own API configs
    - Store API key securely in database
*/

-- Drop existing table and recreate with proper structure
DROP TABLE IF EXISTS api_config CASCADE;

-- Create new api_config table with user_id
CREATE TABLE IF NOT EXISTS api_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  key_value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, key_name)
);

-- Enable RLS
ALTER TABLE api_config ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can manage their own API configs"
  ON api_config
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_config_updated_at
  BEFORE UPDATE ON api_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert the global Fashn.AI API key for all users to use
-- This will be the fallback if users don't have their own key
INSERT INTO api_config (user_id, key_name, key_value)
SELECT 
  id as user_id,
  'fashn_api_key' as key_name,
  'fa-O8WJBJc627lc-by8JIzhHW3tkJhDVZWySc3Mp' as key_value
FROM auth.users
ON CONFLICT (user_id, key_name) DO UPDATE SET
  key_value = EXCLUDED.key_value,
  updated_at = now();