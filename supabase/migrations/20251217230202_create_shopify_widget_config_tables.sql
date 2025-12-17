/*
  # Create Shopify Widget Configuration Tables

  1. New Tables
    - `shopify_widget_configurations`
      - `id` (uuid, primary key) - Unique identifier
      - `shop_domain` (text, unique, not null) - Shopify store domain
      - `link_text` (text) - Widget button text (default: 'Experimentar virtualmente')
      - `store_logo` (text) - URL to store logo
      - `primary_color` (text) - Primary color for widget (default: '#810707')
      - `widget_enabled` (boolean) - Enable/disable widget (default: true)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `shopify_size_charts`
      - `id` (uuid, primary key) - Unique identifier
      - `shop_domain` (text, not null) - Shopify store domain
      - `gender` (text, not null) - Gender category (male/female/unisex)
      - `sizes` (jsonb) - Size measurements array in JSON format
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - Unique constraint on (shop_domain, gender)

  2. Indexes
    - Fast lookup by shop_domain for both tables

  3. Triggers
    - Automatic updated_at timestamp updates

  4. Security
    - Enable RLS on both tables
    - Public read/write policies for external widget access

  Note: These tables are specifically for Shopify widget integration.
*/

-- Create shopify_widget_configurations table
CREATE TABLE IF NOT EXISTS shopify_widget_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain TEXT UNIQUE NOT NULL,
  link_text TEXT DEFAULT 'Experimentar virtualmente',
  store_logo TEXT,
  primary_color TEXT DEFAULT '#810707',
  widget_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create shopify_size_charts table
CREATE TABLE IF NOT EXISTS shopify_size_charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_domain TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'unisex')),
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_domain, gender)
);

-- Create indexes for fast shop_domain lookups
CREATE INDEX IF NOT EXISTS idx_shopify_widget_configurations_shop_domain 
ON shopify_widget_configurations(shop_domain);

CREATE INDEX IF NOT EXISTS idx_shopify_size_charts_shop_domain 
ON shopify_size_charts(shop_domain);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_shopify_widget_configurations_updated_at ON shopify_widget_configurations;
CREATE TRIGGER update_shopify_widget_configurations_updated_at
BEFORE UPDATE ON shopify_widget_configurations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shopify_size_charts_updated_at ON shopify_size_charts;
CREATE TRIGGER update_shopify_size_charts_updated_at
BEFORE UPDATE ON shopify_size_charts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE shopify_widget_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_size_charts ENABLE ROW LEVEL SECURITY;

-- Create public access policies for widget integration
DROP POLICY IF EXISTS "Allow public access to shopify_widget_configurations" ON shopify_widget_configurations;
CREATE POLICY "Allow public access to shopify_widget_configurations"
ON shopify_widget_configurations
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access to shopify_size_charts" ON shopify_size_charts;
CREATE POLICY "Allow public access to shopify_size_charts"
ON shopify_size_charts
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);