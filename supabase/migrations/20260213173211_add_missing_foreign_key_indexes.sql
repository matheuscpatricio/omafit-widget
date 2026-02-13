/*
  # Add Missing Foreign Key Indexes

  ## Changes
  
  ### Add indexes on unindexed foreign keys for performance
    - nuvemshop_credentials.user_id
    - orders.tryon_session_id
    - session_analytics.tryon_session_id
    
  ### Performance Impact
    Foreign keys without indexes cause full table scans on joins and cascading operations
*/

-- nuvemshop_credentials.user_id
CREATE INDEX IF NOT EXISTS idx_nuvemshop_credentials_user_id 
  ON nuvemshop_credentials(user_id);

-- orders.tryon_session_id
CREATE INDEX IF NOT EXISTS idx_orders_tryon_session_id 
  ON orders(tryon_session_id);

-- session_analytics.tryon_session_id (might already exist, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_session_analytics_tryon_session_id 
  ON session_analytics(tryon_session_id);