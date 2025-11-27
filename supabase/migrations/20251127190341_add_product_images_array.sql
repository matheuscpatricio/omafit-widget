/*
  # Adicionar suporte para múltiplas imagens de produto

  1. Alterações
    - Adiciona coluna `images` do tipo jsonb para armazenar array de URLs de imagens
    - Mantém compatibilidade com coluna `garment_image` existente

  2. Notas
    - Array de imagens permite usuário escolher qual usar no try-on
    - Formato: ["url1", "url2", "url3"]
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'images'
  ) THEN
    ALTER TABLE products ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
