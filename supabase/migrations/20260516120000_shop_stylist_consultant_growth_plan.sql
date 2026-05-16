-- Consultor stylist (chat pós provador): apenas plano Growth ou superior.
-- O widget e as edge functions consultam shopify_shops.plan; esta função centraliza a regra no Postgres.

CREATE OR REPLACE FUNCTION public.shop_has_stylist_consultant_access(p_shop_domain text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT LOWER(TRIM(plan)) IN ('growth', 'pro', 'professional', 'enterprise')
      FROM public.shopify_shops
      WHERE LOWER(TRIM(shop_domain)) = LOWER(TRIM(p_shop_domain))
      LIMIT 1
    ),
    false
  );
$$;

COMMENT ON FUNCTION public.shop_has_stylist_consultant_access(text) IS
  'True quando a loja tem plano Growth, Pro ou Enterprise (consultor stylist no widget).';
