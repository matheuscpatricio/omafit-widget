/*
  # Fix Security Issues - Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for foreign keys that don't have covering indexes
    - This improves query performance for JOIN operations and foreign key lookups
    
  2. Indexes Added
    - idx_orders_tryon_session_id on orders(tryon_session_id)
    - idx_session_analytics_tryon_session_id on session_analytics(tryon_session_id)
    
  3. Benefits
    - Faster JOIN operations
    - Improved DELETE cascade performance
    - Better query optimization by the planner
*/

-- Add index for orders.tryon_session_id foreign key
CREATE INDEX IF NOT EXISTS idx_orders_tryon_session_id 
ON orders(tryon_session_id);

-- Add index for session_analytics.tryon_session_id foreign key
CREATE INDEX IF NOT EXISTS idx_session_analytics_tryon_session_id 
ON session_analytics(tryon_session_id);