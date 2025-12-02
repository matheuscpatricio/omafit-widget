/*
  # Corrigir Estrutura de User Measurements

  ## Problema
  - body_type estava armazenando string ao invés de índice + gênero
  - body_adjustment estava com nomes errados (slim/regular/plus ao invés de Justa/Na medida/Solta)
  - Faltava campo gender para determinar qual array de manequins usar

  ## Solução
  1. Alterar campos para armazenar índices numéricos
  2. Adicionar campo gender
  3. Adicionar campo fit_preference_index (0=Justa, 1=Na medida, 2=Solta)
  4. Manter body_type_index (0-4 dependendo do gênero)

  ## Estrutura
  - gender: 'male' ou 'female'
  - body_type_index: integer (0-4)
  - fit_preference_index: integer (0=Justa, 1=Na medida, 2=Solta)
  - recommended_size: text (vem da tabela size_charts do lojista)
*/

-- Adicionar novos campos
ALTER TABLE user_measurements 
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS body_type_index integer,
ADD COLUMN IF NOT EXISTS fit_preference_index integer;

-- Migrar dados antigos (temporário, para não perder dados de teste)
UPDATE user_measurements
SET 
  gender = 'female',
  body_type_index = CASE 
    WHEN body_type = 'hourglass' THEN 1
    WHEN body_type = 'pear' THEN 2
    WHEN body_type = 'rectangle' THEN 3
    WHEN body_type = 'apple' THEN 4
    ELSE 2
  END,
  fit_preference_index = CASE 
    WHEN body_adjustment = 'slim' THEN 0
    WHEN body_adjustment = 'regular' THEN 1
    WHEN body_adjustment = 'plus' THEN 2
    ELSE 1
  END
WHERE gender IS NULL;

-- Remover colunas antigas (opcional, mantendo por compatibilidade)
-- ALTER TABLE user_measurements DROP COLUMN body_type;
-- ALTER TABLE user_measurements DROP COLUMN body_adjustment;
