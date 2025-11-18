-- Add INSERT policy for subscriptions table
-- Allow authenticated users to create their own subscription

CREATE POLICY "Users can create own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);