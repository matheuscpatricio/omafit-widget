/*
  # Fix Security Issues - Consolidate Duplicate RLS Policies

  1. Changes
    - Remove duplicate RLS policies that have the same role and action
    - Keep only one policy per role/action combination
  
  2. Tables Affected
    - session_analytics
    - shopify_shops
    - size_charts
    - tryon_sessions
    - user_measurements
    - widget_configurations
  
  3. Security Notes
    - Ensures cleaner policy management
    - Reduces confusion from multiple policies with same permissions
*/

-- session_analytics: Keep newer policies, drop old ones
DROP POLICY IF EXISTS "Public can insert session analytics" ON session_analytics;
DROP POLICY IF EXISTS "Users can delete own session analytics" ON session_analytics;
DROP POLICY IF EXISTS "Users can insert their own session analytics" ON session_analytics;
DROP POLICY IF EXISTS "Users can view their own session analytics" ON session_analytics;

-- shopify_shops: Keep consolidated policies, drop old ones
DROP POLICY IF EXISTS "Public and users can view shops" ON shopify_shops;

-- size_charts: Keep newer policies, drop old ones  
DROP POLICY IF EXISTS "Public read access for size charts via widget" ON size_charts;
DROP POLICY IF EXISTS "Users can delete own size charts" ON size_charts;
DROP POLICY IF EXISTS "Users can insert own size charts" ON size_charts;
DROP POLICY IF EXISTS "Users can view own size charts" ON size_charts;
DROP POLICY IF EXISTS "Users can update own size charts" ON size_charts;

-- tryon_sessions: Keep newer policies, drop old ones
DROP POLICY IF EXISTS "Public can insert tryon sessions" ON tryon_sessions;
DROP POLICY IF EXISTS "Users can read own sessions" ON tryon_sessions;

-- user_measurements: Keep newer policies, drop old ones
DROP POLICY IF EXISTS "Users can read own measurements" ON user_measurements;

-- widget_configurations: Keep newer policies, drop old ones
DROP POLICY IF EXISTS "Anonymous users can read widget configs" ON widget_configurations;
DROP POLICY IF EXISTS "Users can manage their own widget configurations" ON widget_configurations;