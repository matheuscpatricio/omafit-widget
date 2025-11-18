/*
  # API Configuration Table

  1. New Tables
    - `api_config`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `key_name` (text) - Name of the API key (e.g., 'fashn_api_key')
      - `key_value` (text) - The actual API key value
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on api_config table
    - Add policies for authenticated users to manage their own API configs
    - Store API key securely in database
*/

-- Create api_config table with user_id
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
CREATE POLICY "Users can view their own API configs"
  ON api_config FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API configs"
  ON api_config FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API configs"
  ON api_config FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API configs"
  ON api_config FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_api_config_updated_at
  BEFORE UPDATE ON api_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();