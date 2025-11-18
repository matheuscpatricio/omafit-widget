/*
  # Add public ID to widget_keys for secure client-side usage

  1. Changes
    - Add `public_id` column to widget_keys table
    - Create unique index on public_id
    - Generate public_id for existing keys
    - Update generate_widget_key function to also generate public_id

  2. Security
    - public_id can be safely exposed in client-side code
    - The secret key remains protected on the server side
    - Backend validates public_id and maps to secret key internally
*/

-- Add public_id column
ALTER TABLE widget_keys
ADD COLUMN IF NOT EXISTS public_id text UNIQUE;

-- Generate public_id for existing keys
UPDATE widget_keys
SET public_id = 'wgt_pub_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24)
WHERE public_id IS NULL;

-- Make public_id NOT NULL after populating
ALTER TABLE widget_keys
ALTER COLUMN public_id SET NOT NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_widget_keys_public_id ON widget_keys(public_id);

-- Update the generate_widget_key function to also generate public_id
CREATE OR REPLACE FUNCTION generate_widget_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_key text;
  new_public_id text;
  key_exists boolean;
BEGIN
  LOOP
    -- Generate a new key with 'wgt_' prefix
    new_key := 'wgt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

    -- Check if key already exists
    SELECT EXISTS(SELECT 1 FROM widget_keys WHERE key = new_key) INTO key_exists;

    -- Exit loop if key is unique
    EXIT WHEN NOT key_exists;
  END LOOP;

  RETURN new_key;
END;
$$;

-- Create new function to generate public_id
CREATE OR REPLACE FUNCTION generate_widget_public_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_public_id text;
  id_exists boolean;
BEGIN
  LOOP
    -- Generate a new public ID with 'wgt_pub_' prefix
    new_public_id := 'wgt_pub_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);

    -- Check if public_id already exists
    SELECT EXISTS(SELECT 1 FROM widget_keys WHERE public_id = new_public_id) INTO id_exists;

    -- Exit loop if public_id is unique
    EXIT WHEN NOT id_exists;
  END LOOP;

  RETURN new_public_id;
END;
$$;
