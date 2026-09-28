# Billing

Guias escritos para a integração Shopify Billing. O código de UI/server que eles citam como `app/` está preservado em [`legacy/shopify-app-old/`](../../legacy/shopify-app-old/) e **não** é compilado pelo Vite.

O billing que o merchant usa no admin Shopify vive no repositório `omafit`. Neste repo, o checkout Stripe da SPA está em `src/hooks/useCheckout.ts` e nas Edge Functions `stripe-checkout` e `stripe-webhook`.

| Arquivo | Conteúdo |
| --- | --- |
| `SHOPIFY_BILLING_GUIDE.md` | Guia principal |
| `QUICK_START_BILLING.md` | Atalho operacional |
| `BILLING_INTEGRATION_EXAMPLES.md` | Exemplos (ainda importam `shopify.server`) |
| `BILLING_GUARD_EXAMPLES.md` | Exemplos de guard |
| `BILLING_FILES_INDEX.md` | Índice da época |

Variáveis de exemplo (sem valores) continuam em `.env.example.billing` na raiz.
