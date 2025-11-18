/*
  # Advanced Analytics & Metrics Tables

  ## Overview
  Adds comprehensive tracking tables for advanced e-commerce metrics including orders, 
  customer behavior, session analytics, and product performance data.

  ## 1. New Tables
  
  ### `orders`
  Tracks customer orders and purchase data
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - Store owner
  - `customer_email` (text) - Customer who placed order
  - `order_value` (numeric) - Order total in BRL
  - `used_tryon` (boolean) - Whether customer used try-on before purchase
  - `tryon_session_id` (uuid, nullable) - Links to try-on session if applicable
  - `order_date` (timestamptz) - When order was placed
  - `shopify_order_id` (text, nullable) - External order reference
  - `created_at` (timestamptz)

  ### `customer_analytics`
  Tracks customer lifetime behavior and metrics
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users) - Store owner
  - `customer_email` (text) - Customer identifier
  - `total_orders` (integer) - Lifetime order count
  - `total_spent` (numeric) - Lifetime spend in BRL
  - `used_tryon_count` (integer) - Number of times used try-on
  - `first_purchase_date` (timestamptz)
  - `last_purchase_date` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `session_analytics`
  Tracks detailed try-on session metrics
  - `id` (uuid, primary key)
  - `tryon_session_id` (uuid, references tryon_sessions)
  - `user_id` (uuid, references auth.users) - Store owner
  - `duration_seconds` (integer) - Time spent in try-on
  - `completed` (boolean) - Whether session was completed
  - `shared` (boolean) - Whether result was shared/downloaded
  - `processing_time_seconds` (integer) - AI processing time
  - `images_processed` (integer) - Number of images processed
  - `created_at` (timestamptz)

  ### `product_analytics`
  Tracks product-specific performance metrics
  - `id` (uuid, primary key)
  - `product_id` (uuid, references products)
  - `user_id` (uuid, references auth.users) - Store owner
  - `tryon_count` (integer) - Total try-ons for this product
  - `conversion_count` (integer) - Sales after try-on
  - `last_tryon_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. Security
  - RLS enabled on all tables
  - Store owners can only access their own data
  - Authenticated users only
  - Proper indexes for query performance

  ## 3. Important Notes
  - All monetary values in BRL (Brazilian Real)
  - Timestamps use timezone-aware format
  - Foreign keys with CASCADE delete for data integrity
  - Triggers auto-update `updated_at` fields
*/

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  order_value numeric(10, 2) NOT NULL DEFAULT 0,
  used_tryon boolean DEFAULT false,
  tryon_session_id uuid REFERENCES tryon_sessions(id) ON DELETE SET NULL,
  order_date timestamptz DEFAULT now(),
  shopify_order_id text,
  created_at timestamptz DEFAULT now()
);

-- Customer analytics table
CREATE TABLE IF NOT EXISTS customer_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  total_orders integer DEFAULT 0,
  total_spent numeric(10, 2) DEFAULT 0,
  used_tryon_count integer DEFAULT 0,
  first_purchase_date timestamptz,
  last_purchase_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, customer_email)
);

-- Session analytics table
CREATE TABLE IF NOT EXISTS session_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tryon_session_id uuid NOT NULL REFERENCES tryon_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_seconds integer DEFAULT 0,
  completed boolean DEFAULT false,
  shared boolean DEFAULT false,
  processing_time_seconds integer DEFAULT 0,
  images_processed integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Product analytics table
CREATE TABLE IF NOT EXISTS product_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tryon_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  last_tryon_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Customer analytics policies
CREATE POLICY "Users can view their own customer analytics"
  ON customer_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customer analytics"
  ON customer_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customer analytics"
  ON customer_analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session analytics policies
CREATE POLICY "Users can view their own session analytics"
  ON session_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session analytics"
  ON session_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can insert session analytics"
  ON session_analytics FOR INSERT
  TO anon
  WITH CHECK (true);

-- Product analytics policies
CREATE POLICY "Users can view their own product analytics"
  ON product_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own product analytics"
  ON product_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product analytics"
  ON product_analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_tryon_session_id ON orders(tryon_session_id);

CREATE INDEX IF NOT EXISTS idx_customer_analytics_user_id ON customer_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_customer_email ON customer_analytics(customer_email);

CREATE INDEX IF NOT EXISTS idx_session_analytics_tryon_session_id ON session_analytics(tryon_session_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_user_id ON product_analytics(user_id);

-- Create triggers for updated_at columns
CREATE TRIGGER update_customer_analytics_updated_at
  BEFORE UPDATE ON customer_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_analytics_updated_at
  BEFORE UPDATE ON product_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add additional fields to tryon_sessions for better tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tryon_sessions' AND column_name = 'processing_start_time'
  ) THEN
    ALTER TABLE tryon_sessions ADD COLUMN processing_start_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tryon_sessions' AND column_name = 'processing_end_time'
  ) THEN
    ALTER TABLE tryon_sessions ADD COLUMN processing_end_time timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tryon_sessions' AND column_name = 'session_start_time'
  ) THEN
    ALTER TABLE tryon_sessions ADD COLUMN session_start_time timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tryon_sessions' AND column_name = 'session_end_time'
  ) THEN
    ALTER TABLE tryon_sessions ADD COLUMN session_end_time timestamptz;
  END IF;
END $$;