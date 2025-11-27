/*
  # Adicionar colunas de personalização do widget

  1. Alterações
    - Adiciona colunas para armazenar configurações do widget:
      - `link_color` (cor do texto do link)
      - `popup_color` (cor predominante do pop-up)
      - `store_name` (nome da loja)
      - `store_logo` (URL do logo da loja)
      - `font_family` (fonte do widget)

  2. Notas
    - Todas as colunas são opcionais (nullable)
    - Valores default mantêm compatibilidade com widgets existentes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_keys' AND column_name = 'link_color'
  ) THEN
    ALTER TABLE widget_keys ADD COLUMN link_color text DEFAULT '#810707';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_keys' AND column_name = 'popup_color'
  ) THEN
    ALTER TABLE widget_keys ADD COLUMN popup_color text DEFAULT '#810707';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_keys' AND column_name = 'store_name'
  ) THEN
    ALTER TABLE widget_keys ADD COLUMN store_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_keys' AND column_name = 'store_logo'
  ) THEN
    ALTER TABLE widget_keys ADD COLUMN store_logo text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_keys' AND column_name = 'font_family'
  ) THEN
    ALTER TABLE widget_keys ADD COLUMN font_family text DEFAULT 'Outfit, sans-serif';
  END IF;
END $$;
