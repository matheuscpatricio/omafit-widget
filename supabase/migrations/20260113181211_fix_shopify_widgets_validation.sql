/*
  # Garantir integridade dos widgets Shopify
  
  1. Adicionar constraint para garantir que:
     - Widgets Shopify (com shop_domain) devem ter user_id NULL
     - Widgets regulares (sem shop_domain) devem ter user_id preenchido
  
  2. Criar trigger para auto-corrigir widgets Shopify ao inserir/atualizar
  
  3. Corrigir widgets Shopify existentes que estejam incorretos
  
  ## Segurança
  - Garante que a lógica de validação de billing funcione corretamente
  - Previne confusão entre widgets Shopify e regulares
*/

-- 1. Corrigir todos os widgets Shopify existentes que tenham user_id preenchido
UPDATE widget_keys
SET user_id = NULL
WHERE shop_domain IS NOT NULL
  AND user_id IS NOT NULL;

-- 2. Criar função para garantir consistência de widgets Shopify
CREATE OR REPLACE FUNCTION ensure_shopify_widget_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Se tem shop_domain (é Shopify), forçar user_id = NULL
  IF NEW.shop_domain IS NOT NULL THEN
    NEW.user_id := NULL;
  END IF;
  
  -- Se não tem shop_domain (é regular), garantir que user_id está preenchido
  IF NEW.shop_domain IS NULL AND NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Regular widgets (without shop_domain) must have a user_id';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger que executa antes de INSERT e UPDATE
DROP TRIGGER IF EXISTS validate_widget_type ON widget_keys;

CREATE TRIGGER validate_widget_type
  BEFORE INSERT OR UPDATE ON widget_keys
  FOR EACH ROW
  EXECUTE FUNCTION ensure_shopify_widget_consistency();

-- 4. Adicionar comentário explicativo na tabela
COMMENT ON COLUMN widget_keys.user_id IS 'NULL para widgets Shopify (identificados pelo shop_domain). Preenchido para widgets regulares.';
COMMENT ON COLUMN widget_keys.shop_domain IS 'Domínio da loja Shopify. Se preenchido, user_id deve ser NULL.';
