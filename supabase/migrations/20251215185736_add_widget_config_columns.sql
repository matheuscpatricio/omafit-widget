/*
  # Adicionar colunas de configuração do widget

  ## Alterações
  1. Adicionar colunas para personalização completa do widget
     - link_text: Texto do botão "Experimentar virtualmente"
     - background_color: Cor de fundo do modal
     - text_color: Cor do texto
     - overlay_color: Cor do overlay (fundo do modal)
  
  ## Nota
  - Valores padrão compatíveis com o código atual do widget
  - Permite personalização completa por loja
*/

-- Adicionar colunas de configuração
ALTER TABLE widget_keys 
ADD COLUMN IF NOT EXISTS link_text text DEFAULT 'Experimentar virtualmente';

ALTER TABLE widget_keys 
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#ffffff';

ALTER TABLE widget_keys 
ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#810707';

ALTER TABLE widget_keys 
ADD COLUMN IF NOT EXISTS overlay_color text DEFAULT '#810707CC';

-- Renomear colunas antigas para manter consistência (se ainda não foram renomeadas)
-- link_color vira primary_color (cor principal)
-- popup_color vira secondary_color (não usado, mas mantém compatibilidade)

DO $$
BEGIN
  -- Adicionar primary_color se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'widget_keys' AND column_name = 'primary_color'
  ) THEN
    ALTER TABLE widget_keys ADD COLUMN primary_color text DEFAULT '#810707';
    
    -- Copiar valores de link_color para primary_color
    UPDATE widget_keys SET primary_color = link_color WHERE link_color IS NOT NULL;
  END IF;
END $$;
