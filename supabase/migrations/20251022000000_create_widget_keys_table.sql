/*
  # Create Widget Keys Table

  1. New Tables
    - `widget_keys`
      - `id` (uuid, primary key) - Unique widget identifier
      - `user_id` (uuid, foreign key) - Owner of the widget
      - `key` (text, unique) - Unique widget key (e.g., "wgt_abc123xyz")
      - `name` (text) - Friendly name for the widget
      - `status` (text) - active, inactive
      - `domain` (text) - Optional domain restriction
      - `usage_count` (integer) - Track how many times used
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `last_used_at` (timestamptz)

  2. Security
    - Enable RLS on widget_keys table
    - Add policies for authenticated users to manage their own keys
    - Add policy for service role to validate keys

  3. Notes
    - Each widget code will include the unique key
    - Edge function will validate key before processing
    - Keys can be deactivated without deleting widget code
*/

CREATE TABLE IF NOT EXISTS widget_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  domain text,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE widget_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their own widget keys
CREATE POLICY "Users can view own widget keys"
  ON widget_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own widget keys
CREATE POLICY "Users can insert own widget keys"
  ON widget_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own widget keys
CREATE POLICY "Users can update own widget keys"
  ON widget_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own widget keys
CREATE POLICY "Users can delete own widget keys"
  ON widget_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can read all keys for validation
CREATE POLICY "Service can validate all keys"
  ON widget_keys
  FOR SELECT
  TO service_role
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_widget_keys_user_id ON widget_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_keys_key ON widget_keys(key);
CREATE INDEX IF NOT EXISTS idx_widget_keys_status ON widget_keys(status);

-- Function to generate unique widget key
CREATE OR REPLACE FUNCTION generate_widget_key()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_key text;
  key_exists boolean;
BEGIN
  LOOP
    -- Generate key in format: wgt_XXXXXXXXXX (random alphanumeric)
    new_key := 'wgt_' || lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 16));

    -- Check if key already exists
    SELECT EXISTS(SELECT 1 FROM widget_keys WHERE key = new_key) INTO key_exists;

    -- Exit loop if key is unique
    EXIT WHEN NOT key_exists;
  END LOOP;

  RETURN new_key;
END;
$$;
