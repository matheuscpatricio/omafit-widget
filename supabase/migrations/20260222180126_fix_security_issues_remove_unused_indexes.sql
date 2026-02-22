/*
  # Fix Security Issues - Remove Unused Indexes

  1. Changes
    - Drop unused indexes that are not being utilized by queries
    - These indexes consume storage and slow down write operations without providing query benefits
  
  2. Indexes Removed
    - `idx_size_charts_shop_domain` - not used
    - `idx_size_chart_entries_size_chart_id` - not used
    - `idx_image_user_id` - not used
    - `idx_nuvemshop_credentials_user_id` - not used
    - `idx_orders_tryon_session_id` - not used
    - `idx_channel_revenue_user_id` - not used
    - `idx_collections_user_id` - not used
    - `idx_product_analytics_user_id` - not used
    - `idx_shopify_shops_user_id` - not used
    - `idx_size_charts_user_id` - not used
    - `idx_subscriptions_user_id` - not used
    - `idx_widget_keys_user_id` - not used
    - `idx_size_charts_shop_collection_gender` - duplicate of idx_size_charts_shop_handle_gender
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_size_charts_shop_domain;
DROP INDEX IF EXISTS idx_size_chart_entries_size_chart_id;
DROP INDEX IF EXISTS idx_image_user_id;
DROP INDEX IF EXISTS idx_nuvemshop_credentials_user_id;
DROP INDEX IF EXISTS idx_orders_tryon_session_id;
DROP INDEX IF EXISTS idx_channel_revenue_user_id;
DROP INDEX IF EXISTS idx_collections_user_id;
DROP INDEX IF EXISTS idx_product_analytics_user_id;
DROP INDEX IF EXISTS idx_shopify_shops_user_id;
DROP INDEX IF EXISTS idx_size_charts_user_id;
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_widget_keys_user_id;

-- Drop duplicate index (keeping idx_size_charts_shop_handle_gender)
DROP INDEX IF EXISTS idx_size_charts_shop_collection_gender;