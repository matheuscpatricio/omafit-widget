/*
  # Consolidate Duplicate RLS Policies

  ## Changes
  
  ### Remove redundant permissive policies for the same role and action
    Multiple permissive policies for the same action create OR conditions
    Keep only the necessary policies and remove redundant ones
    
  ### Tables affected:
    - channel_revenue: remove "Allow read all channel revenue"
    - credit_logs: remove "Users can view own credit logs" (covered by manage)
    - shop_widget_settings: remove "Authenticated users can read shop settings"
    - shopify_size_charts: keep both (different purposes - public read + user manage)
    - shopify_stores: keep both (different purposes - public read + user manage)
    - shopify_widget_configurations: keep both (different purposes)
    - widget_configurations: remove "Authenticated users can read widget configs"
*/

-- channel_revenue: Remove overly broad read policy
DROP POLICY IF EXISTS "Allow read all channel revenue" ON channel_revenue;

-- credit_logs: The "manage" policy already covers SELECT
-- Remove redundant view policy
DROP POLICY IF EXISTS "Users can view own credit logs" ON credit_logs;

-- shop_widget_settings: Remove generic authenticated read
-- The widget_keys-based policy is more specific and secure
DROP POLICY IF EXISTS "Authenticated users can read shop settings" ON shop_widget_settings;

-- widget_configurations: Remove generic authenticated read
-- The specific user management policy covers SELECT
DROP POLICY IF EXISTS "Authenticated users can read widget configs" ON widget_configurations;

-- Note: The following policies are kept because they serve different purposes:
-- - shopify_shops: "Public can view by public_id" (anon access) + "Users can view own" (authenticated access)
-- - shopify_size_charts: "Public can read" (widget access) + "Users can manage own" (authenticated CRUD)
-- - shopify_stores: "Public can view by public_id" (anon access) + "Users can view own" (authenticated access)
-- - shopify_widget_configurations: "Public can read" (widget access) + "Users can manage own" (authenticated CRUD)