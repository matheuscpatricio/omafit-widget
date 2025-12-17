/*
  # Add shop_domain column and update defaults

  1. Changes
    - Add `shop_domain` column (text, unique, not null) - Shopify store domain identifier
    - Update `link_text` default to 'Experimentar virtualmente'
    - Update `primary_color` default to '#810707'
  
  2. Notes
    - shop_domain is required for Shopify integration
    - Using IF NOT EXISTS to prevent errors
    - Defaults only affect new rows, existing rows keep their current values
*/

DO $$
BEGIN
  -- Add shop_domain column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_configurations' AND column_name = 'shop_domain'
  ) THEN
    ALTER TABLE widget_configurations 
    ADD COLUMN shop_domain text UNIQUE NOT NULL;
  END IF;
END $$;

-- Update default for link_text
ALTER TABLE widget_configurations 
ALTER COLUMN link_text SET DEFAULT 'Experimentar virtualmente';

-- Update default for primary_color
ALTER TABLE widget_configurations 
ALTER COLUMN primary_color SET DEFAULT '#810707';