/*
  # Optimize RLS Policies - Auth UID Initialization

  ## Changes
  
  ### Replace auth.uid() with (select auth.uid()) for performance
    When auth.uid() is used directly, it's re-evaluated for each row
    Using (select auth.uid()) evaluates once and reuses the result
    
  ### Tables affected:
    - tryon_sessions: "Users can read own sessions"
    - user_measurements: "Users can read own measurements"
    - shopify_usage_records: 2 policies
    - collections: 4 policies
    
  ### Performance Impact
    This optimization can significantly improve query performance at scale
*/

-- tryon_sessions
DROP POLICY IF EXISTS "Users can read own sessions" ON tryon_sessions;

CREATE POLICY "Users can read own sessions"
  ON tryon_sessions FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- user_measurements
DROP POLICY IF EXISTS "Users can read own measurements" ON user_measurements;

CREATE POLICY "Users can read own measurements"
  ON user_measurements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_analytics sa
      WHERE sa.tryon_session_id = user_measurements.tryon_session_id
      AND sa.user_id = (select auth.uid())
    )
  );

-- shopify_usage_records
DROP POLICY IF EXISTS "Users can insert own usage records" ON shopify_usage_records;
DROP POLICY IF EXISTS "Users can view own usage records" ON shopify_usage_records;

CREATE POLICY "Users can insert own usage records"
  ON shopify_usage_records FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopify_shops
      WHERE shopify_shops.shop_domain = shopify_usage_records.shop_domain
      AND shopify_shops.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can view own usage records"
  ON shopify_usage_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_shops
      WHERE shopify_shops.shop_domain = shopify_usage_records.shop_domain
      AND shopify_shops.user_id = (select auth.uid())
    )
  );

-- collections
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert own collections" ON collections;
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
DROP POLICY IF EXISTS "Users can view own collections" ON collections;

CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);