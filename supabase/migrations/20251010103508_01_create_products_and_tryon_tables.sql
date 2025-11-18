/*
  # Create products table and security policies

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `garment_image` (text, URL to Supabase Storage)
      - `category` (text, values: tops, dresses, bottoms, shoes, accessories)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `tryon_sessions`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `customer_email` (text)
      - `model_image` (text, URL to customer photo)
      - `result_image` (text, URL to try-on result)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Products: Users can only access their own products
    - Tryon sessions: Users can only access sessions for their products
    - Public access for try-on API endpoint
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  garment_image text,
  category text NOT NULL CHECK (category IN ('tops', 'dresses', 'bottoms', 'shoes', 'accessories')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tryon_sessions table
CREATE TABLE IF NOT EXISTS tryon_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  customer_email text NOT NULL,
  model_image text NOT NULL,
  result_image text,
  fashn_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tryon_sessions ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Users can view their own products"
  ON products
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON products
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON products
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public access for products (needed for try-on API)
CREATE POLICY "Public can read products for try-on"
  ON products
  FOR SELECT
  TO anon
  USING (true);

-- Tryon sessions policies
CREATE POLICY "Users can view sessions for their products"
  ON tryon_sessions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = tryon_sessions.product_id 
    AND products.user_id = auth.uid()
  ));

CREATE POLICY "Public can insert tryon sessions"
  ON tryon_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_tryon_sessions_product_id ON tryon_sessions(product_id);
CREATE INDEX IF NOT EXISTS idx_tryon_sessions_created_at ON tryon_sessions(created_at);

-- Create updated_at trigger for products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();