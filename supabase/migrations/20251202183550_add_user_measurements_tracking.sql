/*
  # Adicionar Rastreamento de Medidas dos Usuários

  ## Descrição
  Cria tabela para armazenar as medidas dos usuários que usam a calculadora de tamanho
  no widget, permitindo analytics sobre altura, peso, tipo de corpo e tamanhos recomendados.

  ## Tabelas Criadas
  1. `user_measurements`
    - `id` (uuid, primary key)
    - `tryon_session_id` (uuid, foreign key)
    - `height` (integer) - altura em cm
    - `weight` (decimal) - peso em kg
    - `body_type` (text) - tipo de corpo escolhido (ex: 'hourglass', 'pear', 'apple', 'rectangle')
    - `recommended_size` (text) - tamanho recomendado (ex: 'P', 'M', 'G', 'GG')
    - `body_adjustment` (text) - ajuste aplicado no corpo (ex: 'slim', 'regular', 'plus')
    - `created_at` (timestamp)

  ## Segurança
  - RLS habilitado
  - Policies para leitura e escrita baseadas em autenticação
*/

-- Criar tabela de medidas dos usuários
CREATE TABLE IF NOT EXISTS user_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tryon_session_id uuid REFERENCES tryon_sessions(id) ON DELETE CASCADE,
  height integer,
  weight decimal(5,2),
  body_type text,
  recommended_size text,
  body_adjustment text DEFAULT 'regular',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_measurements ENABLE ROW LEVEL SECURITY;

-- Policy para service role (edge functions)
CREATE POLICY "Service role can insert measurements"
  ON user_measurements
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy para usuários autenticados lerem suas próprias medidas
CREATE POLICY "Users can read own measurements"
  ON user_measurements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tryon_sessions ts
      JOIN widget_keys wk ON true
      WHERE ts.id = user_measurements.tryon_session_id
      AND wk.user_id = auth.uid()
    )
  );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_measurements_session 
  ON user_measurements(tryon_session_id);

CREATE INDEX IF NOT EXISTS idx_user_measurements_created 
  ON user_measurements(created_at DESC);
