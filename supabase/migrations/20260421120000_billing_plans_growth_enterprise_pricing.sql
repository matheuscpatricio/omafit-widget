/*
  # Planos Omafit — Growth, Pro, Enterprise (preços e sessões)

  - **free** (On-demand): mensal 0, sessões incluídas 0 (uso medido), extra conforme price_per_extra_image
  - **growth**: US$ 89/mês, 700 sessões de try-on
  - **pro**: US$ 300/mês, 3000 sessões de try-on
  - **enterprise**: US$ 600/mês, sessões ilimitadas (images_included = 999999)
*/

INSERT INTO billing_plans (name, display_name, monthly_price, images_included, price_per_extra_image, currency, active, updated_at)
VALUES ('growth', 'Growth', 89, 700, 0.18, 'USD', true, now())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  images_included = EXCLUDED.images_included,
  price_per_extra_image = EXCLUDED.price_per_extra_image,
  currency = EXCLUDED.currency,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO billing_plans (name, display_name, monthly_price, images_included, price_per_extra_image, currency, active, updated_at)
VALUES ('enterprise', 'Enterprise', 600, 999999, 0, 'USD', true, now())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  images_included = EXCLUDED.images_included,
  price_per_extra_image = EXCLUDED.price_per_extra_image,
  currency = EXCLUDED.currency,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO billing_plans (name, display_name, monthly_price, images_included, price_per_extra_image, currency, active, updated_at)
VALUES ('free', 'On-Demand', 0, 0, 0.18, 'USD', true, now())
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  images_included = EXCLUDED.images_included,
  price_per_extra_image = EXCLUDED.price_per_extra_image,
  currency = EXCLUDED.currency,
  active = EXCLUDED.active,
  updated_at = now();

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
