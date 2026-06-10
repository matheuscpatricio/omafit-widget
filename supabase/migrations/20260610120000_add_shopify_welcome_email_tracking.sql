/*
  Rastreia e-mail de boas-vindas enviado após instalação do app Shopify.
*/

CREATE TABLE IF NOT EXISTS shopify_welcome_emails (
  shop_domain text PRIMARY KEY,
  shop_contact_email text NOT NULL,
  shop_country_code text,
  locale text NOT NULL CHECK (locale IN ('pt', 'es', 'en')),
  zoho_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shopify_welcome_emails ENABLE ROW LEVEL SECURITY;

ALTER TABLE shopify_shops
  ADD COLUMN IF NOT EXISTS shop_contact_email text,
  ADD COLUMN IF NOT EXISTS shop_country_code text,
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;

COMMENT ON TABLE shopify_welcome_emails IS
  'Registro de e-mails de boas-vindas enviados após instalação do app Shopify.';
COMMENT ON COLUMN shopify_shops.welcome_email_sent_at IS
  'Timestamp do e-mail de boas-vindas (espelhado quando a loja já existe em shopify_shops).';
