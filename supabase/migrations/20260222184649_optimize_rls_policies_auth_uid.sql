/*
  # Optimize RLS Policies - Use (select auth.uid())

  1. Changes
    - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
    - This prevents re-evaluation of auth.uid() for each row
    - Significantly improves query performance at scale
  
  2. Tables Optimized
    - session_analytics
    - size_charts
    - tryon_sessions
    - user_measurements
    - widget_configurations
  
  3. Performance Benefits
    - auth.uid() is evaluated once per query instead of once per row
    - Reduces CPU usage on large queries
    - Improves response times for queries returning many rows
*/

-- =============================================
-- SESSION_ANALYTICS: Optimize auth.uid() calls
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can insert session analytics" ON session_analytics;
DROP POLICY IF EXISTS "Users can view own session analytics" ON session_analytics;
DROP POLICY IF EXISTS "Users can update own session analytics" ON session_analytics;
DROP POLICY IF EXISTS "Users can delete own session analytics" ON session_analytics;

CREATE POLICY "Authenticated users can insert session analytics"
  ON session_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can view own session analytics"
  ON session_analytics FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own session analytics"
  ON session_analytics FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own session analytics"
  ON session_analytics FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =============================================
-- SIZE_CHARTS: Optimize auth.uid() calls
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can insert own size charts" ON size_charts;
DROP POLICY IF EXISTS "Authenticated users can update own size charts" ON size_charts;
DROP POLICY IF EXISTS "Authenticated users can delete own size charts" ON size_charts;

CREATE POLICY "Authenticated users can insert own size charts"
  ON size_charts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update own size charts"
  ON size_charts FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete own size charts"
  ON size_charts FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =============================================
-- TRYON_SESSIONS: Optimize auth.uid() calls
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can insert tryon sessions" ON tryon_sessions;
DROP POLICY IF EXISTS "Authenticated users can view own tryon sessions" ON tryon_sessions;
DROP POLICY IF EXISTS "Authenticated users can update own tryon sessions" ON tryon_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete own tryon sessions" ON tryon_sessions;

CREATE POLICY "Authenticated users can insert tryon sessions"
  ON tryon_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can view own tryon sessions"
  ON tryon_sessions FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update own tryon sessions"
  ON tryon_sessions FOR UPDATE
  TO authenticated
  USING (user_id IS NULL OR user_id = (select auth.uid()))
  WITH CHECK (user_id IS NULL OR user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete own tryon sessions"
  ON tryon_sessions FOR DELETE
  TO authenticated
  USING (user_id IS NULL OR user_id = (select auth.uid()));

-- =============================================
-- USER_MEASUREMENTS: Optimize auth.uid() calls
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view measurements from own sessions" ON user_measurements;

CREATE POLICY "Authenticated users can view measurements from own sessions"
  ON user_measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tryon_sessions
      WHERE tryon_sessions.id = user_measurements.tryon_session_id
        AND (tryon_sessions.user_id IS NULL OR tryon_sessions.user_id = (select auth.uid()))
    )
  );

-- =============================================
-- WIDGET_CONFIGURATIONS: Optimize auth.uid() calls
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can insert own widget configurations" ON widget_configurations;
DROP POLICY IF EXISTS "Authenticated users can update own widget configurations" ON widget_configurations;
DROP POLICY IF EXISTS "Authenticated users can delete own widget configurations" ON widget_configurations;

CREATE POLICY "Authenticated users can insert own widget configurations"
  ON widget_configurations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can update own widget configurations"
  ON widget_configurations FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Authenticated users can delete own widget configurations"
  ON widget_configurations FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));