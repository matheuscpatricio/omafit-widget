/*
  # Consolidate Duplicate Permissive RLS Policies

  ## Changes
  
  ### Consolidate multiple SELECT policies for shopify_shops and shopify_stores
    These tables have both public_id access (for widgets) and user ownership
    Merge into single policies with clear OR conditions
    
  ### Notes:
    - shopify_size_charts and shopify_widget_configurations kept as-is
      They use shop_domain without user_id and need public access for widgets
*/

-- ============================================================================
-- shopify_shops: Consolidate public + authenticated SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Public can view shop info by public_id" ON shopify_shops;
DROP POLICY IF EXISTS "Users can view own shops" ON shopify_shops;

CREATE POLICY "Public and users can view shops"
  ON shopify_shops FOR SELECT TO authenticated, anon
  USING (
    -- Public can view by public_id OR authenticated users can view their own
    public_id IS NOT NULL 
    OR user_id = (select auth.uid())
  );

-- ============================================================================
-- shopify_stores: Consolidate public + authenticated SELECT policies
-- ============================================================================
DROP POLICY IF EXISTS "Public can view store info by public_id" ON shopify_stores;
DROP POLICY IF EXISTS "Users can view own shopify stores" ON shopify_stores;

CREATE POLICY "Public and users can view stores"
  ON shopify_stores FOR SELECT TO authenticated, anon
  USING (
    -- Public can view by public_id OR authenticated users can view their own
    public_id IS NOT NULL 
    OR user_id = (select auth.uid())
  );