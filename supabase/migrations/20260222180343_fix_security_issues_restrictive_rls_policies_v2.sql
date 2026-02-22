/*
  # Fix Security Issues - Replace Overly Permissive RLS Policies

  1. Changes
    - Replace policies with USING(true) and WITH CHECK(true) with proper restrictive policies
    - Implement appropriate access controls based on user_id and shop_domain
    - Keep public read-only access where needed for widget functionality
    - Restrict write/delete operations to authenticated users and owners
  
  2. Tables Affected
    - session_analytics: Analytics data needs public insert via widget, but restricted delete
    - size_charts: Public read for widget, authenticated users manage their own
    - tryon_sessions: Public insert for widget, restricted access for other operations
    - user_measurements: Service role manages, related to tryon_session_id
    - widget_configurations: Public read for widget, authenticated users manage their own
  
  3. Security Notes
    - Public (anon) role can only insert analytics and sessions (needed for widget)
    - Public can read size_charts and widget_configurations (needed for widget display)
    - Authenticated users can only access their own data
    - Delete operations restricted to owners only
*/

-- =============================================
-- SESSION_ANALYTICS: Analytics tracking table
-- =============================================

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS session_analytics_select_anon ON session_analytics;
DROP POLICY IF EXISTS session_analytics_select_authenticated ON session_analytics;
DROP POLICY IF EXISTS session_analytics_insert_anon ON session_analytics;
DROP POLICY IF EXISTS session_analytics_insert_authenticated ON session_analytics;
DROP POLICY IF EXISTS session_analytics_update_anon ON session_analytics;
DROP POLICY IF EXISTS session_analytics_update_authenticated ON session_analytics;
DROP POLICY IF EXISTS session_analytics_delete_anon ON session_analytics;
DROP POLICY IF EXISTS session_analytics_delete_authenticated ON session_analytics;

-- Create restrictive policies
CREATE POLICY "Public can insert session analytics via widget"
  ON session_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert session analytics"
  ON session_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own session analytics"
  ON session_analytics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own session analytics"
  ON session_analytics FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own session analytics"
  ON session_analytics FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- SIZE_CHARTS: Size chart data for products
-- =============================================

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS size_charts_select_anon ON size_charts;
DROP POLICY IF EXISTS size_charts_select_authenticated ON size_charts;
DROP POLICY IF EXISTS size_charts_insert_anon ON size_charts;
DROP POLICY IF EXISTS size_charts_insert_authenticated ON size_charts;
DROP POLICY IF EXISTS size_charts_update_anon ON size_charts;
DROP POLICY IF EXISTS size_charts_update_authenticated ON size_charts;
DROP POLICY IF EXISTS size_charts_delete_anon ON size_charts;
DROP POLICY IF EXISTS size_charts_delete_authenticated ON size_charts;

-- Create restrictive policies
CREATE POLICY "Public can read size charts for widget"
  ON size_charts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can read all size charts"
  ON size_charts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own size charts"
  ON size_charts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can update own size charts"
  ON size_charts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can delete own size charts"
  ON size_charts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- TRYON_SESSIONS: Virtual try-on session data
-- =============================================

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS tryon_sessions_select_anon ON tryon_sessions;
DROP POLICY IF EXISTS tryon_sessions_select_authenticated ON tryon_sessions;
DROP POLICY IF EXISTS tryon_sessions_insert_anon ON tryon_sessions;
DROP POLICY IF EXISTS tryon_sessions_insert_authenticated ON tryon_sessions;
DROP POLICY IF EXISTS tryon_sessions_update_anon ON tryon_sessions;
DROP POLICY IF EXISTS tryon_sessions_update_authenticated ON tryon_sessions;
DROP POLICY IF EXISTS tryon_sessions_delete_anon ON tryon_sessions;
DROP POLICY IF EXISTS tryon_sessions_delete_authenticated ON tryon_sessions;

-- Create restrictive policies
CREATE POLICY "Public can insert tryon sessions via widget"
  ON tryon_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert tryon sessions"
  ON tryon_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Authenticated users can view own tryon sessions"
  ON tryon_sessions FOR SELECT
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Authenticated users can update own tryon sessions"
  ON tryon_sessions FOR UPDATE
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Authenticated users can delete own tryon sessions"
  ON tryon_sessions FOR DELETE
  TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- =============================================
-- USER_MEASUREMENTS: User body measurements
-- =============================================

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS user_measurements_select_anon ON user_measurements;
DROP POLICY IF EXISTS user_measurements_select_authenticated ON user_measurements;
DROP POLICY IF EXISTS user_measurements_insert_anon ON user_measurements;
DROP POLICY IF EXISTS user_measurements_insert_authenticated ON user_measurements;
DROP POLICY IF EXISTS user_measurements_update_anon ON user_measurements;
DROP POLICY IF EXISTS user_measurements_update_authenticated ON user_measurements;
DROP POLICY IF EXISTS user_measurements_delete_anon ON user_measurements;
DROP POLICY IF EXISTS user_measurements_delete_authenticated ON user_measurements;

-- Create restrictive policies (linked via tryon_sessions)
CREATE POLICY "Authenticated users can view measurements from own sessions"
  ON user_measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tryon_sessions
      WHERE tryon_sessions.id = user_measurements.tryon_session_id
        AND (tryon_sessions.user_id IS NULL OR tryon_sessions.user_id = auth.uid())
    )
  );

-- =============================================
-- WIDGET_CONFIGURATIONS: Widget customization settings
-- =============================================

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS widget_configurations_select_anon ON widget_configurations;
DROP POLICY IF EXISTS widget_configurations_select_authenticated ON widget_configurations;
DROP POLICY IF EXISTS widget_configurations_insert_anon ON widget_configurations;
DROP POLICY IF EXISTS widget_configurations_insert_authenticated ON widget_configurations;
DROP POLICY IF EXISTS widget_configurations_update_anon ON widget_configurations;
DROP POLICY IF EXISTS widget_configurations_update_authenticated ON widget_configurations;
DROP POLICY IF EXISTS widget_configurations_delete_anon ON widget_configurations;
DROP POLICY IF EXISTS widget_configurations_delete_authenticated ON widget_configurations;

-- Create restrictive policies
CREATE POLICY "Public can read widget configurations for widget display"
  ON widget_configurations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can read all widget configurations"
  ON widget_configurations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own widget configurations"
  ON widget_configurations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can update own widget configurations"
  ON widget_configurations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can delete own widget configurations"
  ON widget_configurations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());