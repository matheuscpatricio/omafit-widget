/*
  # Add Missing Foreign Key Indexes

  1. Changes
    - Add indexes for all foreign keys that don't have covering indexes
    - Improves JOIN performance and foreign key constraint checking
  
  2. Indexes Added
    - `idx_channel_revenue_user_id` on channel_revenue(user_id)
    - `idx_collections_user_id` on collections(user_id)
    - `idx_image_user_id` on image(user_id)
    - `idx_nuvemshop_credentials_user_id` on nuvemshop_credentials(user_id)
    - `idx_orders_tryon_session_id` on orders(tryon_session_id)
    - `idx_product_analytics_user_id` on product_analytics(user_id)
    - `idx_shopify_shops_user_id` on shopify_shops(user_id)
    - `idx_size_chart_entries_size_chart_id` on size_chart_entries(size_chart_id)
    - `idx_size_charts_user_id` on size_charts(user_id)
    - `idx_subscriptions_user_id` on subscriptions(user_id)
    - `idx_widget_keys_user_id` on widget_keys(user_id)
  
  3. Performance Benefits
    - Faster JOINs on foreign key columns
    - Improved foreign key constraint validation
    - Better query optimization for filtering by foreign keys
*/

-- Create indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_channel_revenue_user_id ON channel_revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_image_user_id ON image(user_id);
CREATE INDEX IF NOT EXISTS idx_nuvemshop_credentials_user_id ON nuvemshop_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_tryon_session_id ON orders(tryon_session_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_user_id ON product_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_shops_user_id ON shopify_shops(user_id);
CREATE INDEX IF NOT EXISTS idx_size_chart_entries_size_chart_id ON size_chart_entries(size_chart_id);
CREATE INDEX IF NOT EXISTS idx_size_charts_user_id ON size_charts(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_keys_user_id ON widget_keys(user_id);