/*
  # Remove Duplicate RLS Policies

  ## Changes
  
  ### Remove duplicate permissive policies
    Multiple permissive policies for the same role and action create confusion
    Keep the most specific/restrictive ones
    
  ### Tables affected:
    - shopify_shops (2 SELECT policies for authenticated)
    - shopify_stores (2 SELECT policies for authenticated)
    - widget_keys (3 SELECT policies creating overlap)
*/

-- shopify_shops: Keep both SELECT policies as they serve different purposes
-- "Public can view shop info by public_id" - allows public access by public_id
-- "Users can view own shops" - allows users to view their own shops
-- These are both needed for different use cases

-- shopify_stores: Remove the ALL policy, keep separate specific policies
DROP POLICY IF EXISTS "Users can manage their own Shopify stores" ON shopify_stores;

-- Recreate as specific policies
CREATE POLICY "Users can insert own shopify stores"
  ON shopify_stores FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own shopify stores"
  ON shopify_stores FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own shopify stores"
  ON shopify_stores FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can view own shopify stores"
  ON shopify_stores FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- widget_keys: Consolidate SELECT policies
-- Remove duplicates, keep the most appropriate ones
DROP POLICY IF EXISTS "Allow public read on widget_keys" ON widget_keys;
DROP POLICY IF EXISTS "Public can validate active widgets" ON widget_keys;

-- Keep "Users can view own widget keys" for authenticated users
-- Add proper anon policy for widget validation
CREATE POLICY "Anon can validate active widgets by public_id"
  ON widget_keys FOR SELECT TO anon
  USING (is_active = true AND public_id IS NOT NULL);