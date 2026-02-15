/*
  # Fix Shopify Widget Tables RLS Policies

  ## Changes
  
  ### Replace ALL policies with specific command policies
    Split "ALL" policies into separate SELECT, INSERT, UPDATE, DELETE policies
    This eliminates duplicate permissive SELECT policies
    
  ### Tables affected:
    - shopify_size_charts
    - shopify_widget_configurations
*/

-- ============================================================================
-- shopify_size_charts
-- ============================================================================
-- Remove existing policies
DROP POLICY IF EXISTS "Public can read shopify_size_charts" ON shopify_size_charts;
DROP POLICY IF EXISTS "Users can manage own shopify_size_charts" ON shopify_size_charts;

-- Public read access for widgets
CREATE POLICY "Public can read size charts"
  ON shopify_size_charts FOR SELECT TO authenticated, anon
  USING (true);

-- Authenticated write access via widget_keys ownership
CREATE POLICY "Users can insert size charts"
  ON shopify_size_charts FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_size_charts.shop_domain
        AND widget_keys.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update size charts"
  ON shopify_size_charts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_size_charts.shop_domain
        AND widget_keys.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_size_charts.shop_domain
        AND widget_keys.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete size charts"
  ON shopify_size_charts FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_size_charts.shop_domain
        AND widget_keys.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- shopify_widget_configurations
-- ============================================================================
-- Remove existing policies
DROP POLICY IF EXISTS "Public can read shopify_widget_configurations" ON shopify_widget_configurations;
DROP POLICY IF EXISTS "Users can manage own shopify_widget_configurations" ON shopify_widget_configurations;

-- Public read access for widgets
CREATE POLICY "Public can read widget configs"
  ON shopify_widget_configurations FOR SELECT TO authenticated, anon
  USING (true);

-- Authenticated write access via widget_keys ownership
CREATE POLICY "Users can insert widget configs"
  ON shopify_widget_configurations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_widget_configurations.shop_domain
        AND widget_keys.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update widget configs"
  ON shopify_widget_configurations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_widget_configurations.shop_domain
        AND widget_keys.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_widget_configurations.shop_domain
        AND widget_keys.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete widget configs"
  ON shopify_widget_configurations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_widget_configurations.shop_domain
        AND widget_keys.user_id = (SELECT auth.uid())
    )
  );