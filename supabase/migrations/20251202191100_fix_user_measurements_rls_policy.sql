/*
  # Corrigir Policy de Leitura de User Measurements

  ## Problema
  A policy atual não faz o JOIN correto com widget_keys, usando apenas ON (true)
  
  ## Solução
  Recriar a policy com JOIN correto via session_analytics para garantir
  que cada usuário veja apenas as medidas de sessões vinculadas a ele
*/

-- Dropar policy antiga
DROP POLICY IF EXISTS "Users can read own measurements" ON user_measurements;

-- Criar policy correta
CREATE POLICY "Users can read own measurements"
  ON user_measurements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM session_analytics sa
      WHERE sa.tryon_session_id = user_measurements.tryon_session_id
      AND sa.user_id = auth.uid()
    )
  );
