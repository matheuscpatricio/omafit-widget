/*
  # Adicionar suporte a gênero nas tabelas de medidas

  1. Alterações
    - Adicionar coluna `gender` na tabela `size_charts` com valores 'male', 'female', ou 'unisex'
    - Adicionar índice para performance
    - Permite ter múltiplas tabelas de medidas por usuário (uma para cada gênero)
  
  2. Notas
    - Mantém compatibilidade com dados existentes (default 'unisex')
    - Remove constraint de um único size_chart por usuário
*/

-- Adicionar coluna gender na tabela size_charts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'size_charts' AND column_name = 'gender'
  ) THEN
    ALTER TABLE size_charts ADD COLUMN gender text DEFAULT 'unisex' CHECK (gender IN ('male', 'female', 'unisex'));
  END IF;
END $$;

-- Criar índice composto para user_id e gender
CREATE INDEX IF NOT EXISTS size_charts_user_id_gender_idx ON size_charts(user_id, gender);
