/*
  # Schema para Shopify Billing do Omafit

  ## Novas Tabelas
  
  ### 1. billing_plans
  Define os planos disponíveis (Starter, Pro, Enterprise)
  - `name`: nome do plano (starter, pro, enterprise)
  - `display_name`: nome exibido (Starter, Pro, Enterprise)
  - `monthly_price`: preço mensal em dólares
  - `images_included`: número de imagens incluídas no plano
  - `price_per_extra_image`: preço por imagem adicional
  - `currency`: moeda (USD)
  - `trial_days`: dias de trial gratuito
  - `active`: se o plano está ativo

  ### 2. shopify_shops
  Informações de billing por loja Shopify
  - `shop_domain`: domínio da loja (ex: arrascaneta-2.myshopify.com)
  - `user_id`: referência ao usuário Omafit
  - `plan`: plano atual (starter, pro, enterprise)
  - `images_used_month`: contador de imagens usadas no mês atual
  - `images_included`: imagens incluídas no plano
  - `price_per_extra_image`: preço por imagem extra
  - `currency`: moeda
  - `shopify_app_subscription_id`: ID da AppSubscription na Shopify
  - `shopify_usage_line_item_id`: ID da linha de item de uso
  - `billing_status`: status do billing (pending, active, inactive, cancelled)
  - `billing_cycle_start`: início do ciclo de cobrança atual
  - `billing_cycle_end`: fim do ciclo de cobrança atual
  - `last_billed_images`: última contagem de imagens cobradas (evita duplicação)

  ### 3. shopify_usage_records
  Histórico de cobranças por uso de imagens extras
  - `shop_domain`: domínio da loja
  - `shopify_usage_record_id`: ID do AppUsageRecord na Shopify
  - `amount`: valor cobrado
  - `currency`: moeda
  - `images_count`: quantidade de imagens cobradas
  - `description`: descrição da cobrança
  - `billing_month`: mês de referência (YYYY-MM)

  ## Segurança
  - RLS habilitado em todas as tabelas
  - Políticas baseadas em user_id autenticado
*/

-- Criar enum para status de billing
DO $$ BEGIN
  CREATE TYPE billing_status_type AS ENUM ('pending', 'active', 'inactive', 'cancelled', 'manual');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela de planos
CREATE TABLE IF NOT EXISTS billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  monthly_price numeric NOT NULL,
  images_included integer NOT NULL,
  price_per_extra_image numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  trial_days integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de lojas Shopify com billing
CREATE TABLE IF NOT EXISTS shopify_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'starter',
  images_used_month integer DEFAULT 0,
  images_included integer NOT NULL,
  price_per_extra_image numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  shopify_app_subscription_id text,
  shopify_usage_line_item_id text,
  billing_status billing_status_type DEFAULT 'pending',
  billing_cycle_start timestamptz,
  billing_cycle_end timestamptz,
  last_billed_images integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de registros de uso (imagens extras)
CREATE TABLE IF NOT EXISTS shopify_usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain text NOT NULL,
  shopify_usage_record_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  images_count integer NOT NULL,
  description text NOT NULL,
  billing_month text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_usage_records ENABLE ROW LEVEL SECURITY;

-- Políticas para billing_plans (todos podem ler planos ativos)
CREATE POLICY "Anyone can read active billing plans"
  ON billing_plans FOR SELECT
  USING (active = true);

-- Políticas para shopify_shops (usuários autenticados podem ver suas próprias lojas)
CREATE POLICY "Users can view own shops"
  ON shopify_shops FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own shops"
  ON shopify_shops FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own shops"
  ON shopify_shops FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para shopify_usage_records (usuários podem ver seus registros)
CREATE POLICY "Users can view own usage records"
  ON shopify_usage_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shopify_shops
      WHERE shopify_shops.shop_domain = shopify_usage_records.shop_domain
      AND shopify_shops.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own usage records"
  ON shopify_usage_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopify_shops
      WHERE shopify_shops.shop_domain = shopify_usage_records.shop_domain
      AND shopify_shops.user_id = auth.uid()
    )
  );

-- Inserir planos padrão
INSERT INTO billing_plans (name, display_name, monthly_price, images_included, price_per_extra_image, trial_days)
VALUES 
  ('starter', 'Starter', 25.00, 100, 0.17, 7),
  ('pro', 'Pro', 100.00, 500, 0.15, 7),
  ('enterprise', 'Enterprise', 0, 999999, 0, 0)
ON CONFLICT (name) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_shopify_shops_domain ON shopify_shops(shop_domain);
CREATE INDEX IF NOT EXISTS idx_shopify_shops_user_id ON shopify_shops(user_id);
CREATE INDEX IF NOT EXISTS idx_shopify_shops_billing_status ON shopify_shops(billing_status);
CREATE INDEX IF NOT EXISTS idx_usage_records_shop_domain ON shopify_usage_records(shop_domain);
CREATE INDEX IF NOT EXISTS idx_usage_records_billing_month ON shopify_usage_records(billing_month);

-- Comentários
COMMENT ON TABLE billing_plans IS 'Define os planos disponíveis no Omafit (Starter, Pro, Enterprise)';
COMMENT ON TABLE shopify_shops IS 'Informações de billing por loja Shopify integrada';
COMMENT ON TABLE shopify_usage_records IS 'Histórico de cobranças por uso de imagens extras';
