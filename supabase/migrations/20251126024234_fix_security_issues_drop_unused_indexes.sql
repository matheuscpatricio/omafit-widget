/*
  # Fix Security Issues - Drop Unused Indexes

  1. Security Improvements
    - Remove unused indexes to reduce maintenance overhead
    - Improve database performance by eliminating unnecessary index updates
    
  2. Indexes to Remove
    - idx_tryon_sessions_product_id
    - idx_widget_configurations_product_id
    - size_chart_entries_order_idx
    - idx_orders_customer_email
    - idx_orders_order_date
    - idx_orders_tryon_session_id
    - idx_customer_analytics_customer_email
    - idx_session_analytics_tryon_session_id
    - idx_product_analytics_product_id
    - idx_products_shopify_id
    - idx_products_fashnai_job_id
    - idx_widget_keys_public_id
    - idx_channel_revenue_date
    - idx_channel_revenue_channel_name
    - idx_financial_records_date
    - idx_financial_records_type
*/

DROP INDEX IF EXISTS idx_tryon_sessions_product_id;
DROP INDEX IF EXISTS idx_widget_configurations_product_id;
DROP INDEX IF EXISTS size_chart_entries_order_idx;
DROP INDEX IF EXISTS idx_orders_customer_email;
DROP INDEX IF EXISTS idx_orders_order_date;
DROP INDEX IF EXISTS idx_orders_tryon_session_id;
DROP INDEX IF EXISTS idx_customer_analytics_customer_email;
DROP INDEX IF EXISTS idx_session_analytics_tryon_session_id;
DROP INDEX IF EXISTS idx_product_analytics_product_id;
DROP INDEX IF EXISTS idx_products_shopify_id;
DROP INDEX IF EXISTS idx_products_fashnai_job_id;
DROP INDEX IF EXISTS idx_widget_keys_public_id;
DROP INDEX IF EXISTS idx_channel_revenue_date;
DROP INDEX IF EXISTS idx_channel_revenue_channel_name;
DROP INDEX IF EXISTS idx_financial_records_date;
DROP INDEX IF EXISTS idx_financial_records_type;