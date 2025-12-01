/*
  # Corrigir política de segurança para widget_keys
  
  1. Problema
    - Política anterior permitia leitura de TODAS as colunas para anônimos
    - Expunha a coluna `key` que é sensível (API key)
  
  2. Solução
    - Remover política permissiva
    - Widget deve fazer SELECT apenas das colunas necessárias
    - RLS já protege através do service_role para edge functions
  
  3. Segurança
    - Anônimos NÃO devem ter acesso direto à tabela widget_keys
    - Edge functions (com service_role) fazem a validação
*/

-- Remover política insegura
DROP POLICY IF EXISTS "Anonymous users can read widget keys by public_id" ON widget_keys;
