/*
  # Harden session_analytics schema for widget payload upserts

  Ensures critical fields used by edge functions exist in all environments,
  especially `shop_domain` and `recommended_size`.
*/

ALTER TABLE public.session_analytics
ADD COLUMN IF NOT EXISTS shop_domain text,
ADD COLUMN IF NOT EXISTS public_id text,
ADD COLUMN IF NOT EXISTS product_id text,
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS collection_handle text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS height numeric,
ADD COLUMN IF NOT EXISTS weight numeric,
ADD COLUMN IF NOT EXISTS recommended_size text,
ADD COLUMN IF NOT EXISTS body_type_index integer,
ADD COLUMN IF NOT EXISTS fit_preference_index integer,
ADD COLUMN IF NOT EXISTS user_measurements jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_session_analytics_shop_domain
  ON public.session_analytics (shop_domain);
