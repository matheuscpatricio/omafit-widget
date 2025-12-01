/*
  # Criar função segura para buscar user_id por public_id
  
  1. Nova Função
    - `get_widget_user_id(public_id text)` retorna apenas o user_id
    - Acessível para usuários anônimos
    - Não expõe dados sensíveis como api_key
  
  2. Segurança
    - Função SECURITY DEFINER executa com permissões do owner
    - Retorna apenas user_id, não expõe colunas sensíveis
    - Permite que widgets funcionem sem expor chaves
*/

-- Criar função para buscar user_id por public_id de forma segura
CREATE OR REPLACE FUNCTION get_widget_user_id(p_public_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id
  FROM widget_keys
  WHERE public_id = p_public_id
  AND status = 'active';
  
  RETURN v_user_id;
END;
$$;

-- Permitir execução para usuários anônimos
GRANT EXECUTE ON FUNCTION get_widget_user_id(text) TO anon;
GRANT EXECUTE ON FUNCTION get_widget_user_id(text) TO authenticated;
