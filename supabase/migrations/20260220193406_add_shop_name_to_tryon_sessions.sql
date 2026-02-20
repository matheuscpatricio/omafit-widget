/*
  # Adicionar campo shop_name à tabela tryon_sessions

  1. Alterações
    - Adiciona coluna `shop_name` (text, nullable) à tabela `tryon_sessions`
    - Este campo armazena o nome da loja de origem da sessão de try-on
    - Útil para rastreamento e analytics por loja

  2. Observações
    - Campo nullable para compatibilidade com sessões antigas
    - Não requer índice pois não será usado em queries frequentes
*/

-- Adicionar coluna shop_name à tabela tryon_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tryon_sessions' AND column_name = 'shop_name'
  ) THEN
    ALTER TABLE tryon_sessions ADD COLUMN shop_name text;
    COMMENT ON COLUMN tryon_sessions.shop_name IS 'Nome da loja de origem da sessão (para rastreamento)';
  END IF;
END $$;
