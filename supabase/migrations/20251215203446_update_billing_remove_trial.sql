/*
  # Remover trial dos planos de billing

  ## Mudanças
  - Remove coluna `trial_days` da tabela `billing_plans`
  - Atualiza planos existentes para não ter trial
*/

-- Remover coluna trial_days se existir
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'billing_plans' 
    AND column_name = 'trial_days'
  ) THEN
    ALTER TABLE billing_plans DROP COLUMN trial_days;
  END IF;
END $$;
