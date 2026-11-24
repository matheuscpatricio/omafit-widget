/*
  Liga uma conta VTEX ({conta}.myvtex.com) ao usuário Omafit sem gravar
  shop_domain em widget_keys.

  O trigger ensure_shopify_widget_consistency zera user_id quando shop_domain
  está preenchido. O try-on então trata a chave como Shopify e exige
  shopify_shops. A conta VTEX fica em store_links. A chave regular (user_id
  + public_id) continua valendo a assinatura em subscriptions.

  Backfill: tabelas de medidas sem shop_domain herdam o único domínio já
  conhecido daquele user_id em widget_keys.
*/

CREATE TABLE IF NOT EXISTS public.store_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('vtex')),
  shop_domain text NOT NULL,
  account_name text NOT NULL,
  public_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_links_shop_domain_key UNIQUE (shop_domain)
);

CREATE INDEX IF NOT EXISTS idx_store_links_user_platform
  ON public.store_links (user_id, platform);

ALTER TABLE public.store_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own store links" ON public.store_links;
CREATE POLICY "Users read own store links"
  ON public.store_links
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.link_vtex_store(p_account text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  account text;
  shop text;
  pub text;
  owner uuid;
  charts integer := 0;
  sub_status text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  account := lower(regexp_replace(coalesce(p_account, ''), '[^a-z0-9-]', '', 'g'));
  IF account !~ '^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$' AND account !~ '^[a-z0-9]$' THEN
    RAISE EXCEPTION 'invalid_account';
  END IF;
  shop := account || '.myvtex.com';

  SELECT user_id INTO owner FROM public.store_links WHERE shop_domain = shop;
  IF owner IS NOT NULL AND owner <> uid THEN
    RAISE EXCEPTION 'vtex_account_taken';
  END IF;

  SELECT public_id INTO pub
  FROM public.widget_keys
  WHERE user_id = uid
    AND status = 'active'
    AND public_id IS NOT NULL
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  INSERT INTO public.store_links (user_id, platform, shop_domain, account_name, public_id)
  VALUES (uid, 'vtex', shop, account, pub)
  ON CONFLICT (shop_domain) DO UPDATE
    SET public_id = EXCLUDED.public_id,
        account_name = EXCLUDED.account_name,
        updated_at = now()
    WHERE public.store_links.user_id = uid;

  UPDATE public.size_charts
  SET shop_domain = shop
  WHERE user_id = uid
    AND (shop_domain IS NULL OR btrim(shop_domain) = '' OR shop_domain LIKE '%.myvtex.com');
  GET DIAGNOSTICS charts = ROW_COUNT;

  INSERT INTO public.widget_configurations (shop_domain, link_text, primary_color, widget_enabled)
  VALUES (shop, 'Experimentar virtualmente', '#810707', true)
  ON CONFLICT (shop_domain) DO NOTHING;

  SELECT status INTO sub_status
  FROM public.subscriptions
  WHERE user_id = uid
    AND status = 'active'
  LIMIT 1;

  RETURN jsonb_build_object(
    'shop_domain', shop,
    'account_name', account,
    'public_id', pub,
    'charts_stamped', charts,
    'subscription_status', coalesce(sub_status, 'missing'),
    'needs_widget_key', pub IS NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.link_vtex_store(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_vtex_store(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.widget_owner_id(p_public_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id
  FROM public.widget_keys
  WHERE public_id = p_public_id
    AND status = 'active'
    AND user_id IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.widget_owner_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.widget_owner_id(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_vtex_widget_flags(p_shop_domain text, p_public_id text)
RETURNS TABLE (stylist_enabled boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.widget_keys wk
    JOIN public.subscriptions s
      ON s.user_id = wk.user_id
     AND s.status = 'active'
    WHERE wk.public_id = p_public_id
      AND wk.status = 'active'
      AND wk.user_id IS NOT NULL
      AND right(lower(coalesce(p_shop_domain, '')), 12) = '.myvtex.com'
      AND (
        s.images_limit = -1
        OR s.images_limit > 0
        OR s.plan_id IS NOT NULL
      )
  );
$$;

REVOKE ALL ON FUNCTION public.get_vtex_widget_flags(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vtex_widget_flags(text, text) TO anon, authenticated;

UPDATE public.size_charts AS sc
SET shop_domain = src.shop_domain
FROM (
  SELECT user_id, min(shop_domain) AS shop_domain
  FROM public.widget_keys
  WHERE user_id IS NOT NULL
    AND shop_domain IS NOT NULL
    AND btrim(shop_domain) <> ''
  GROUP BY user_id
  HAVING count(DISTINCT shop_domain) = 1
) AS src
WHERE sc.user_id = src.user_id
  AND (sc.shop_domain IS NULL OR btrim(sc.shop_domain) = '');
