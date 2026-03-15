/*
  # 50 imagens gratuitas (uma única vez) no plano Free

  ## Mudanças
  - Adiciona coluna `initial_free_images` em shopify_shops
  - Lojas free recebem 50 imagens grátis na criação da conta
  - Após 50, cobra-se US$ 0,18 por imagem
*/

ALTER TABLE shopify_shops
ADD COLUMN IF NOT EXISTS initial_free_images integer DEFAULT 0;

-- Novas contas free recebem 50 via upsertShopBilling (apenas na criação)
