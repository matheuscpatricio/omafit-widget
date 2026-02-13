/*
  # Add Missing User ID Foreign Key Indexes

  ## Changes
  
  ### Add indexes on user_id foreign keys for optimal performance
    Foreign keys without indexes cause full table scans during joins and cascading operations
    
    Tables affected:
    - channel_revenue.user_id
    - collections.user_id
    - product_analytics.user_id
    - shopify_shops.user_id
    - size_charts.user_id
    - subscriptions.user_id
    - widget_keys.user_id
    
  ### Performance Impact
    These indexes will significantly improve:
    - JOIN performance with users table
    - RLS policy evaluation speed
    - CASCADE operations on user deletion
*/

-- Add indexes on user_id foreign keys
CREATE INDEX IF NOT EXISTS idx_channel_revenue_user_id 
  ON channel_revenue(user_id);

CREATE INDEX IF NOT EXISTS idx_collections_user_id 
  ON collections(user_id);

CREATE INDEX IF NOT EXISTS idx_product_analytics_user_id 
  ON product_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_shopify_shops_user_id 
  ON shopify_shops(user_id);

CREATE INDEX IF NOT EXISTS idx_size_charts_user_id 
  ON size_charts(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
  ON subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_widget_keys_user_id 
  ON widget_keys(user_id);