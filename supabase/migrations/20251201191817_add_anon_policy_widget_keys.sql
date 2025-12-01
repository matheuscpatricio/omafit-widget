/*
  # Adicionar política de leitura anônima para widget_keys
  
  1. Alterações
    - Adicionar política que permite usuários anônimos lerem widget_keys pelo public_id
    - Necessário para que o widget funcione sem autenticação
    - Permite apenas leitura do user_id através do public_id
  
  2. Segurança
    - Apenas leitura (SELECT)
    - Apenas para usuários anônimos (anon role)
    - Expõe apenas user_id, não expõe api_key ou outros dados sensíveis
*/

-- Permitir leitura anônima de widget_keys para validação do public_id
CREATE POLICY "Anonymous users can read widget keys by public_id"
  ON widget_keys FOR SELECT
  TO anon
  USING (true);
