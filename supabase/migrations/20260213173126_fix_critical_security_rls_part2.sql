/*
  # Fix Critical Security Issues - Part 2

  ## Changes
  
  ### Fix always-true policies for shop-related tables
    - shop_widget_settings
    - shopify_size_charts
    - shopify_widget_configurations
    - size_chart_entries (remove "allow all")
    - size_charts (remove "allow all")
    - widget_configurations (remove "allow all")
*/

-- shop_widget_settings
DROP POLICY IF EXISTS "Authenticated users can delete shop settings" ON shop_widget_settings;
DROP POLICY IF EXISTS "Authenticated users can insert shop settings" ON shop_widget_settings;
DROP POLICY IF EXISTS "Authenticated users can update shop settings" ON shop_widget_settings;

CREATE POLICY "Users can manage shop settings via widget_keys"
  ON shop_widget_settings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shop_widget_settings.shop_domain
      AND widget_keys.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shop_widget_settings.shop_domain
      AND widget_keys.user_id = (select auth.uid())
    )
  );

-- shopify_size_charts
DROP POLICY IF EXISTS "Allow public access to shopify_size_charts" ON shopify_size_charts;

CREATE POLICY "Public can read shopify_size_charts"
  ON shopify_size_charts FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Users can manage own shopify_size_charts"
  ON shopify_size_charts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_size_charts.shop_domain
      AND widget_keys.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_size_charts.shop_domain
      AND widget_keys.user_id = (select auth.uid())
    )
  );

-- shopify_widget_configurations
DROP POLICY IF EXISTS "Allow public access to shopify_widget_configurations" ON shopify_widget_configurations;

CREATE POLICY "Public can read shopify_widget_configurations"
  ON shopify_widget_configurations FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Users can manage own shopify_widget_configurations"
  ON shopify_widget_configurations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_widget_configurations.shop_domain
      AND widget_keys.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM widget_keys
      WHERE widget_keys.shop_domain = shopify_widget_configurations.shop_domain
      AND widget_keys.user_id = (select auth.uid())
    )
  );

-- size_chart_entries: Remove "allow all" policy
DROP POLICY IF EXISTS "Allow all operations on size_chart_entries" ON size_chart_entries;

-- size_charts: Remove "allow all" policy  
DROP POLICY IF EXISTS "Allow all operations on size_charts" ON size_charts;

-- widget_configurations: Remove "allow all" policy
DROP POLICY IF EXISTS "Allow all operations on widget_configurations" ON widget_configurations;