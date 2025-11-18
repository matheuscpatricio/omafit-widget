/*
  # Fix Try-On Edge Function Permissions

  1. Changes
    - Add service_role policies for subscriptions table
    - Add service_role policies for widget_keys table (already has one for SELECT)
    - Add service_role policy for tryon_sessions table to allow updates

  2. Security
    - Service role can read subscriptions (needed for validation)
    - Service role can update widget_keys usage count
    - Service role can update tryon_sessions status
    - All existing user policies remain unchanged
*/

-- Allow service_role to read all subscriptions (needed for validation in edge function)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' 
    AND policyname = 'Service can read all subscriptions'
  ) THEN
    CREATE POLICY "Service can read all subscriptions"
      ON subscriptions
      FOR SELECT
      TO service_role
      USING (true);
  END IF;
END $$;

-- Allow service_role to update subscriptions (for incrementing usage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'subscriptions' 
    AND policyname = 'Service can update subscriptions'
  ) THEN
    CREATE POLICY "Service can update subscriptions"
      ON subscriptions
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow service_role to update widget_keys (for incrementing usage)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'widget_keys' 
    AND policyname = 'Service can update widget keys'
  ) THEN
    CREATE POLICY "Service can update widget keys"
      ON widget_keys
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Allow service_role to insert tryon_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tryon_sessions' 
    AND policyname = 'Service can insert tryon sessions'
  ) THEN
    CREATE POLICY "Service can insert tryon sessions"
      ON tryon_sessions
      FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Allow service_role to update tryon_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tryon_sessions' 
    AND policyname = 'Service can update tryon sessions'
  ) THEN
    CREATE POLICY "Service can update tryon sessions"
      ON tryon_sessions
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;