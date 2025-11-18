/*
  # Optimize RLS Policies and Fix Security Issues

  1. Performance Optimization
    - Replace all `auth.uid()` with `(select auth.uid())` in RLS policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Schema Fixes
    - Add primary key to `public.image` table
    - Create RLS policies for tables without policies

  3. Security Improvements
    - Ensure all tables with RLS enabled have appropriate policies
    - Maintain security while improving performance
*/

-- Drop and recreate all RLS policies with optimized auth function calls

-- api_config table
DROP POLICY IF EXISTS "Users can manage their own API configs" ON public.api_config;
CREATE POLICY "Users can manage their own API configs"
  ON public.api_config
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()));

-- customer_analytics table
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

-- orders table
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

-- product_analytics table
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

-- products table
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

-- session_analytics table
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

-- shopify_stores table
DROP POLICY IF EXISTS "Users can manage their own Shopify stores" ON public.shopify_stores;

CREATE POLICY "Users can manage their own Shopify stores"
  ON public.shopify_stores
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()));

-- size_chart_entries table
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
      SELECT 1 FROM public.size_charts
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
      SELECT 1 FROM public.size_charts
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
      SELECT 1 FROM public.size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.size_charts
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
      SELECT 1 FROM public.size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = (select auth.uid())
    )
  );

-- size_charts table
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

-- stripe_customers table
DROP POLICY IF EXISTS "Users can view their own customer data" ON public.stripe_customers;

CREATE POLICY "Users can view their own customer data"
  ON public.stripe_customers
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- stripe_orders table
DROP POLICY IF EXISTS "Users can view their own order data" ON public.stripe_orders;

CREATE POLICY "Users can view their own order data"
  ON public.stripe_orders
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- stripe_subscriptions table
DROP POLICY IF EXISTS "Users can view their own subscription data" ON public.stripe_subscriptions;

CREATE POLICY "Users can view their own subscription data"
  ON public.stripe_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- subscriptions table
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create own subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- users table
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- widget_configurations table
DROP POLICY IF EXISTS "Users can manage their own widget configurations" ON public.widget_configurations;

CREATE POLICY "Users can manage their own widget configurations"
  ON public.widget_configurations
  FOR ALL
  TO authenticated
  USING (user_id = (select auth.uid()));

-- widget_keys table
DROP POLICY IF EXISTS "Users can view own widget keys" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can insert own widget keys" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can update own widget keys" ON public.widget_keys;
DROP POLICY IF EXISTS "Users can delete own widget keys" ON public.widget_keys;

CREATE POLICY "Users can view own widget keys"
  ON public.widget_keys
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own widget keys"
  ON public.widget_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own widget keys"
  ON public.widget_keys
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own widget keys"
  ON public.widget_keys
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Fix primary key for image table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.image'::regclass
    AND contype = 'p'
  ) THEN
    ALTER TABLE public.image ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Create RLS policies for tables without policies

-- credit_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'credit_logs'
  ) THEN
    CREATE POLICY "Users can view own credit logs"
      ON public.credit_logs
      FOR SELECT
      TO authenticated
      USING (user_id = (select auth.uid()));

    CREATE POLICY "Users can insert own credit logs"
      ON public.credit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;

-- generated_images table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'generated_images'
  ) THEN
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
  END IF;
END $$;

-- image table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'image'
  ) THEN
    CREATE POLICY "Anyone can view images"
      ON public.image
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "Users can insert own images"
      ON public.image
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = (select auth.uid()));
  END IF;
END $$;
