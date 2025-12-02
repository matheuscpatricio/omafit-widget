/*
  # Adicionar user_id em tryon_sessions

  ## Problema
  A tabela tryon_sessions não tem vínculo direto com o usuário (lojista).
  Atualmente, o vínculo é feito apenas via session_analytics, mas quando
  os analytics são limpos, perdemos a informação de qual usuário é dono da sessão.

  ## Solução
  1. Adicionar coluna user_id em tryon_sessions
  2. Criar índice para performance
  3. Adicionar foreign key para integridade
  4. Atualizar RLS policies para filtrar por user_id

  ## Nota
  - Sessões antigas (102 sessões) ficarão com user_id NULL temporariamente
  - Novas sessões terão user_id preenchido automaticamente pela edge function
*/

-- Adicionar coluna user_id
ALTER TABLE tryon_sessions 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_tryon_sessions_user_id 
  ON tryon_sessions(user_id);

-- Adicionar RLS policy para leitura
DROP POLICY IF EXISTS "Users can read own sessions" ON tryon_sessions;

CREATE POLICY "Users can read own sessions"
  ON tryon_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy para service role inserir
DROP POLICY IF EXISTS "Service role can insert sessions" ON tryon_sessions;

CREATE POLICY "Service role can insert sessions"
  ON tryon_sessions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy para service role atualizar
DROP POLICY IF EXISTS "Service role can update sessions" ON tryon_sessions;

CREATE POLICY "Service role can update sessions"
  ON tryon_sessions
  FOR UPDATE
  TO service_role
  USING (true);
