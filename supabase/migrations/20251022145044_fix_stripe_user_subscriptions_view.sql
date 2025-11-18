/*
  # Fix stripe_user_subscriptions View
  
  ## Problem
  The current view returns multiple rows when a customer has multiple subscriptions,
  causing "multiple rows returned" errors when using maybeSingle().
  
  ## Solution
  Recreate the view to only return the most recent active subscription per user.
  - Orders by subscription status (active first) and creation date
  - Uses DISTINCT ON to get only one subscription per customer
  
  ## Changes
  - DROP existing view
  - CREATE new view with DISTINCT ON clause to ensure one row per user
*/

-- Drop the existing view
DROP VIEW IF EXISTS stripe_user_subscriptions;

-- Recreate the view to return only the most recent subscription per user
CREATE VIEW stripe_user_subscriptions AS
SELECT DISTINCT ON (c.user_id)
  c.customer_id,
  s.subscription_id,
  s.status AS subscription_status,
  s.price_id,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.payment_method_brand,
  s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid() 
  AND c.deleted_at IS NULL 
  AND (s.deleted_at IS NULL OR s.deleted_at IS NOT NULL)
ORDER BY c.user_id, 
  CASE 
    WHEN s.status = 'active' THEN 1
    WHEN s.status = 'trialing' THEN 2
    WHEN s.status = 'past_due' THEN 3
    ELSE 4
  END,
  s.created_at DESC NULLS LAST;