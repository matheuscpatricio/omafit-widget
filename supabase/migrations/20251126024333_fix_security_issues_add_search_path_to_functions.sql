/*
  # Fix Security Issues - Add Search Path to Functions

  1. Security Improvements
    - Add SET search_path to all functions to prevent search path injection attacks
    - This ensures functions only access objects in expected schemas
    
  2. Functions Updated
    - set_updated_at
    - get_user_tryon_count
    - generate_widget_key
    - generate_widget_public_id
    - calculate_health_score
    - delete_user_and_related_data
    - calculate_monthly_tryon_costs
    - get_plan_image_limit
    - get_plan_mrr
    - update_updated_at_column
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_tryon_count(user_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
session_count integer;
BEGIN
SELECT COUNT(*) INTO session_count
FROM tryon_sessions
WHERE customer_email = user_email;

RETURN COALESCE(session_count, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_widget_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
new_key text;
new_public_id text;
key_exists boolean;
BEGIN
LOOP
-- Generate a new key with 'wgt_' prefix
new_key := 'wgt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16);

-- Check if key already exists
SELECT EXISTS(SELECT 1 FROM widget_keys WHERE key = new_key) INTO key_exists;

-- Exit loop if key is unique
EXIT WHEN NOT key_exists;
END LOOP;

RETURN new_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_widget_public_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
new_public_id text;
id_exists boolean;
BEGIN
LOOP
-- Generate a new public ID with 'wgt_pub_' prefix
new_public_id := 'wgt_pub_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);

-- Check if public_id already exists
SELECT EXISTS(SELECT 1 FROM widget_keys WHERE public_id = new_public_id) INTO id_exists;

-- Exit loop if public_id is unique
EXIT WHEN NOT id_exists;
END LOOP;

RETURN new_public_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_health_score(p_images_used integer, p_images_limit integer, p_subscription_status text, p_last_activity timestamp with time zone)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
score integer := 100;
usage_ratio float;
days_inactive integer;
BEGIN
-- Calculate usage ratio
IF p_images_limit > 0 THEN
usage_ratio := p_images_used::float / p_images_limit;

-- Optimal usage is 50-80%
IF usage_ratio >= 0.5 AND usage_ratio <= 0.8 THEN
score := score;
ELSIF usage_ratio > 0.9 THEN
score := score - 30; -- Near limit
ELSIF usage_ratio < 0.1 THEN
score := score - 25; -- Low usage
ELSE
score := score - 10;
END IF;
END IF;

-- Check subscription status
IF p_subscription_status = 'canceled' THEN
score := score - 50;
ELSIF p_subscription_status = 'past_due' THEN
score := score - 40;
END IF;

-- Check last activity
IF p_last_activity IS NOT NULL THEN
days_inactive := EXTRACT(DAY FROM (NOW() - p_last_activity));
IF days_inactive > 30 THEN
score := score - 20;
ELSIF days_inactive > 14 THEN
score := score - 10;
END IF;
END IF;

-- Ensure score is between 0 and 100
score := GREATEST(0, LEAST(100, score));

RETURN score;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_and_related_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
-- Delete customer analytics
DELETE FROM customer_analytics WHERE user_id = target_user_id;

-- Delete session analytics
DELETE FROM session_analytics WHERE user_id = target_user_id;

-- Delete product analytics
DELETE FROM product_analytics WHERE user_id = target_user_id;

-- Delete orders
DELETE FROM orders WHERE user_id = target_user_id;

-- Delete products
DELETE FROM products WHERE user_id = target_user_id;

-- Delete widget configurations
DELETE FROM widget_configurations WHERE user_id = target_user_id;

-- Delete widget keys
DELETE FROM widget_keys WHERE user_id = target_user_id;

-- Delete API config
DELETE FROM api_config WHERE user_id = target_user_id;

-- Delete subscriptions
DELETE FROM subscriptions WHERE user_id = target_user_id;

-- Delete shopify stores
DELETE FROM shopify_stores WHERE user_id = target_user_id;

-- Delete from users table
DELETE FROM users WHERE id = target_user_id;

RETURN true;
EXCEPTION
WHEN OTHERS THEN
RAISE EXCEPTION 'Error deleting user: %', SQLERRM;
RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_monthly_tryon_costs()
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
total_tryons integer;
cost_per_tryon decimal := 0.22;
BEGIN
-- Get total try-ons for current month
SELECT COALESCE(SUM(images_used_current_month), 0)
INTO total_tryons
FROM crm_stores_view;

RETURN total_tryons * cost_per_tryon;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_plan_image_limit(plan_value text)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
RETURN CASE 
WHEN plan_value IN ('130', 'plan_130') THEN 100
WHEN plan_value IN ('550', 'plan_550') THEN 500
WHEN plan_value IN ('975', 'plan_975') THEN 1000
WHEN plan_value IN ('2400', 'plan_2400') THEN 3000
ELSE 100 -- Default to basic plan
END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_plan_mrr(plan_id_value text)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
RETURN CASE 
WHEN plan_id_value IN ('130', 'plan_130') THEN 130.00
WHEN plan_id_value IN ('550', 'plan_550') THEN 550.00
WHEN plan_id_value IN ('975', 'plan_975') THEN 975.00
WHEN plan_id_value IN ('2400', 'plan_2400') THEN 2400.00
WHEN plan_id_value IN ('basic') THEN 130.00
ELSE 0.00
END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;