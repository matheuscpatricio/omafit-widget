/*
  # Fix Remaining Function Search Path Security Issues

  1. Changes
    - Add explicit search_path to remaining functions with role mutable search_path
    - This prevents search_path manipulation attacks
    - Sets search_path to 'public' explicitly for all affected functions
  
  2. Functions Fixed
    - generate_widget_public_id(shop_domain_value text) overload
    - gen_random_bytes(length integer)
    - upsert_session_analytics_from_tryon_payload(payload jsonb) overload
  
  3. Security Notes
    - Explicit search_path prevents attackers from creating malicious schemas
    - All function overloads now have search_path = 'public' set
*/

-- Fix generate_widget_public_id(shop_domain_value text) function
CREATE OR REPLACE FUNCTION generate_widget_public_id(shop_domain_value text)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_id TEXT;
  counter INTEGER := 0;
BEGIN
  generated_id := 'wgt_pub_' || LEFT(md5(COALESCE(shop_domain_value, '') || '-' || clock_timestamp()::TEXT || '-' || random()::TEXT), 24);

  WHILE EXISTS (SELECT 1 FROM widget_keys WHERE public_id = generated_id) AND counter < 10 LOOP
    counter := counter + 1;
    generated_id := 'wgt_pub_' || LEFT(md5(COALESCE(shop_domain_value, '') || '-' || clock_timestamp()::TEXT || '-' || random()::TEXT || '-' || counter::TEXT), 24);
  END LOOP;

  RETURN generated_id;
END;
$$;

-- Fix gen_random_bytes function
CREATE OR REPLACE FUNCTION gen_random_bytes(length integer)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  out_bytes bytea := ''::bytea;
  chunk_hex text;
BEGIN
  IF length IS NULL OR length < 0 THEN
    RAISE EXCEPTION 'length must be a non-negative integer';
  END IF;

  WHILE octet_length(out_bytes) < length LOOP
    chunk_hex := md5(random()::text || clock_timestamp()::text || txid_current()::text);
    out_bytes := out_bytes || decode(chunk_hex, 'hex');
  END LOOP;

  RETURN substring(out_bytes FROM 1 FOR length);
END;
$$;

-- Fix upsert_session_analytics_from_tryon_payload(payload jsonb) function
CREATE OR REPLACE FUNCTION upsert_session_analytics_from_tryon_payload(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uuid_regex CONSTANT text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';
  session_id uuid := NULL;
  user_id_val uuid := NULL;
  um jsonb := NULL;
  user_measurements_val jsonb := NULL;

  shop_domain_val text := NULL;
  public_id_val text := NULL;
  product_id_val text := NULL;
  product_name_val text := NULL;
  collection_handle_val text := NULL;
  gender_val text := NULL;
  recommended_size_val text := NULL;
  height_text text := NULL;
  weight_text text := NULL;
  body_type_text text := NULL;
  fit_pref_text text := NULL;
  created_at_val timestamptz := NOW();
  resolved_shop_domain text := NULL;
  metadata_json jsonb := NULL;
  input_json jsonb := NULL;
  request_body_json jsonb := NULL;
  single_widget_shop text := NULL;
  single_shopify_shop text := NULL;
  count_widget_shops integer := 0;
  count_shopify_shops integer := 0;
BEGIN
  -- Session ID
  IF COALESCE(payload->>'id', '') ~* uuid_regex THEN
    session_id := (payload->>'id')::uuid;
  END IF;

  IF session_id IS NULL THEN
    RETURN;
  END IF;

  -- User ID
  IF COALESCE(payload->>'user_id', '') ~* uuid_regex THEN
    user_id_val := (payload->>'user_id')::uuid;
  END IF;

  -- Campos diretos do payload
  shop_domain_val := NULLIF(
    COALESCE(
      payload->>'shop_domain',
      payload->>'shopDomain',
      payload->>'shop',
      payload->>'domain',
      payload->'metadata'->>'shop_domain',
      payload->'metadata'->>'shopDomain'
    ),
    ''
  );
  public_id_val := NULLIF(
    COALESCE(
      payload->>'public_id',
      payload->>'publicId',
      payload->>'widget_public_id',
      payload->>'widgetPublicId',
      payload->'metadata'->>'public_id',
      payload->'metadata'->>'publicId'
    ),
    ''
  );
  product_id_val := NULLIF(COALESCE(payload->>'product_id', payload->>'productId'), '');
  product_name_val := NULLIF(COALESCE(payload->>'product_name', payload->>'productName'), '');
  collection_handle_val := NULLIF(
    COALESCE(
      payload->>'collection_handle',
      payload->>'collectionHandle',
      payload->>'collection'
    ),
    ''
  );
  gender_val := LOWER(NULLIF(payload->>'gender', ''));
  recommended_size_val := NULLIF(
    COALESCE(
      payload->>'recommended_size',
      payload->>'recommendedSize',
      payload->>'size_recommendation',
      payload->>'sizeRecommendation'
    ),
    ''
  );
  height_text := NULLIF(payload->>'height', '');
  weight_text := NULLIF(payload->>'weight', '');
  body_type_text := NULLIF(COALESCE(payload->>'body_type_index', payload->>'bodyType', payload->>'bodyTypeIndex'), '');
  fit_pref_text := NULLIF(COALESCE(payload->>'fit_preference_index', payload->>'fitPreference', payload->>'fitPreferenceIndex'), '');

  -- created_at da sessão (se existir)
  BEGIN
    IF NULLIF(payload->>'created_at', '') IS NOT NULL THEN
      created_at_val := (payload->>'created_at')::timestamptz;
    ELSIF NULLIF(payload->>'session_start_time', '') IS NOT NULL THEN
      created_at_val := (payload->>'session_start_time')::timestamptz;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    created_at_val := NOW();
  END;

  -- user_measurements embutido na sessão (se existir)
  BEGIN
    IF jsonb_typeof(payload->'user_measurements') = 'object' THEN
      user_measurements_val := payload->'user_measurements';
    ELSIF NULLIF(payload->>'user_measurements', '') IS NOT NULL THEN
      user_measurements_val := (payload->>'user_measurements')::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    user_measurements_val := NULL;
  END;

  -- user_measurements no payload também pode vir em camelCase
  IF user_measurements_val IS NULL THEN
    BEGIN
      IF jsonb_typeof(payload->'userMeasurements') = 'object' THEN
        user_measurements_val := payload->'userMeasurements';
      ELSIF NULLIF(payload->>'userMeasurements', '') IS NOT NULL THEN
        user_measurements_val := (payload->>'userMeasurements')::jsonb;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      user_measurements_val := NULL;
    END;
  END IF;

  -- Tenta parsear JSONs auxiliares que algumas edge functions salvam na sessão.
  BEGIN
    IF jsonb_typeof(payload->'metadata') = 'object' THEN
      metadata_json := payload->'metadata';
    ELSIF NULLIF(payload->>'metadata', '') IS NOT NULL THEN
      metadata_json := (payload->>'metadata')::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    metadata_json := NULL;
  END;

  BEGIN
    IF jsonb_typeof(payload->'input') = 'object' THEN
      input_json := payload->'input';
    ELSIF NULLIF(payload->>'input', '') IS NOT NULL THEN
      input_json := (payload->>'input')::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    input_json := NULL;
  END;

  BEGIN
    IF jsonb_typeof(payload->'request_body') = 'object' THEN
      request_body_json := payload->'request_body';
    ELSIF NULLIF(payload->>'request_body', '') IS NOT NULL THEN
      request_body_json := (payload->>'request_body')::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    request_body_json := NULL;
  END;

  -- Fallback de campos vindos em payloads aninhados
  shop_domain_val := COALESCE(
    shop_domain_val,
    NULLIF(metadata_json->>'shop_domain', ''),
    NULLIF(metadata_json->>'shopDomain', ''),
    NULLIF(input_json->>'shop_domain', ''),
    NULLIF(input_json->>'shopDomain', ''),
    NULLIF(request_body_json->>'shop_domain', ''),
    NULLIF(request_body_json->>'shopDomain', '')
  );

  public_id_val := COALESCE(
    public_id_val,
    NULLIF(metadata_json->>'public_id', ''),
    NULLIF(metadata_json->>'publicId', ''),
    NULLIF(input_json->>'public_id', ''),
    NULLIF(input_json->>'publicId', ''),
    NULLIF(request_body_json->>'public_id', ''),
    NULLIF(request_body_json->>'publicId', ''),
    NULLIF(request_body_json->>'widget_public_id', ''),
    NULLIF(request_body_json->>'widgetPublicId', '')
  );

  collection_handle_val := COALESCE(
    collection_handle_val,
    NULLIF(metadata_json->>'collection_handle', ''),
    NULLIF(metadata_json->>'collectionHandle', ''),
    NULLIF(input_json->>'collection_handle', ''),
    NULLIF(input_json->>'collectionHandle', ''),
    NULLIF(request_body_json->>'collection_handle', ''),
    NULLIF(request_body_json->>'collectionHandle', ''),
    NULLIF(request_body_json->>'collection', '')
  );

  recommended_size_val := COALESCE(
    recommended_size_val,
    NULLIF(metadata_json->>'recommended_size', ''),
    NULLIF(metadata_json->>'recommendedSize', ''),
    NULLIF(input_json->>'recommended_size', ''),
    NULLIF(input_json->>'recommendedSize', ''),
    NULLIF(request_body_json->>'recommended_size', ''),
    NULLIF(request_body_json->>'recommendedSize', ''),
    NULLIF(request_body_json->>'size_recommendation', ''),
    NULLIF(request_body_json->>'sizeRecommendation', '')
  );

  -- Enriquecer com os dados vindos dentro de user_measurements do próprio payload
  IF user_measurements_val IS NOT NULL THEN
    collection_handle_val := COALESCE(
      collection_handle_val,
      NULLIF(user_measurements_val->>'collection_handle', ''),
      NULLIF(user_measurements_val->>'collectionHandle', ''),
      NULLIF(user_measurements_val->>'collection', '')
    );
    gender_val := COALESCE(gender_val, LOWER(NULLIF(user_measurements_val->>'gender', '')));
    recommended_size_val := COALESCE(
      recommended_size_val,
      NULLIF(user_measurements_val->>'recommended_size', ''),
      NULLIF(user_measurements_val->>'recommendedSize', ''),
      NULLIF(user_measurements_val->>'size_recommendation', ''),
      NULLIF(user_measurements_val->>'sizeRecommendation', '')
    );
    height_text := COALESCE(height_text, NULLIF(user_measurements_val->>'height', ''));
    weight_text := COALESCE(weight_text, NULLIF(user_measurements_val->>'weight', ''));
    body_type_text := COALESCE(
      body_type_text,
      NULLIF(user_measurements_val->>'body_type_index', ''),
      NULLIF(user_measurements_val->>'bodyType', ''),
      NULLIF(user_measurements_val->>'bodyTypeIndex', '')
    );
    fit_pref_text := COALESCE(
      fit_pref_text,
      NULLIF(user_measurements_val->>'fit_preference_index', ''),
      NULLIF(user_measurements_val->>'fitPreference', ''),
      NULLIF(user_measurements_val->>'fitPreferenceIndex', '')
    );
  END IF;

  -- Tenta enriquecer via tabela user_measurements (se existir)
  IF to_regclass('public.user_measurements') IS NOT NULL THEN
    BEGIN
      EXECUTE $sql$
        SELECT to_jsonb(um)
        FROM public.user_measurements um
        WHERE um.tryon_session_id = $1
        LIMIT 1
      $sql$
      INTO um
      USING session_id;
    EXCEPTION WHEN OTHERS THEN
      um := NULL;
    END;
  END IF;

  IF um IS NOT NULL THEN
    collection_handle_val := COALESCE(collection_handle_val, NULLIF(um->>'collection_handle', ''), NULLIF(um->>'collectionHandle', ''));
    gender_val := COALESCE(gender_val, LOWER(NULLIF(um->>'gender', '')));
    recommended_size_val := COALESCE(recommended_size_val, NULLIF(um->>'recommended_size', ''), NULLIF(um->>'recommendedSize', ''));
    height_text := COALESCE(height_text, NULLIF(um->>'height', ''));
    weight_text := COALESCE(weight_text, NULLIF(um->>'weight', ''));
    body_type_text := COALESCE(body_type_text, NULLIF(um->>'body_type_index', ''), NULLIF(um->>'bodyType', ''));
    fit_pref_text := COALESCE(fit_pref_text, NULLIF(um->>'fit_preference_index', ''), NULLIF(um->>'fitPreference', ''));
    IF user_measurements_val IS NULL THEN
      user_measurements_val := um;
    END IF;
  END IF;

  -- Se shop_domain vier vazio, tenta resolver por widget_keys via public_id.
  IF shop_domain_val IS NULL AND public_id_val IS NOT NULL AND to_regclass('public.widget_keys') IS NOT NULL THEN
    BEGIN
      EXECUTE $sql$
        SELECT wk.shop_domain
        FROM public.widget_keys wk
        WHERE wk.public_id = $1
          AND wk.shop_domain IS NOT NULL
        LIMIT 1
      $sql$
      INTO resolved_shop_domain
      USING public_id_val;
    EXCEPTION WHEN OTHERS THEN
      resolved_shop_domain := NULL;
    END;
  END IF;

  shop_domain_val := COALESCE(shop_domain_val, NULLIF(resolved_shop_domain, ''));

  -- Último fallback: se só houver 1 shop_domain no projeto, usa-o.
  IF shop_domain_val IS NULL AND to_regclass('public.widget_keys') IS NOT NULL THEN
    BEGIN
      EXECUTE $sql$
        SELECT MAX(t.shop_domain)
        FROM (
          SELECT wk.shop_domain
          FROM public.widget_keys wk
          WHERE wk.shop_domain IS NOT NULL
          GROUP BY wk.shop_domain
        ) t
      $sql$
      INTO single_widget_shop;

      EXECUTE $sql$
        SELECT COUNT(*)
        FROM (
          SELECT wk.shop_domain
          FROM public.widget_keys wk
          WHERE wk.shop_domain IS NOT NULL
          GROUP BY wk.shop_domain
        ) t
      $sql$
      INTO count_widget_shops;
    EXCEPTION WHEN OTHERS THEN
      single_widget_shop := NULL;
      count_widget_shops := 0;
    END;

    IF count_widget_shops = 1 THEN
      shop_domain_val := single_widget_shop;
    END IF;
  END IF;

  IF shop_domain_val IS NULL AND to_regclass('public.shopify_shops') IS NOT NULL THEN
    BEGIN
      EXECUTE $sql$
        SELECT MAX(t.shop_domain)
        FROM (
          SELECT COALESCE(s.shop_domain, s.shop, s.domain) AS shop_domain
          FROM public.shopify_shops s
          WHERE COALESCE(s.shop_domain, s.shop, s.domain) IS NOT NULL
          GROUP BY COALESCE(s.shop_domain, s.shop, s.domain)
        ) t
      $sql$
      INTO single_shopify_shop;

      EXECUTE $sql$
        SELECT COUNT(*)
        FROM (
          SELECT COALESCE(s.shop_domain, s.shop, s.domain) AS shop_domain
          FROM public.shopify_shops s
          WHERE COALESCE(s.shop_domain, s.shop, s.domain) IS NOT NULL
          GROUP BY COALESCE(s.shop_domain, s.shop, s.domain)
        ) t
      $sql$
      INTO count_shopify_shops;
    EXCEPTION WHEN OTHERS THEN
      single_shopify_shop := NULL;
      count_shopify_shops := 0;
    END;

    IF count_shopify_shops = 1 THEN
      shop_domain_val := single_shopify_shop;
    END IF;
  END IF;

  -- UPSERT por tryon_session_id
  INSERT INTO public.session_analytics (
    tryon_session_id,
    user_id,
    shop_domain,
    public_id,
    product_id,
    product_name,
    collection_handle,
    gender,
    height,
    weight,
    recommended_size,
    body_type_index,
    fit_preference_index,
    user_measurements,
    duration_seconds,
    completed,
    shared,
    processing_time_seconds,
    images_processed,
    created_at,
    updated_at
  ) VALUES (
    session_id,
    user_id_val,
    shop_domain_val,
    public_id_val,
    product_id_val,
    product_name_val,
    collection_handle_val,
    gender_val,
    CASE WHEN height_text ~ '^-?[0-9]+(\.[0-9]+)?$' THEN height_text::numeric ELSE NULL END,
    CASE WHEN weight_text ~ '^-?[0-9]+(\.[0-9]+)?$' THEN weight_text::numeric ELSE NULL END,
    recommended_size_val,
    CASE WHEN body_type_text ~ '^-?[0-9]+$' THEN body_type_text::integer ELSE NULL END,
    CASE WHEN fit_pref_text ~ '^-?[0-9]+$' THEN fit_pref_text::integer ELSE NULL END,
    user_measurements_val,
    0,
    false,
    false,
    0,
    1,
    created_at_val,
    NOW()
  )
  ON CONFLICT (tryon_session_id)
  DO UPDATE SET
    user_id = COALESCE(EXCLUDED.user_id, public.session_analytics.user_id),
    shop_domain = COALESCE(EXCLUDED.shop_domain, public.session_analytics.shop_domain),
    public_id = COALESCE(EXCLUDED.public_id, public.session_analytics.public_id),
    product_id = COALESCE(EXCLUDED.product_id, public.session_analytics.product_id),
    product_name = COALESCE(EXCLUDED.product_name, public.session_analytics.product_name),
    collection_handle = COALESCE(EXCLUDED.collection_handle, public.session_analytics.collection_handle),
    gender = COALESCE(EXCLUDED.gender, public.session_analytics.gender),
    height = COALESCE(EXCLUDED.height, public.session_analytics.height),
    weight = COALESCE(EXCLUDED.weight, public.session_analytics.weight),
    recommended_size = COALESCE(EXCLUDED.recommended_size, public.session_analytics.recommended_size),
    body_type_index = COALESCE(EXCLUDED.body_type_index, public.session_analytics.body_type_index),
    fit_preference_index = COALESCE(EXCLUDED.fit_preference_index, public.session_analytics.fit_preference_index),
    user_measurements = COALESCE(EXCLUDED.user_measurements, public.session_analytics.user_measurements),
    updated_at = NOW();
END;
$$;