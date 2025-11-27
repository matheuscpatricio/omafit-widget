/*
  # Fix Security Issues - RLS Optimization and Unused Indexes

  ## Changes Made

  1. **RLS Policy Optimization**
     - Updated all RLS policies on `nuvemshop_credentials` table
     - Wrapped `auth.uid()` calls with `(select auth.uid())` to prevent re-evaluation per row
     - Improves query performance at scale by evaluating auth function only once

  2. **Remove Unused Indexes**
     - Dropped `idx_nuvemshop_credentials_user_id` (unused)
     - Dropped `idx_orders_tryon_session_id` (unused)
     - Dropped `idx_session_analytics_tryon_session_id` (unused)

  ## Notes
  - The foreign key on `nuvemshop_credentials(user_id)` provides sufficient indexing
  - RLS policies now use subquery pattern for optimal performance
  - These changes improve both security and performance
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_nuvemshop_credentials_user_id;
DROP INDEX IF EXISTS idx_orders_tryon_session_id;
DROP INDEX IF EXISTS idx_session_analytics_tryon_session_id;

-- Drop existing RLS policies on nuvemshop_credentials
DROP POLICY IF EXISTS "Users can view own credentials" ON nuvemshop_credentials;
DROP POLICY IF EXISTS "Users can insert own credentials" ON nuvemshop_credentials;
DROP POLICY IF EXISTS "Users can update own credentials" ON nuvemshop_credentials;
DROP POLICY IF EXISTS "Users can delete own credentials" ON nuvemshop_credentials;

-- Recreate RLS policies with optimized auth function calls
CREATE POLICY "Users can view own credentials"
  ON nuvemshop_credentials
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own credentials"
  ON nuvemshop_credentials
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own credentials"
  ON nuvemshop_credentials
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own credentials"
  ON nuvemshop_credentials
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
