/*
  # Integração com Shopify

  1. New Tables
    - `shopify_stores`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `store_url` (text, URL da loja Shopify)
      - `access_token` (text, encrypted)
      - `api_key` (text, encrypted)
      - `api_secret` (text, encrypted)
      - `store_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `widget_configurations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `title` (text)
      - `subtitle` (text)
      - `modal_config` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Shopify stores table
CREATE TABLE IF NOT EXISTS shopify_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_url text NOT NULL,
  access_token text NOT NULL,
  api_key text NOT NULL,
  api_secret text NOT NULL,
  store_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Shopify stores"
  ON shopify_stores
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Widget configurations table
CREATE TABLE IF NOT EXISTS widget_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text DEFAULT 'Experimente Virtualmente',
  subtitle text DEFAULT 'Veja como fica em você usando nossa IA',
  modal_config jsonb DEFAULT '{
    "backgroundColor": "#FFFFFF",
    "primaryColor": "#8B5CF6",
    "secondaryColor": "#06B6D4",
    "textColor": "#1F2937",
    "borderRadius": "12px",
    "fontFamily": "Inter, sans-serif",
    "buttonStyle": "gradient",
    "showBrand": true,
    "customCSS": ""
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE widget_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own widget configurations"
  ON widget_configurations
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shopify_stores_user_id ON shopify_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_configurations_user_id ON widget_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_widget_configurations_product_id ON widget_configurations(product_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shopify_stores_updated_at
    BEFORE UPDATE ON shopify_stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_configurations_updated_at
    BEFORE UPDATE ON widget_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();