/*
  # Remove Duplicate and Unused Indexes

  ## Changes
  
  ### Remove duplicate indexes
    Identical indexes waste storage and slow down writes
    - shopify_shops: keep idx_shopify_shops_shop_domain, drop idx_shopify_shops_domain
    - size_chart_entries: keep idx_size_chart_entries_size_chart_id, drop size_chart_entries_size_chart_id_idx
    - size_charts: keep idx_size_charts_shop_handle_gender, drop idx_size_charts_shop_collection_gender
    
  ### Remove unused indexes (never used in queries)
    These indexes consume space and slow down writes without providing query benefits
    Can be recreated later if needed
*/

-- Remove duplicate indexes
DROP INDEX IF EXISTS idx_shopify_shops_domain;
DROP INDEX IF EXISTS size_chart_entries_size_chart_id_idx;
DROP INDEX IF EXISTS idx_size_charts_shop_collection_gender;

-- Remove unused indexes that have no query usage
DROP INDEX IF EXISTS idx_subscriptions_user_id;
DROP INDEX IF EXISTS idx_subscriptions_status;
DROP INDEX IF EXISTS idx_channel_revenue_month;
DROP INDEX IF EXISTS idx_widget_configurations_user_id;
DROP INDEX IF EXISTS idx_partnerships_start_date;
DROP INDEX IF EXISTS size_charts_user_id_idx;
DROP INDEX IF EXISTS idx_product_analytics_user_id;
DROP INDEX IF EXISTS idx_products_created_at;
DROP INDEX IF EXISTS idx_widget_keys_user_id;
DROP INDEX IF EXISTS idx_widget_keys_key;
DROP INDEX IF EXISTS idx_widget_keys_status;
DROP INDEX IF EXISTS size_charts_user_id_gender_idx;
DROP INDEX IF EXISTS idx_size_charts_collection_gender;
DROP INDEX IF EXISTS idx_collections_user_id;
DROP INDEX IF EXISTS size_chart_entries_measurements_idx;
DROP INDEX IF EXISTS idx_channel_revenue_user_id;
DROP INDEX IF EXISTS idx_size_charts_shop_collection_gender;
DROP INDEX IF EXISTS idx_shopify_shops_user_id;
DROP INDEX IF EXISTS idx_shopify_shops_billing_status;
DROP INDEX IF EXISTS idx_usage_records_billing_month;
DROP INDEX IF EXISTS idx_shop_widget_settings_shop_domain;
DROP INDEX IF EXISTS idx_widget_configurations_user_product;
DROP INDEX IF EXISTS idx_size_charts_shop_domain;
DROP INDEX IF EXISTS idx_widget_keys_shop_domain;
DROP INDEX IF EXISTS idx_session_analytics_collection_handle;
DROP INDEX IF EXISTS idx_session_analytics_gender;
DROP INDEX IF EXISTS idx_widget_keys_public_id;
DROP INDEX IF EXISTS idx_widget_keys_is_active;