/*
  # Add tryon_layout to widget_configurations

  Layout do iframe try-on: `default` (atual) ou `sidebar` (painel esquerdo).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'widget_configurations'
      AND column_name = 'tryon_layout'
  ) THEN
    ALTER TABLE public.widget_configurations
      ADD COLUMN tryon_layout text NOT NULL DEFAULT 'default';
  END IF;
END $$;

COMMENT ON COLUMN public.widget_configurations.tryon_layout IS
  'Try-on iframe layout: default | sidebar';

ALTER TABLE public.widget_configurations
  DROP CONSTRAINT IF EXISTS widget_configurations_tryon_layout_check;

ALTER TABLE public.widget_configurations
  ADD CONSTRAINT widget_configurations_tryon_layout_check
  CHECK (tryon_layout IN ('default', 'sidebar'));
