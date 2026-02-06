/*
  # Add collection_handle to size_charts

  1. Changes
    - Add `collection_handle` (text, nullable) to size_charts
    - Add index for faster lookups by (shop_domain, collection_handle, gender)
    - Add unique constraint to prevent duplicate charts for same handle+gender per shop
  
  2. Purpose
    - Allow direct lookup of size charts using Shopify collection handle
    - collection_handle = null means it's the default/global size chart for the shop
    - collection_handle = 'calca-jeans' means it's specific to that collection

  3. Notes
    - Backward compatible: existing records will have NULL collection_handle
    - Works alongside collection_id (UUID) for internal collections feature
    - When collection_handle is provided, it takes priority in lookups
*/

-- Add collection_handle column to size_charts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'size_charts' AND column_name = 'collection_handle'
  ) THEN
    ALTER TABLE size_charts ADD COLUMN collection_handle text;
  END IF;
END $$;

-- Create index for faster lookups by shop_domain + collection_handle + gender
CREATE INDEX IF NOT EXISTS idx_size_charts_shop_handle_gender 
  ON size_charts(shop_domain, collection_handle, gender);

-- Add partial unique constraint to prevent duplicate charts for same shop+handle+gender
-- Only when collection_handle IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS unique_shop_collection_handle_gender 
  ON size_charts(shop_domain, collection_handle, gender) 
  WHERE collection_handle IS NOT NULL;