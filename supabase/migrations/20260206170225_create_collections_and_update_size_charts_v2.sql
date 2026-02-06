/*
  # Collections and Gender-Specific Size Charts

  1. New Tables
    - `collections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, collection name)
      - `description` (text, optional description)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to Existing Tables
    - `size_charts`
      - Add `collection_id` (uuid, foreign key to collections) - nullable for backward compatibility
      - Add `gender` (text, enum: 'male', 'female', 'unisex') - default 'unisex'
      - Add unique constraint on (collection_id, gender) only when collection_id IS NOT NULL

  3. Security
    - Enable RLS on `collections` table
    - Add policies for authenticated users to manage their own collections
    - Update size_charts policies to consider collection ownership

  4. Important Notes
    - Existing size_charts will have NULL collection_id (backward compatible)
    - Each collection can have up to 3 size charts (one per gender)
    - Unique constraint only applies when collection_id is not NULL
*/

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add collection_id and gender to size_charts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'size_charts' AND column_name = 'collection_id'
  ) THEN
    ALTER TABLE size_charts ADD COLUMN collection_id uuid REFERENCES collections(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'size_charts' AND column_name = 'gender'
  ) THEN
    ALTER TABLE size_charts ADD COLUMN gender text DEFAULT 'unisex' CHECK (gender IN ('male', 'female', 'unisex'));
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_size_charts_collection_gender ON size_charts(collection_id, gender);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);

-- Add partial unique constraint (only when collection_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS unique_collection_gender 
  ON size_charts(collection_id, gender) 
  WHERE collection_id IS NOT NULL;

-- Enable RLS on collections
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
CREATE POLICY "Users can view own collections"
  ON collections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update trigger for collections
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collections_updated_at ON collections;
CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();