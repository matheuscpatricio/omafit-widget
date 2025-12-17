/*
  # Add missing columns to widget_configurations

  1. Changes
    - Add `link_text` column (text) - Text for the widget call-to-action button
    - Add `store_logo` column (text) - URL for store logo
    - Add `primary_color` column (text) - Primary brand color for the widget
    - Add `widget_enabled` column (boolean) - Flag to enable/disable widget
  
  2. Notes
    - All columns use IF NOT EXISTS to prevent errors if already added
    - Default values ensure existing rows work properly
    - widget_enabled defaults to true for active widgets
*/

DO $$
BEGIN
  -- Add link_text column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'link_text'
  ) THEN
    ALTER TABLE widget_configurations 
    ADD COLUMN link_text text DEFAULT 'Experimente Agora';
  END IF;

  -- Add store_logo column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'store_logo'
  ) THEN
    ALTER TABLE widget_configurations 
    ADD COLUMN store_logo text;
  END IF;

  -- Add primary_color column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE widget_configurations 
    ADD COLUMN primary_color text DEFAULT '#8B5CF6';
  END IF;

  -- Add widget_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'widget_enabled'
  ) THEN
    ALTER TABLE widget_configurations 
    ADD COLUMN widget_enabled boolean DEFAULT true;
  END IF;
END $$;