/*
  # Fix widget_keys Functions - Replace key_name with name

  1. Changes
    - Update auto_create_widget_key_for_shop function to use 'name' instead of 'key_name'
    - Update auto_create_widget_key function to use 'name' instead of 'key_name'
  
  2. Security Notes
    - Maintains SECURITY DEFINER and search_path settings
    - Fixes column name mismatch that was causing HTTP 400 errors
*/

-- Fix auto_create_widget_key_for_shop function
CREATE OR REPLACE FUNCTION auto_create_widget_key_for_shop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO widget_keys (user_id, name, public_id)
  VALUES (
    NEW.user_id,
    'Default Widget Key',
    generate_widget_public_id()
  );
  RETURN NEW;
END;
$$;

-- Fix auto_create_widget_key function
CREATE OR REPLACE FUNCTION auto_create_widget_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO widget_keys (user_id, name, public_id)
  VALUES (
    NEW.id,
    'Default Widget Key',
    generate_widget_public_id()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;