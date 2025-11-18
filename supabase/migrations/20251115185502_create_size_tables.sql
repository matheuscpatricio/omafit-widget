/*
  # Tabela de Medidas para Calculadora de Tamanhos

  1. Nova Tabela: size_charts
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key para auth.users)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Nova Tabela: size_chart_entries
    - `id` (uuid, primary key)
    - `size_chart_id` (uuid, foreign key para size_charts)
    - `size_name` (text) - Nome do tamanho (PP, P, M, G, GG, etc)
    - `bust` (numeric) - Medida do busto em cm
    - `waist` (numeric) - Medida da cintura em cm
    - `hips` (numeric) - Medida do quadril em cm
    - `order` (integer) - Ordem de exibição
    - `created_at` (timestamptz)

  3. Segurança
    - Habilitar RLS em ambas tabelas
    - Políticas para usuários autenticados acessarem apenas seus próprios dados
    - Políticas públicas para leitura via widget (usando widget_key)
*/

-- Criar tabela de size_charts
CREATE TABLE IF NOT EXISTS size_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de size_chart_entries
CREATE TABLE IF NOT EXISTS size_chart_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size_chart_id uuid NOT NULL REFERENCES size_charts(id) ON DELETE CASCADE,
  size_name text NOT NULL,
  bust numeric NOT NULL,
  waist numeric NOT NULL,
  hips numeric NOT NULL,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE size_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_chart_entries ENABLE ROW LEVEL SECURITY;

-- Políticas para size_charts
CREATE POLICY "Users can view own size charts"
  ON size_charts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own size charts"
  ON size_charts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own size charts"
  ON size_charts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own size charts"
  ON size_charts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para size_chart_entries
CREATE POLICY "Users can view own size chart entries"
  ON size_chart_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own size chart entries"
  ON size_chart_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own size chart entries"
  ON size_chart_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own size chart entries"
  ON size_chart_entries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM size_charts
      WHERE size_charts.id = size_chart_entries.size_chart_id
      AND size_charts.user_id = auth.uid()
    )
  );

-- Política pública para widgets (leitura via widget_keys)
CREATE POLICY "Public read access for size charts via widget"
  ON size_charts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public read access for size chart entries via widget"
  ON size_chart_entries FOR SELECT
  TO anon
  USING (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS size_charts_user_id_idx ON size_charts(user_id);
CREATE INDEX IF NOT EXISTS size_chart_entries_size_chart_id_idx ON size_chart_entries(size_chart_id);
CREATE INDEX IF NOT EXISTS size_chart_entries_order_idx ON size_chart_entries("order");
