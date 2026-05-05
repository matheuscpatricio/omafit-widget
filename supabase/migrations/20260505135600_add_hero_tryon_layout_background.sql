/*
  # Add hero try-on layout background

  Adds the configurable background image used by the Growth+ hero layout and
  expands the existing tryon_layout constraint to allow default | sidebar | hero.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'widget_configurations'
      AND column_name = 'tryon_layout_background_image'
  ) THEN
    ALTER TABLE public.widget_configurations
      ADD COLUMN tryon_layout_background_image text;
  END IF;
END $$;

COMMENT ON COLUMN public.widget_configurations.tryon_layout IS
  'Try-on iframe layout: default | sidebar | hero';

COMMENT ON COLUMN public.widget_configurations.tryon_layout_background_image IS
  'Public image URL used as the background for the Growth+ hero try-on layout.';

ALTER TABLE public.widget_configurations
  DROP CONSTRAINT IF EXISTS widget_configurations_tryon_layout_check;

ALTER TABLE public.widget_configurations
  ADD CONSTRAINT widget_configurations_tryon_layout_check
  CHECK (tryon_layout IN ('default', 'sidebar', 'hero'));
