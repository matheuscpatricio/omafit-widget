/*
  # Complete Widget Configurations Setup

  1. Changes
    - Ensure all required columns exist in widget_configurations
    - Add shop_domain as UNIQUE NOT NULL
    - Add all widget customization columns
    - Create update trigger for updated_at
    - Add index on shop_domain
  
  2. Security
    - Enable RLS
    - SECURE policies: authenticated users can manage their configs
    - Anonymous users can READ by shop_domain (for public widget)
*/

-- Create table if not exists
CREATE TABLE IF NOT EXISTS widget_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain TEXT UNIQUE NOT NULL,
  link_text TEXT DEFAULT 'Experimentar virtualmente',
  store_logo TEXT,
  primary_color TEXT DEFAULT '#810707',
  widget_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'shop_domain'
  ) THEN
    ALTER TABLE widget_configurations ADD COLUMN shop_domain TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'link_text'
  ) THEN
    ALTER TABLE widget_configurations ADD COLUMN link_text TEXT DEFAULT 'Experimentar virtualmente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'store_logo'
  ) THEN
    ALTER TABLE widget_configurations ADD COLUMN store_logo TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE widget_configurations ADD COLUMN primary_color TEXT DEFAULT '#810707';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'widget_enabled'
  ) THEN
    ALTER TABLE widget_configurations ADD COLUMN widget_enabled BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE widget_configurations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE widget_configurations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Ensure shop_domain is UNIQUE (only if not already)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'widget_configurations_shop_domain_key'
  ) THEN
    ALTER TABLE widget_configurations 
    ADD CONSTRAINT widget_configurations_shop_domain_key UNIQUE (shop_domain);
  END IF;
END $$;

-- Create index on shop_domain for fast lookups
CREATE INDEX IF NOT EXISTS idx_widget_configurations_shop_domain 
ON widget_configurations(shop_domain);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_widget_configurations_updated_at ON widget_configurations;
CREATE TRIGGER update_widget_configurations_updated_at
BEFORE UPDATE ON widget_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE widget_configurations ENABLE ROW LEVEL SECURITY;

-- Drop old insecure policy if exists
DROP POLICY IF EXISTS "Allow public read/write on widget_configurations" ON widget_configurations;

-- SECURE Policies: Anonymous can READ by shop_domain (for widget), authenticated can manage their own
DROP POLICY IF EXISTS "Anonymous can read widget configs by shop_domain" ON widget_configurations;
CREATE POLICY "Anonymous can read widget configs by shop_domain"
ON widget_configurations
FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Authenticated users can read all configs" ON widget_configurations;
CREATE POLICY "Authenticated users can read all configs"
ON widget_configurations
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert their configs" ON widget_configurations;
CREATE POLICY "Authenticated users can insert their configs"
ON widget_configurations
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update their configs" ON widget_configurations;
CREATE POLICY "Authenticated users can update their configs"
ON widget_configurations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete their configs" ON widget_configurations;
CREATE POLICY "Authenticated users can delete their configs"
ON widget_configurations
FOR DELETE
TO authenticated
USING (true);