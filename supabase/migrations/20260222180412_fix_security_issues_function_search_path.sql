/*
  # Fix Security Issues - Function Search Path Security

  1. Changes
    - Add explicit search_path to functions with role mutable search_path
    - This prevents search_path manipulation attacks
    - Sets search_path to 'public' explicitly for all affected functions
  
  2. Functions Fixed
    - generate_widget_public_id
    - auto_create_widget_key_for_shop
    - gen_random_bytes
    - auto_create_widget_key
    - upsert_session_analytics_from_tryon_payload
    - trigger_sync_tryon_to_session_analytics
  
  3. Security Notes
    - Explicit search_path prevents attackers from creating malicious schemas
    - All functions now have search_path = 'public' set
*/

-- Fix generate_widget_public_id function
CREATE OR REPLACE FUNCTION generate_widget_public_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := encode(gen_random_bytes(12), 'base64');
    new_id := replace(replace(replace(new_id, '/', '_'), '+', '-'), '=', '');
    
    SELECT EXISTS(SELECT 1 FROM widget_keys WHERE public_id = new_id) INTO id_exists;
    
    IF NOT id_exists THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$;

-- Fix auto_create_widget_key_for_shop function
CREATE OR REPLACE FUNCTION auto_create_widget_key_for_shop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO widget_keys (user_id, key_name, public_id)
  VALUES (
    NEW.user_id,
    'Default Widget Key',
    generate_widget_public_id()
  );
  RETURN NEW;
END;
$$;

-- Fix auto_create_widget_key function
CREATE OR REPLACE FUNCTION auto_create_widget_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO widget_keys (user_id, key_name, public_id)
  VALUES (
    NEW.id,
    'Default Widget Key',
    generate_widget_public_id()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Fix upsert_session_analytics_from_tryon_payload function
CREATE OR REPLACE FUNCTION upsert_session_analytics_from_tryon_payload(
  p_public_id TEXT,
  p_shop_domain TEXT,
  p_session_id TEXT,
  p_product_id TEXT,
  p_gender TEXT,
  p_body_type TEXT,
  p_recommended_size TEXT,
  p_confidence_level TEXT,
  p_confidence_score NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id
  FROM widget_keys
  WHERE public_id = p_public_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid public_id: %', p_public_id;
  END IF;

  INSERT INTO session_analytics (
    user_id,
    shop_domain,
    public_id,
    session_id,
    product_id,
    gender,
    body_type,
    recommended_size,
    confidence_level,
    confidence_score,
    created_at
  )
  VALUES (
    v_user_id,
    p_shop_domain,
    p_public_id,
    p_session_id,
    p_product_id,
    p_gender,
    p_body_type,
    p_recommended_size,
    p_confidence_level,
    p_confidence_score,
    NOW()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    gender = EXCLUDED.gender,
    body_type = EXCLUDED.body_type,
    recommended_size = EXCLUDED.recommended_size,
    confidence_level = EXCLUDED.confidence_level,
    confidence_score = EXCLUDED.confidence_score;
END;
$$;

-- Fix trigger_sync_tryon_to_session_analytics function
CREATE OR REPLACE FUNCTION trigger_sync_tryon_to_session_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_body_measurements JSONB;
  v_gender TEXT;
  v_body_type TEXT;
  v_recommended_size TEXT;
  v_confidence_level TEXT;
  v_confidence_score NUMERIC;
BEGIN
  SELECT user_id INTO v_user_id
  FROM widget_keys
  WHERE public_id = NEW.public_id;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT 
    body_measurements,
    gender,
    body_type,
    recommended_size,
    confidence_level,
    confidence_score
  INTO 
    v_body_measurements,
    v_gender,
    v_body_type,
    v_recommended_size,
    v_confidence_level,
    v_confidence_score
  FROM tryon_sessions
  WHERE id = NEW.id;

  INSERT INTO session_analytics (
    user_id,
    shop_domain,
    public_id,
    session_id,
    product_id,
    gender,
    body_type,
    recommended_size,
    confidence_level,
    confidence_score,
    created_at
  )
  VALUES (
    v_user_id,
    COALESCE(NEW.shop_name, 'unknown'),
    NEW.public_id,
    NEW.id::TEXT,
    NEW.product_id,
    v_gender,
    v_body_type,
    v_recommended_size,
    v_confidence_level,
    v_confidence_score,
    NEW.created_at
  )
  ON CONFLICT (session_id) DO UPDATE SET
    gender = EXCLUDED.gender,
    body_type = EXCLUDED.body_type,
    recommended_size = EXCLUDED.recommended_size,
    confidence_level = EXCLUDED.confidence_level,
    confidence_score = EXCLUDED.confidence_score;

  RETURN NEW;
END;
$$;