/*
  # Fix Function Search Path Security - Part 2

  ## Changes
  
  ### Continue adding immutable search_path to functions
    - generate_shopify_store_public_id
    - set_shopify_store_public_id
    - update_updated_at_column
    - generate_shop_public_id
    - set_shopify_shops_public_id
    - check_shop_has_credits
    - generate_widget_public_id
    - auto_create_widget_key_for_shop
    - create_widget_key_for_shop
    - sync_widget_keys_logo
*/

-- generate_shopify_store_public_id
CREATE OR REPLACE FUNCTION public.generate_shopify_store_public_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  new_id text;
  id_exists boolean;
BEGIN
  LOOP
    new_id := 'shop_pub_' || encode(gen_random_bytes(12), 'hex');
    
    SELECT EXISTS(
      SELECT 1 FROM shopify_stores WHERE public_id = new_id
    ) INTO id_exists;
    
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$function$;

-- set_shopify_store_public_id
CREATE OR REPLACE FUNCTION public.set_shopify_store_public_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_shopify_store_public_id();
  END IF;
  RETURN NEW;
END;
$function$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- generate_shop_public_id
CREATE OR REPLACE FUNCTION public.generate_shop_public_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  new_id text;
  id_exists boolean;
BEGIN
  LOOP
    new_id := 'shop_pub_' || encode(gen_random_bytes(12), 'hex');
    
    SELECT EXISTS(
      SELECT 1 FROM shopify_stores WHERE public_id = new_id
      UNION ALL
      SELECT 1 FROM shopify_shops WHERE public_id = new_id
    ) INTO id_exists;
    
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$function$;

-- set_shopify_shops_public_id
CREATE OR REPLACE FUNCTION public.set_shopify_shops_public_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.public_id IS NULL THEN
    NEW.public_id := generate_shop_public_id();
  END IF;
  RETURN NEW;
END;
$function$;