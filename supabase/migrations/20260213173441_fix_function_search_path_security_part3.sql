/*
  # Fix Function Search Path Security - Part 3 (Final)

  ## Changes
  
  ### Complete adding immutable search_path to remaining functions
    CRITICAL: Some of these are SECURITY DEFINER, making search_path security essential
    
    - check_shop_has_credits (SECURITY DEFINER)
    - generate_widget_public_id
    - auto_create_widget_key_for_shop
    - create_widget_key_for_shop (SECURITY DEFINER)
    - sync_widget_keys_logo
*/

-- check_shop_has_credits (SECURITY DEFINER - CRITICAL)
CREATE OR REPLACE FUNCTION public.check_shop_has_credits(p_shop_domain text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  result jsonb;
  shop_record RECORD;
  subscription_record RECORD;
BEGIN
  SELECT 
    ss.shop_domain,
    ss.user_id,
    ss.billing_status,
    ss.images_used_month,
    ss.images_included,
    ss.public_id
  INTO shop_record
  FROM shopify_shops ss
  WHERE ss.shop_domain = p_shop_domain;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_credits', false,
      'error', 'Shop not found',
      'shop_domain', p_shop_domain
    );
  END IF;
  
  SELECT 
    s.status,
    s.images_used,
    s.images_limit,
    s.plan_id
  INTO subscription_record
  FROM subscriptions s
  WHERE s.user_id = shop_record.user_id;
  
  IF shop_record.billing_status = 'active' AND 
     shop_record.images_used_month < shop_record.images_included THEN
    RETURN jsonb_build_object(
      'has_credits', true,
      'source', 'shopify_shops',
      'images_used', shop_record.images_used_month,
      'images_limit', shop_record.images_included,
      'images_remaining', shop_record.images_included - shop_record.images_used_month,
      'shop_domain', shop_record.shop_domain,
      'user_id', shop_record.user_id
    );
  END IF;
  
  IF subscription_record.status = 'active' AND 
     subscription_record.images_used < subscription_record.images_limit THEN
    RETURN jsonb_build_object(
      'has_credits', true,
      'source', 'subscription',
      'images_used', subscription_record.images_used,
      'images_limit', subscription_record.images_limit,
      'images_remaining', subscription_record.images_limit - subscription_record.images_used,
      'plan_id', subscription_record.plan_id,
      'user_id', shop_record.user_id
    );
  END IF;
  
  RETURN jsonb_build_object(
    'has_credits', false,
    'error', 'No credits available',
    'shop_billing_status', shop_record.billing_status,
    'subscription_status', COALESCE(subscription_record.status, 'none'),
    'shop_images_used', shop_record.images_used_month,
    'shop_images_limit', shop_record.images_included,
    'subscription_images_used', COALESCE(subscription_record.images_used, 0),
    'subscription_images_limit', COALESCE(subscription_record.images_limit, 0)
  );
END;
$function$;

-- generate_widget_public_id
CREATE OR REPLACE FUNCTION public.generate_widget_public_id(shop_domain_value text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  generated_id TEXT;
  hash_part TEXT;
  counter INTEGER := 0;
BEGIN
  hash_part := LEFT(encode(digest(shop_domain_value || '-' || NOW()::TEXT || '-' || random()::TEXT, 'sha256'), 'hex'), 24);
  generated_id := 'wgt_pub_' || hash_part;
  
  WHILE EXISTS (SELECT 1 FROM widget_keys WHERE public_id = generated_id) AND counter < 10 LOOP
    hash_part := LEFT(encode(digest(shop_domain_value || '-' || NOW()::TEXT || '-' || random()::TEXT || '-' || counter::TEXT, 'sha256'), 'hex'), 24);
    generated_id := 'wgt_pub_' || hash_part;
    counter := counter + 1;
  END LOOP;
  
  IF EXISTS (SELECT 1 FROM widget_keys WHERE public_id = generated_id) THEN
    hash_part := LEFT(encode(digest(shop_domain_value || '-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || random()::TEXT, 'sha256'), 'hex'), 24);
    generated_id := 'wgt_pub_' || hash_part;
  END IF;
  
  RETURN generated_id;
END;
$function$;

-- auto_create_widget_key_for_shop
CREATE OR REPLACE FUNCTION public.auto_create_widget_key_for_shop()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  shop_domain_value TEXT;
  generated_public_id TEXT;
  user_id_value UUID;
BEGIN
  IF NEW.shop_domain IS NOT NULL AND NEW.shop_domain != '' THEN
    shop_domain_value := NEW.shop_domain;
  ELSIF NEW.store_url IS NOT NULL AND NEW.store_url != '' THEN
    shop_domain_value := REPLACE(REPLACE(REPLACE(NEW.store_url, 'https://', ''), 'http://', ''), '/', '');
  ELSE
    RAISE NOTICE 'Não foi possível determinar shop_domain para criar widget_key';
    RETURN NEW;
  END IF;
  
  user_id_value := NEW.user_id;
  
  IF NOT EXISTS (SELECT 1 FROM widget_keys WHERE widget_keys.shop_domain = shop_domain_value) THEN
    generated_public_id := generate_widget_public_id(shop_domain_value);
    
    INSERT INTO widget_keys (public_id, shop_domain, user_id, is_active, created_at, updated_at)
    VALUES (generated_public_id, shop_domain_value, user_id_value, true, NOW(), NOW())
    ON CONFLICT (shop_domain) DO UPDATE SET
      public_id = EXCLUDED.public_id,
      is_active = true,
      updated_at = NOW();
    
    RAISE NOTICE 'Widget key criado automaticamente para shop_domain: % com public_id: %', shop_domain_value, generated_public_id;
  ELSE
    RAISE NOTICE 'Widget key já existe para shop_domain: %', shop_domain_value;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- create_widget_key_for_shop (SECURITY DEFINER - CRITICAL)
CREATE OR REPLACE FUNCTION public.create_widget_key_for_shop(shop_domain_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  generated_public_id TEXT;
  existing_key RECORD;
  result JSON;
BEGIN
  SELECT public_id, is_active INTO existing_key
  FROM widget_keys
  WHERE shop_domain = shop_domain_param
  LIMIT 1;
  
  IF existing_key.public_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'public_id', existing_key.public_id,
      'is_active', existing_key.is_active,
      'created', false,
      'message', 'Widget key já existe para este shop_domain'
    );
  END IF;
  
  generated_public_id := generate_widget_public_id(shop_domain_param);
  
  INSERT INTO widget_keys (public_id, shop_domain, is_active, created_at, updated_at)
  VALUES (generated_public_id, shop_domain_param, true, NOW(), NOW())
  ON CONFLICT (shop_domain) DO UPDATE SET
    public_id = EXCLUDED.public_id,
    is_active = true,
    updated_at = NOW()
  RETURNING public_id, is_active INTO existing_key;
  
  RETURN json_build_object(
    'success', true,
    'public_id', generated_public_id,
    'is_active', true,
    'created', true,
    'message', 'Widget key criado com sucesso'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Erro ao criar widget key'
    );
END;
$function$;

-- sync_widget_keys_logo
CREATE OR REPLACE FUNCTION public.sync_widget_keys_logo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE widget_keys
  SET store_logo = NEW.store_logo
  WHERE widget_keys.shop_domain = NEW.shop_domain
    AND NEW.store_logo IS NOT NULL
    AND NEW.store_logo != '';
  
  RETURN NEW;
END;
$function$;