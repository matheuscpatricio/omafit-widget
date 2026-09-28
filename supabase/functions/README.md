# Supabase Edge Functions

Os nomes das pastas são as URLs (`/functions/v1/<nome>`). Não renomear: o widget, o tema e os webhooks Shopify chamam esses paths.

Não há `supabase/config.toml` neste repositório. `verify_jwt` é configuração de deploy, não está versionada aqui. A coluna **Auth no código** descreve o que o handler faz, não o gateway.

O widget manda a anon key em `apikey` e `Authorization` via `src/utils/supabaseFunctions.ts` (`getSupabaseFunctionHeaders`). Várias funções ignoram esse JWT e usam `SUPABASE_SERVICE_ROLE_KEY`.

## Commerce

| Function | Purpose | Called by | Auth no código | External services |
| --- | --- | --- | --- | --- |
| `collections` | CRUD da tabela de coleções do dashboard | `src/components/CollectionsPage.tsx` | exige header `Authorization`; cliente Supabase com anon key + JWT do usuário | Supabase |
| `get-products` | lista `products` (id, name, description, category, garment_image) | nenhum caller neste repo | cliente anon, sem checagem de usuário no handler | Supabase |
| `verify-prices` | confere quatro price ids fixos na Stripe | nenhum caller neste repo | sem checagem de identidade no handler; usa `STRIPE_SECRET_KEY` | Stripe |

## Try-on

| Function | Purpose | Called by | Auth no código | External services |
| --- | --- | --- | --- | --- |
| `tryon` | cria sessão e submete o job (fal ou self-hosted) | `TryOnWidget.tsx`, `WidgetGeneratorPage.tsx` | service role. Provider em `_shared/tryon-provider.ts` | fal.ai e/ou `SELF_HOSTED_TRYON_URL`; Supabase; `SHOPIFY_APP_URL` em um ramo |
| `tryon-status` | polling do job; id no último segmento do path | os mesmos dois | service role | fal.ai ou self-hosted; Supabase |
| `tryon-upload-url` | signed upload em `tryon-images` (`tryon-models` ou `tryon-garments`) | `src/services/tryonImagePrep.ts` | service role | Supabase Storage |
| `track-footwear-tryon` | fluxo/telemetria de try-on de calçado | `TryOnWidget.tsx`, `ShoeARWidget.tsx` | service role | Supabase; `SHOPIFY_APP_URL` |

`tryon/mediapipe-helper.ts` é biblioteca importada por `tryon`, não uma função deployável.

## AI

| Function | Purpose | Called by | Auth no código | External services |
| --- | --- | --- | --- | --- |
| `validate-size` | consultor / validação de tamanho (GPT) | `TryOnWidget.tsx` | service role + `OPENAI_API_KEY` | OpenAI, Supabase |
| `validate-footwear-chat` | chat de calçado | `ShoeARWidget.tsx` | `OPENAI_API_KEY` | OpenAI |

## Shopify lifecycle

| Function | Purpose | Called by | Auth no código | External services |
| --- | --- | --- | --- | --- |
| `shopify-app-uninstalled-webhook` | webhook `app/uninstalled` | Shopify (HMAC). Também referenciado em `legacy/shopify-app-old/shopify.server.js`, que não roda neste build | `verifyShopifyWebhook` com `SHOPIFY_API_SECRET` | Supabase, e-mail de uninstall |
| `shopify-welcome-email` | e-mail de boas-vindas na instalação | app Shopify (header de segredo). O helper legado está em `legacy/shopify-app-old/utils/welcome-email.server.js` | `SHOPIFY_WELCOME_EMAIL_SECRET` (`X-Shopify-Welcome-Email-Secret`) | Zoho Mail, Supabase |
| `shopify-uninstall-email` | e-mail de feedback de uninstall | webhook / chamada interna com o mesmo segredo | `SHOPIFY_WELCOME_EMAIL_SECRET` | Zoho Mail, Supabase |

## Outras

| Function | Purpose | Called by | Auth no código | External services |
| --- | --- | --- | --- | --- |
| `instagram-publish-carousel` | publica carrossel no Instagram | chamada HTTP com segredo; o script `scripts/instagram-publish-carousel.mjs` fala com a Graph API direto, sem passar por esta função | `INSTAGRAM_PUBLISH_SECRET` | Meta Graph (`_shared/instagram-graph.ts`) |
| `stripe-checkout` | Checkout Session | `src/hooks/useCheckout.ts` | `Authorization` validado com `supabase.auth.getUser` | Stripe, Supabase |
| `stripe-webhook` | eventos Stripe | Stripe | assinatura `stripe-signature` / `STRIPE_WEBHOOK_SECRET` | Stripe, Supabase |
| `omafit-config` | lê `widget_configurations` por `shop` (e coleção/gênero) | nenhum `functions/v1/omafit-config` neste repo. O nome parecido `omafit-config-update` é `postMessage` do `public/omafit-widget.js`, não esta função | service role; `shop` é query param | Supabase |

## Função usada pelo widget e ausente desta pasta

`src/utils/shopperProfile.ts` chama `/functions/v1/shopper-profile`. Não existe `supabase/functions/shopper-profile/` aqui. O handler está em outro projeto ou ainda não foi versionado neste repo. Não criar uma pasta com esse nome sem o contrato atual.

## `_shared/`

Import relativo entre funções (`../_shared/...`). Não é uma Edge Function.

| Módulo | Uso |
| --- | --- |
| `tryon-provider.ts` | escolhe fal vs self-hosted, faz `POST /jobs` e lê status. Contrato com `self-hosted-tryon/` |
| `supabase-storage-sign.ts` | assina URL de objeto Storage quando o bucket/path precisa |
| `shopify-webhook-verify.ts` | HMAC do webhook de uninstall |
| `shopify-shop-contact.ts` | resolve contato da loja |
| `shopify-welcome-templates.ts` | HTML/texto do e-mail de boas-vindas |
| `shopify-uninstall-email.ts` | envio do e-mail de uninstall |
| `shopify-uninstall-templates.ts` | template desse e-mail |
| `zoho-mail.ts` | OAuth e envio Zoho |
| `locale-from-country.ts` | locale a partir do país da loja |
| `instagram-graph.ts` | containers e publish da Graph API |

## Env lidas pelas funções (nomes)

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`, `TRYON_PROVIDER`, `SELF_HOSTED_TRYON_URL`, `SELF_HOSTED_TRYON_TOKEN`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SHOPIFY_WELCOME_EMAIL_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `INSTAGRAM_PUBLISH_SECRET`, `META_PAGE_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `META_GRAPH_API_VERSION`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNT_ID`, `ZOHO_FROM_ADDRESS`, `ZOHO_ACCOUNTS_URL`, `ZOHO_MAIL_API_URL`.

A chave da fal.ai usada no submit não é um único `FAL_KEY` de processo: `submitTryOnJob` recebe `providerApiKey` do caller (config da loja). `FAL_KEY` aparece no `.env.example` da raiz como nota para funções.
