/*
  Rastreia e-mail de feedback enviado após desinstalação do app Shopify.
*/

CREATE TABLE IF NOT EXISTS shopify_uninstall_emails (
  shop_domain text PRIMARY KEY,
  shop_contact_email text NOT NULL,
  shop_country_code text,
  locale text NOT NULL CHECK (locale IN ('pt', 'es', 'en')),
  zoho_message_id text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shopify_uninstall_emails ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE shopify_uninstall_emails IS
  'Registro de e-mails de feedback enviados após desinstalação do app Shopify.';
