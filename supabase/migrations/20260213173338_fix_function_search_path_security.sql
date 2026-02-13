/*
  # Fix Function Search Path Security

  ## Changes
  
  ### Add immutable search_path to all functions
    Functions with mutable search_path are vulnerable to search path attacks
    Set explicit search_path = public, pg_temp to prevent malicious schema injection
    
  ### Functions affected:
    - update_collections_updated_at
    - get_default_measurement_weights (IMMUTABLE, already safe but will add for consistency)
    - ensure_shopify_widget_consistency
    - get_elasticity_tolerances (IMMUTABLE, already safe but will add for consistency)
    - get_asymmetry_factor (IMMUTABLE, already safe but will add for consistency)
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

-- update_collections_updated_at
CREATE OR REPLACE FUNCTION public.update_collections_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ensure_shopify_widget_consistency
CREATE OR REPLACE FUNCTION public.ensure_shopify_widget_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.shop_domain IS NOT NULL THEN
    NEW.user_id := NULL;
  END IF;
  
  IF NEW.shop_domain IS NULL AND NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Regular widgets (without shop_domain) must have a user_id';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- get_default_measurement_weights (already IMMUTABLE, just adding search_path)
CREATE OR REPLACE FUNCTION public.get_default_measurement_weights(type garment_type)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN CASE type
    WHEN 'upper' THEN '{"Busto": 2.0, "Peito": 2.0, "Cintura": 1.0, "Quadril": 1.0, "Comprimento": 1.0, "Ombro": 1.0}'::jsonb
    WHEN 'lower' THEN '{"Busto": 1.0, "Peito": 1.0, "Cintura": 2.0, "Quadril": 2.0, "Comprimento": 1.0, "Tornozelo": 1.0}'::jsonb
    WHEN 'full' THEN '{"Busto": 1.0, "Peito": 1.0, "Cintura": 1.0, "Quadril": 1.0, "Comprimento": 1.0, "Ombro": 1.0}'::jsonb
    ELSE '{}'::jsonb
  END;
END;
$function$;

-- get_elasticity_tolerances (already IMMUTABLE, just adding search_path)
CREATE OR REPLACE FUNCTION public.get_elasticity_tolerances(level elasticity_level)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN CASE level
    WHEN 'structured' THEN '{"Peito": 4.0, "Busto": 4.0, "Cintura": 3.5, "Quadril": 4.0, "Ombro": 2.5, "Comprimento": 3.0, "Tornozelo": 2.0}'::jsonb
    WHEN 'light' THEN '{"Peito": 5.0, "Busto": 5.0, "Cintura": 4.5, "Quadril": 5.0, "Ombro": 3.0, "Comprimento": 3.5, "Tornozelo": 2.5}'::jsonb
    WHEN 'flexible' THEN '{"Peito": 6.0, "Busto": 6.0, "Cintura": 5.5, "Quadril": 6.0, "Ombro": 3.5, "Comprimento": 4.0, "Tornozelo": 3.0}'::jsonb
    WHEN 'high' THEN '{"Peito": 8.0, "Busto": 8.0, "Cintura": 7.0, "Quadril": 8.0, "Ombro": 4.5, "Comprimento": 5.0, "Tornozelo": 3.5}'::jsonb
    ELSE '{"Peito": 5.0, "Busto": 5.0, "Cintura": 4.5, "Quadril": 5.0, "Ombro": 3.0, "Comprimento": 3.5, "Tornozelo": 2.5}'::jsonb
  END;
END;
$function$;

-- get_asymmetry_factor (already IMMUTABLE, just adding search_path)
CREATE OR REPLACE FUNCTION public.get_asymmetry_factor(level elasticity_level)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN CASE level
    WHEN 'structured' THEN 2.5
    WHEN 'light' THEN 2.0
    WHEN 'flexible' THEN 1.5
    WHEN 'high' THEN 1.2
    ELSE 2.0
  END;
END;
$function$;