/*
  # Optimize Shopify Shops RLS Policies

  ## Changes
  
  ### Replace auth.uid() with (select auth.uid()) in shopify_shops policies
    This prevents re-evaluation for each row, improving query performance at scale
    
    Policies updated:
    - Users can view own shops
    - Users can update own shops
    - Users can insert own shops
*/

-- Users can view own shops
DROP POLICY IF EXISTS "Users can view own shops" ON shopify_shops;

CREATE POLICY "Users can view own shops"
  ON shopify_shops FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Users can update own shops
DROP POLICY IF EXISTS "Users can update own shops" ON shopify_shops;

CREATE POLICY "Users can update own shops"
  ON shopify_shops FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Users can insert own shops
DROP POLICY IF EXISTS "Users can insert own shops" ON shopify_shops;

CREATE POLICY "Users can insert own shops"
  ON shopify_shops FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));