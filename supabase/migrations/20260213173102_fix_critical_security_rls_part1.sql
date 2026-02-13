/*
  # Fix Critical Security Issues - Part 1

  ## Changes
  
  ### 1. Enable RLS on shopify_shops
  ### 2. Fix policies with unrestricted access for tables WITH user_id
  ### 3. Remove always-true policies for tables WITHOUT user_id (will block all access - safer)
*/

-- 1. ENABLE RLS ON shopify_shops
ALTER TABLE shopify_shops ENABLE ROW LEVEL SECURITY;

-- 2. FIX POLICIES FOR TABLES WITH user_id COLUMN

-- channel_revenue
DROP POLICY IF EXISTS "Allow delete channel revenue" ON channel_revenue;
DROP POLICY IF EXISTS "Allow insert channel revenue" ON channel_revenue;
DROP POLICY IF EXISTS "Allow update channel revenue" ON channel_revenue;

CREATE POLICY "Users can manage own channel revenue"
  ON channel_revenue FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- credit_logs
DROP POLICY IF EXISTS "Service can insert credit logs" ON credit_logs;

CREATE POLICY "Users can manage own credit logs"
  ON credit_logs FOR ALL TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- customer_analytics
DROP POLICY IF EXISTS "Allow delete customer analytics" ON customer_analytics;

CREATE POLICY "Users can delete own customer analytics"
  ON customer_analytics FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- orders
DROP POLICY IF EXISTS "Allow delete orders" ON orders;

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- product_analytics
DROP POLICY IF EXISTS "Allow delete product analytics" ON product_analytics;

CREATE POLICY "Users can delete own product analytics"
  ON product_analytics FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- session_analytics
DROP POLICY IF EXISTS "Allow delete session analytics" ON session_analytics;

CREATE POLICY "Users can delete own session analytics"
  ON session_analytics FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- subscriptions
DROP POLICY IF EXISTS "Allow delete subscriptions" ON subscriptions;

CREATE POLICY "Users can delete own subscriptions"
  ON subscriptions FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- 3. REMOVE ALWAYS-TRUE POLICIES FOR TABLES WITHOUT user_id
-- These tables will be blocked until proper ownership columns are added

-- financial_records (no user_id - cannot determine ownership)
DROP POLICY IF EXISTS "Allow delete financial records" ON financial_records;
DROP POLICY IF EXISTS "Allow insert financial records" ON financial_records;
DROP POLICY IF EXISTS "Allow update financial records" ON financial_records;

-- image (no user_id - cannot determine ownership)
DROP POLICY IF EXISTS "Service can manage images" ON image;

-- partnerships (no user_id - cannot determine ownership)
DROP POLICY IF EXISTS "Authenticated users can delete partnerships" ON partnerships;
DROP POLICY IF EXISTS "Authenticated users can insert partnerships" ON partnerships;
DROP POLICY IF EXISTS "Authenticated users can update partnerships" ON partnerships;

-- users (has 'id' column)
DROP POLICY IF EXISTS "Allow delete via function" ON users;

CREATE POLICY "Users can delete own account"
  ON users FOR DELETE TO authenticated
  USING ((select auth.uid()) = id);