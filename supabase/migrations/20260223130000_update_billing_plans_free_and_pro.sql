/*
  # Atualizar planos de billing Omafit

  ## Novos planos
  - **free**: Grátis para instalar, on-demand $0.18 por imagem
  - **pro**: $300/mês com 3000 imagens, adicionais a $0.08
  - **enterprise**: Sob consulta (mantido)
*/

-- Inserir ou atualizar plano free (grátis, on-demand)
INSERT INTO billing_plans (name, display_name, monthly_price, images_included, price_per_extra_image, currency, active, updated_at)
VALUES ('free', 'Free', 0, 0, 0.18, 'USD', true, now())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  images_included = EXCLUDED.images_included,
  price_per_extra_image = EXCLUDED.price_per_extra_image,
  currency = EXCLUDED.currency,
  active = EXCLUDED.active,
  updated_at = now();

-- Atualizar plano pro ($300, 3000 imagens, $0.08 extra)
INSERT INTO billing_plans (name, display_name, monthly_price, images_included, price_per_extra_image, currency, active, updated_at)
VALUES ('pro', 'Pro', 300, 3000, 0.08, 'USD', true, now())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  images_included = EXCLUDED.images_included,
  price_per_extra_image = EXCLUDED.price_per_extra_image,
  currency = EXCLUDED.currency,
  active = EXCLUDED.active,
  updated_at = now();

-- Manter enterprise (sob consulta)
INSERT INTO billing_plans (name, display_name, monthly_price, images_included, price_per_extra_image, currency, active, updated_at)
VALUES ('enterprise', 'Enterprise', 0, 999999, 0, 'USD', true, now())
ON CONFLICT (name) DO UPDATE SET
  updated_at = now();

-- Migrar lojas de starter para free
UPDATE shopify_shops SET plan = 'free' WHERE plan = 'starter';

-- Default para novas lojas
ALTER TABLE shopify_shops ALTER COLUMN plan SET DEFAULT 'free';
