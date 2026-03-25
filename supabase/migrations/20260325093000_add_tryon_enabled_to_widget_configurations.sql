/*
  Add tryon_enabled flag to widget_configurations

  - Default behavior: try-on enabled for all shops/rows.
  - Stored per `shop_domain` so we can disable try-on generation without disabling
    the whole widget experience (chat/cart/size flow).
  - RLS policies for widget_configurations already restrict updates to the owner row.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'widget_configurations'
      AND column_name = 'tryon_enabled'
  ) THEN
    ALTER TABLE widget_configurations
      ADD COLUMN tryon_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Helpful index for lookup by shop_domain (if not already present)
CREATE INDEX IF NOT EXISTS idx_widget_configurations_shop_domain_tryon
ON widget_configurations(shop_domain);

