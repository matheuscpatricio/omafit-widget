-- Create subscriptions table
-- 
-- 1. New Tables
--    - subscriptions
--      - id (uuid, primary key)
--      - user_id (uuid, references auth.users)
--      - plan_id (text) - Plan identifier (basic, starter, growth, scale, enterprise)
--      - status (text) - Subscription status (active, canceled, expired)
--      - images_limit (integer) - Monthly image generation limit (-1 for unlimited)
--      - images_used (integer) - Images used in current period
--      - period_start (timestamptz) - Billing period start date
--      - period_end (timestamptz) - Billing period end date
--      - created_at (timestamptz)
--      - updated_at (timestamptz)
-- 
-- 2. Security
--    - Enable RLS on subscriptions table
--    - Add policy for authenticated users to read their own subscription
--    - Add policy for authenticated users to update their own subscription
-- 
-- 3. Notes
--    - Users start with basic plan by default
--    - Images reset at the start of each billing period
--    - Status active means subscription is currently valid

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL DEFAULT 'basic',
  status text NOT NULL DEFAULT 'active',
  images_limit integer NOT NULL DEFAULT 100,
  images_used integer NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT now(),
  period_end timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);