/*
  # Optimize RLS Policies for Performance

  1. Performance Optimization
    - Replace all `auth.uid()` with `(select auth.uid())` in RLS policies
    - This prevents re-evaluation for each row, improving query performance at scale

  2. Security Fixes
    - Add missing RLS policies for tables without policies
    - Add primary key to image table
    - Fix function search_path issues

  3. Tables Updated
    - shopify_stores
    - widget_configurations
    - stripe_customers
    - stripe_orders
    - stripe_subscriptions
    - api_config
    - orders
    - customer_analytics
    - session_analytics
    - product_analytics
    - widget_keys
    - users
    - products
    - subscriptions
    - size_charts
    - size_chart_entries
    - credit_logs
    - generated_images
    - image
*/

-- ============================================================================
-- 1. OPTIMIZE EXISTING RLS POLICIES
-- ============================================================================

-- shopify_stores
DROP POLICY IF EXISTS "Users can manage their own Shopify stores" ON public.shopify_stores;
CREATE POLICY "Users can manage their own Shopify stores"
  ON public.shopify_stores
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- widget_configurations
DROP POLICY IF EXISTS "Users can manage their own widget configurations" ON public.widget_configurations;
CREATE POLICY "Users can manage their own widget configurations"
  ON public.widget_configurations
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- stripe_customers
DROP POLICY IF EXISTS "Users can view their own customer data" ON public.stripe_customers;
CREATE POLICY "Users can view their own customer data"
  ON public.stripe_customers
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- stripe_orders
DROP POLICY IF EXISTS "Users can view their own order data" ON public.stripe_orders;
CREATE POLICY "Users can view their own order data"
  ON public.stripe_orders
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- stripe_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription data" ON public.stripe_subscriptions;
CREATE POLICY "Users can view their own subscription data"
  ON public.stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- api_config
DROP POLICY IF EXISTS "Users can manage their own API configs" ON public.api_config;
CREATE POLICY "Users can manage their own API configs"
  ON public.api_config
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- customer_analytics
DROP POLICY IF EXISTS "Users can view their own customer analytics" ON public.customer_analytics;
DROP POLICY IF EXISTS "Users can insert their own customer analytics" ON public.customer_analytics;
DROP POLICY IF EXISTS "Users can update their own customer analytics" ON public.customer_analytics;

CREATE POLICY "Users can view their own customer analytics"
  ON public.customer_analytics
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own customer analytics"
  ON public.customer_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own customer analytics"
  ON public.customer_analytics
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- session_analytics
DROP POLICY IF EXISTS "Users can view their own session analytics" ON public.session_analytics;
DROP POLICY IF EXISTS "Users can insert their own session analytics" ON public.session_analytics;

CREATE POLICY "Users can view their own session analytics"
  ON public.session_analytics
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own session analytics"
  ON public.session_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- product_analytics
DROP POLICY IF EXISTS "Users can view their own product analytics" ON public.product_analytics;
DROP POLICY IF EXISTS "Users can insert their own product analytics" ON public.product_analytics;
DROP POLICY IF EXISTS "Users can update their own product analytics" ON public.product_analytics;

CREATE POLICY "Users can view their own product analytics"
  ON public.product_analytics
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own product analytics"
  ON public.product_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own product analytics"
  ON public.product_analytics
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- users
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

-- products
DROP POLICY IF EXISTS "products_select_own" ON public.products;
DROP POLICY IF EXISTS "products_insert_own" ON public.products;
DROP POLICY IF EXISTS "products_update_own" ON public.products;
DROP POLICY IF EXISTS "products_delete_own" ON public.products;

CREATE POLICY "products_select_own"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "products_insert_own"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "products_update_own"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "products_delete_own"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- subscriptions
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create own subscription" ON public.subscriptions;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can create own subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- widget_keys
DROP POLICY IF EXISTS "Users can view own widget keys" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can update own widget keys" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can insert own widget keys" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can delete own widget keys" ON public.widget_keys;

CREATE POLICY "Users can view own widget keys"
  ON public.widget_keys
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own widget keys"
  ON public.widget_keys
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own widget keys"
  ON public.widget_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own widget keys"
  ON public.widget_keys
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- size_charts
DROP POLICY IF EXISTS "Users can view own size charts" ON public.size_charts;
DROP POLICY IF EXISTS "Users can insert own size charts" ON public.size_charts;
DROP POLICY IF EXISTS "Users can update own size charts" ON public.size_charts;
DROP POLICY IF EXISTS "Users can delete own size charts" ON public.size_charts;

CREATE POLICY "Users can view own size charts"
  ON public.size_charts
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own size charts"
  ON public.size_charts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own size charts"
  ON public.size_charts
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own size charts"
  ON public.size_charts
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- size_chart_entries (through size_chart ownership)
DROP POLICY IF EXISTS "Users can view own size chart entries" ON public.size_chart_entries;
DROP POLICY IF EXISTS "Users can insert own size chart entries" ON public.size_chart_entries;
DROP POLICY IF EXISTS "Users can update own size chart entries" ON public.size_chart_entries;
DROP POLICY IF EXISTS "Users can delete own size chart entries" ON public.size_chart_entries;

CREATE POLICY "Users can view own size chart entries"
  ON public.size_chart_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own size chart entries"
  ON public.size_chart_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update own size chart entries"
  ON public.size_chart_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete own size chart entries"
  ON public.size_chart_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- 2. ADD MISSING RLS POLICIES
-- ============================================================================

-- credit_logs
CREATE POLICY "Users can view own credit logs"
  ON public.credit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Service role can manage credit logs"
  ON public.credit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- generated_images
CREATE POLICY "Users can view own generated images"
  ON public.generated_images
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own generated images"
  ON public.generated_images
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Service role can manage generated images"
  ON public.generated_images
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- image table - ensure primary key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'image' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.image ADD PRIMARY KEY (id);
  END IF;
END $$;

-- image policies - table doesn't have user_id, allow authenticated users to read
CREATE POLICY "Authenticated users can view images"
  ON public.image
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage images"
  ON public.image
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. FIX FUNCTION SEARCH_PATH
-- ============================================================================

-- Update set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update generate_widget_key function
CREATE OR REPLACE FUNCTION public.generate_widget_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key text;
  key_exists boolean;
BEGIN
  LOOP
    new_key := 'wgt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);
    SELECT EXISTS(SELECT 1 FROM widget_keys WHERE key = new_key) INTO key_exists;
    EXIT WHEN NOT key_exists;
  END LOOP;
  RETURN new_key;
END;
$$;

-- Update generate_widget_public_id function
CREATE OR REPLACE FUNCTION public.generate_widget_public_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_public_id text;
  id_exists boolean;
BEGIN
  LOOP
    new_public_id := 'wgt_pub_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
    SELECT EXISTS(SELECT 1 FROM widget_keys WHERE public_id = new_public_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_public_id;
END;
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
