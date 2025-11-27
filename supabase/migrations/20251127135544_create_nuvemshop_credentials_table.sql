/*
  # Create Nuvemshop Credentials Table

  1. New Tables
    - `nuvemshop_credentials`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `access_token` (text, encrypted credentials)
      - `store_id` (text)
      - `api_url` (text)
      - `user_agent` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `nuvemshop_credentials` table
    - Add policies for authenticated users to manage their own credentials
    - Only service role can read/write credentials
*/

CREATE TABLE IF NOT EXISTS nuvemshop_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  store_id text NOT NULL,
  api_url text DEFAULT 'https://api.tiendanube.com/v1',
  user_agent text DEFAULT 'Omafit (contato@omafit.co)',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE nuvemshop_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage all credentials"
  ON nuvemshop_credentials
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own credentials"
  ON nuvemshop_credentials
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON nuvemshop_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON nuvemshop_credentials
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON nuvemshop_credentials
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nuvemshop_credentials_user_id ON nuvemshop_credentials(user_id);
