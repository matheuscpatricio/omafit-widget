/*
  # Adicionar Medidas Flexíveis

  1. Mudanças na Tabela size_chart_entries
    - Adicionar coluna `measurements` (jsonb) para suportar qualquer combinação de 3 medidas
    - Tornar colunas bust, waist, hips nullable (mantidas para retrocompatibilidade)
    - Adicionar coluna `measurement_labels` (jsonb) para armazenar os nomes das 3 medidas

  2. Formato dos Dados
    - `measurements`: { "medida1": 88, "medida2": 70, "medida3": 95 }
    - `measurement_labels`: ["Busto", "Cintura", "Quadril"] ou ["Comprimento", "Tornozelo", "Ombro"]
    
  3. Notas
    - Sistema mantém retrocompatibilidade com bust/waist/hips
    - Novo sistema permite qualquer combinação de 3 medidas
    - O cálculo de tamanho continua usando 3 valores independente dos nomes
*/

-- Adicionar coluna measurements como JSONB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'size_chart_entries' AND column_name = 'measurements'
  ) THEN
    ALTER TABLE size_chart_entries ADD COLUMN measurements jsonb;
  END IF;
END $$;

-- Adicionar coluna measurement_labels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'size_chart_entries' AND column_name = 'measurement_labels'
  ) THEN
    ALTER TABLE size_chart_entries ADD COLUMN measurement_labels jsonb DEFAULT '["Busto", "Cintura", "Quadril"]'::jsonb;
  END IF;
END $$;

-- Tornar bust, waist, hips nullable para retrocompatibilidade
ALTER TABLE size_chart_entries 
  ALTER COLUMN bust DROP NOT NULL,
  ALTER COLUMN waist DROP NOT NULL,
  ALTER COLUMN hips DROP NOT NULL;

-- Migrar dados existentes para o novo formato
UPDATE size_chart_entries 
SET measurements = jsonb_build_object(
  'medida1', bust,
  'medida2', waist,
  'medida3', hips
)
WHERE measurements IS NULL AND bust IS NOT NULL;

-- Adicionar uma coluna para o size_charts indicar quais medidas usar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'size_charts' AND column_name = 'measurement_names'
  ) THEN
    ALTER TABLE size_charts ADD COLUMN measurement_names jsonb DEFAULT '["Busto", "Cintura", "Quadril"]'::jsonb;
  END IF;
END $$;

-- Criar índice para buscas em measurements
CREATE INDEX IF NOT EXISTS size_chart_entries_measurements_idx 
ON size_chart_entries USING gin(measurements);