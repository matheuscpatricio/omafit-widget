/*
  # Fix Widget Configurations - One Config Per Product

  1. Changes
    - Remove UNIQUE constraint from shop_domain (multiple products per shop)
    - Add UNIQUE constraint on (user_id, product_id) - one config per product
    - Keep shop_domain as regular column for filtering
  
  2. Security
    - Update RLS policies to check user_id ownership
    - Anonymous users can read configs (for public widget)
    - Users can only manage their own product configs
*/

-- Remove UNIQUE constraint from shop_domain (shops can have multiple products)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'widget_configurations_shop_domain_key'
  ) THEN
    ALTER TABLE widget_configurations 
    DROP CONSTRAINT widget_configurations_shop_domain_key;
  END IF;
END $$;

-- Add UNIQUE constraint on (user_id, product_id) - one config per product
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'widget_configurations_user_product_key'
  ) THEN
    ALTER TABLE widget_configurations 
    ADD CONSTRAINT widget_configurations_user_product_key UNIQUE (user_id, product_id);
  END IF;
END $$;

-- Update index to be on user_id and product_id instead
DROP INDEX IF EXISTS idx_widget_configurations_shop_domain;
CREATE INDEX IF NOT EXISTS idx_widget_configurations_user_product 
ON widget_configurations(user_id, product_id);

-- Add index on shop_domain for filtering (not unique)
CREATE INDEX IF NOT EXISTS idx_widget_configurations_shop_domain 
ON widget_configurations(shop_domain);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anonymous can read widget configs by shop_domain" ON widget_configurations;
DROP POLICY IF EXISTS "Authenticated users can read all configs" ON widget_configurations;
DROP POLICY IF EXISTS "Authenticated users can insert their configs" ON widget_configurations;
DROP POLICY IF EXISTS "Authenticated users can update their configs" ON widget_configurations;
DROP POLICY IF EXISTS "Authenticated users can delete their configs" ON widget_configurations;

-- Keep the existing secure policy (it's correct!)
-- DROP POLICY IF EXISTS "Users can manage their own widget configurations" ON widget_configurations;
-- This policy already exists and checks: auth.uid() = user_id

-- Add anonymous read policy for public widget access
DROP POLICY IF EXISTS "Anonymous users can read widget configs" ON widget_configurations;
CREATE POLICY "Anonymous users can read widget configs"
ON widget_configurations
FOR SELECT
TO anon
USING (widget_enabled = true);

-- Add authenticated read policy
DROP POLICY IF EXISTS "Authenticated users can read widget configs" ON widget_configurations;
CREATE POLICY "Authenticated users can read widget configs"
ON widget_configurations
FOR SELECT
TO authenticated
USING (true);