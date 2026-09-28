# Omafit Widget

## Overview

Este repositório é a experiência do shopper e as superfícies web que a acompanham: landing, widget de provador, sizing no cliente, consultor, AR e um dashboard autenticado por Supabase.

O app Shopify (admin embutido, Theme App Extension, billing no admin, API de catálogo) é o repositório [`omafit`](https://github.com/matheuscpatricio/omafit). Os dois se encontram por HTTP, por assets copiados do tema e por Edge Functions. Não são o mesmo código.

O `package.json` ainda se chama `omafit-backend`. O processo que `npm run dev` sobe é o SPA Vite.

## Main Features

- size recommendation no cliente, com tabela de medidas e MediaPipe
- MediaPipe Tasks Vision (pose) para a foto do shopper
- virtual try-on assíncrono (Edge Function `tryon` → fal.ai ou GPU self-hosted)
- stylist / consultor via `validate-size` e utilitários em `src/utils/stylist*`
- AR de óculos, relógio, colar e pulseira (JS servido em `public/ar/`, iframe em `/widget`)
- suporte à integração Shopify: embed `public/omafit-widget.js`, postMessage, webhooks e e-mails de instalação nas Edge Functions

## Architecture

```text
Loja Shopify (tema no repo omafit)
        │  omafit-widget.js + postMessage
        ▼
SPA Vite  src/          Netlify (dist/)
  /widget  TryOnWidget + WidgetPage
  /widget-shoes  ShoeARWidget
        │
        ├── MediaPipe no browser
        ├── Supabase (auth, tabelas, storage)
        └── Edge Functions  supabase/functions/
                │
                ├── fal.ai
                └── self-hosted-tryon/   POST /jobs  (Redis + RQ + GPU)
```

Sizing e try-on generativo são fluxos diferentes. A recomendação de tamanho usa medidas e tabela (`src/utils/sizeCalculation.ts`). A imagem do provador sai do provider configurado em `supabase/functions/_shared/tryon-provider.ts`.

O dashboard em `/dashboard`, `/analytics`, `/cadastro-loja`, `/size-chart` é desta SPA (Supabase Auth). Não é o admin embutido da Shopify. Uma porta antiga desse admin está em `legacy/shopify-app-old/` e não faz parte do build. Ver [legacy/shopify-app-old/STATUS.md](legacy/shopify-app-old/STATUS.md).

## Repository Structure

```text
src/                  SPA React. Páginas, widget, sizing, stylist e AR de calçado convivem em components/
public/               estáticos servidos na raiz: embed, AR, testes manuais HTML, mídia
supabase/functions/   Edge Functions (nomes = URLs)
supabase/migrations/  SQL
self-hosted-tryon/    API FastAPI + worker GPU. Não é o frontend
scripts/              sync do tema, checagens AR, helpers de deploy/Instagram
docs/                 documentação por assunto
legacy/shopify-app-old/   porta Remix/Polaris não ligada ao Vite
```

Índice: [docs/README.md](docs/README.md).

Na raiz ficam configs (`package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `tailwind.config.js`, `postcss.config.js`, `netlify.toml`, `index.html`, `components.json`), exemplos de env (`.env.example`, `.env.example.billing`), `.bolt/` (metadado do template Bolt) e `omafit-logo-landing.png` (saída do script de export, não o asset de `public/brand/`).

## Frontend

Rotas em `src/App.tsx`:

| Path | Papel |
| --- | --- |
| `/` | landing |
| `/auth` | login / cadastro Supabase |
| `/privacidade`, `/contato` | páginas públicas |
| `/pricing` | planos Stripe da SPA |
| `/dashboard`, `/analytics`, `/account`, `/feedback` | área logada |
| `/cadastro-loja` | config da loja |
| `/widget-generator` | gerador do embed |
| `/size-chart` | tabelas de tamanho |
| `/collections` | coleções |
| `/widget` | provador (roupa e entrada do AR) |
| `/widget-shoes` | widget de calçado |

O código ainda não está em `src/features/`. Mapa, ciclos (não há no grafo estático) e o que não foi movido: [docs/architecture/frontend-refactor-plan.md](docs/architecture/frontend-refactor-plan.md).

Alias de import: `@/` → `src/` (Vite e `tsconfig.app.json`). A maior parte dos imports ainda é relativa.

## Supabase Edge Functions

Pastas em `supabase/functions/<nome>/`. Tabela de propósito, caller e auth: [supabase/functions/README.md](supabase/functions/README.md).

Grupos: commerce (`collections`, `get-products`, `verify-prices`), try-on (`tryon`, `tryon-status`, `tryon-upload-url`, `track-footwear-tryon`), AI (`validate-size`, `validate-footwear-chat`), ciclo Shopify (uninstall webhook e e-mails), mais Instagram, Stripe e `omafit-config`.

`src/utils/shopperProfile.ts` chama `/functions/v1/shopper-profile`. Essa função não está neste repositório.

## Self-hosted Inference

Pasta `self-hosted-tryon/`. FastAPI, Redis, RQ, worker GPU, storage local / Supabase / S3. A Edge Function é quem escolhe este backend.

- [self-hosted-tryon/ARCHITECTURE.md](self-hosted-tryon/ARCHITECTURE.md)
- [self-hosted-tryon/README.md](self-hosted-tryon/README.md)
- [docs/tryon/SELF_HOSTED_TRYON_DEPLOY.md](docs/tryon/SELF_HOSTED_TRYON_DEPLOY.md)

Não foi movido para `services/inference/`. Extração futura sugerida: repositório `omafit-inference`, não neste passo.

## Environment Variables

Só nomes. Valores ficam no ambiente, nunca no git.

SPA (`.env.example`):

`VITE_SITE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `FAL_KEY`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `META_PAGE_ACCESS_TOKEN`, `META_GRAPH_API_VERSION`, `INSTAGRAM_PUBLISH_SECRET`, `VITE_OMAFIT_APP_URL`, `VITE_OMAFIT_WIDGET_HMAC_SECRET`, `VITE_WIDGET_CATALOG_HMAC_SECRET`

Billing / Shopify (`.env.example.billing`):

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SHOPIFY_APP_URL`, `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `CRON_SECRET`, `SHOPIFY_WELCOME_EMAIL_SECRET`, `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN`, `ZOHO_ACCOUNT_ID`, `ZOHO_FROM_ADDRESS`, `ZOHO_ACCOUNTS_URL`, `ZOHO_MAIL_API_URL`

Try-on self-hosted (`self-hosted-tryon/.env.example`):

`FASHN_TRYON_AUTH_TOKEN`, `REDIS_URL`, `RQ_QUEUE_NAME`, `HOST`, `PORT`, `PUBLIC_BASE_URL`, `OUTPUT_STORAGE_BACKEND`, `OUTPUTS_DIR`, `WEIGHTS_DIR`, `RQ_JOB_TIMEOUT`, `RQ_RESULT_TTL`, `NUM_TIMESTEPS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_OUTPUT_BUCKET`, `SUPABASE_OUTPUT_PREFIX`, `S3_BUCKET_NAME`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT_URL`, `S3_PUBLIC_BASE_URL`, `S3_OUTPUT_PREFIX`, `OMAFIT_AR_WORKER_CONTEXT`

Edge Functions também leem `TRYON_PROVIDER`, `SELF_HOSTED_TRYON_URL`, `SELF_HOSTED_TRYON_TOKEN`, `OPENAI_API_KEY`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Lista alinhada ao código: [supabase/functions/README.md](supabase/functions/README.md).

## Local Development

```bash
npm install
npm run dev
```

`predev` roda `npm run sync:theme-ar`. Se `../omafit/extensions/omafit-theme/assets/` existir, os JS de AR e `public/omafit-widget.js` são recopados do tema. Sem o clone irmão, o script usa os arquivos já versionados em `public/`.

## Build

```bash
npm run build
```

Vite gera `dist/`. `prebuild` também sincroniza os assets do tema. `public/` é copiado para a raiz do `dist` sem passar pelo bundler do React.

## Deployment

- **SPA:** Netlify. `netlify.toml` usa `npm run build` e publica `dist/`. Headers de cache de `/ar/*` estão nesse arquivo e em `public/_headers`. `public/_redirects` manda o fallback para `index.html`.
- **Edge Functions:** deploy à parte (Supabase). Os nomes das funções são contrato. Há scripts em `scripts/` (`call-deploy-edge-function.mjs`, payloads JSON) usados com o fluxo de deploy já existente; eles não substituem o CLI oficial.
- **GPU:** `docker compose` dentro de `self-hosted-tryon/` na EC2. Ver o README dessa pasta.

## Testing

```bash
npm test
npm run lint
```

Vitest: `src/**/*.test.ts`, ao lado do código.

HTML de prova manual continua em `public/` porque o dev server precisa servi-los junto de `omafit-widget.js`. Motivo e URLs: [docs/architecture/manual-tests.md](docs/architecture/manual-tests.md).

Checagens de AR (não são o `npm test`): `npm run ar:ingest-validate`, `ar:qa-matrix`, `ar:meta-quest-audit`, `ar:certified-manifest-stub`.

## Relationship with `omafit`

| | `omafit` | `omafit-widget` (este repo) |
| --- | --- | --- |
| Quem usa | merchant no admin Shopify | shopper na loja e visitantes do site |
| Código | app Shopify, tema, billing server, API de catálogo (Railway), worker de malha AR | SPA, Edge Functions, serviço de inferência |
| Assets de vitrine | fonte em `extensions/omafit-theme/assets/` | cópia em `public/omafit-widget.js` e `public/ar/` via `npm run sync:theme-ar` |
| Try-on | não renderiza o widget | orquestra UI, upload, polling |
| Sizing | pode guardar tabela / config | calcula no cliente (`sizeCalculation.ts`) e conversa com `validate-size` |

O HMAC de busca de catálogo (`VITE_OMAFIT_WIDGET_HMAC_SECRET`) é o mesmo segredo da app Omafit que expõe `/api/widget/catalog-search`. O widget assina; o backend valida. Detalhe no `.env.example`.

## Known Technical Debt

Fatos deste checkout, sem proposta de correção embutida:

- `src/components/TryOnWidget.tsx` tem cerca de 6600 linhas (sessão, upload, polling, sizing, chat, UI). Auditoria: [docs/tryon/tryon-widget-audit.md](docs/tryon/tryon-widget-audit.md).
- `ShoeARWidget.tsx` (~2200), `WidgetPage.tsx` (~1400), `WidgetGeneratorPage.tsx` (~1300), `validate-size/index.ts` (milhares de linhas) concentram o mesmo tipo de risco.
- Services de try-on importam constants/types de `src/components/tryon/`. Não há ciclo estático, mas a camada está invertida.
- Três builds de AR não batem: `OMAFIT_AR_WIDGET_BUILD` em `public/ar/omafit-ar-widget.js` é `v350`, `OMAFIT_AR_MODULE_CACHE_BUST` em `WidgetPage.tsx` é `v349`, e o arquivo versionado commitado é `v344`. Mapa: [docs/architecture/generated-assets.md](docs/architecture/generated-assets.md).
- `public/omafit-widget.js` e parte de `public/ar/` são cópia do tema. Editar os dois lados diverge loja e iframe.
- `legacy/shopify-app-old/` não compila aqui (`@shopify/shopify-app-remix` não está nas dependências). `@shopify/polaris` segue no `package.json` e no `optimizeDeps` do Vite.
- Dependências do `package.json` sem import em `src/`: `firebase`, `@google-cloud/firestore`, `@fal-ai/client` (a fal do try-on é `npm:@fal-ai/client` dentro da Edge Function), `@splinetool/react-spline`, `@splinetool/runtime`, `gsap`, `@gsap/react`. Não foram removidas.
- Anon key de fallback está hardcoded em `src/lib/supabase.ts` e `src/utils/supabaseFunctions.ts`.
- `public/models/pose_landmarker_lite.task` não é referenciado. O runtime baixa o modelo do storage público do Google.
- `ProductDetails.tsx`, `ProductForm.tsx`, `WidgetCustomizer.tsx`, `CtaBlockSurface.tsx` e `omafit-ar-manifest-v1.ts` não têm consumidores no grafo de imports.
- Não há `supabase/config.toml`; `verify_jwt` das funções não está no git.
- `get-products`, `verify-prices` e a função HTTP `omafit-config` não têm caller neste repo. `omafit-config-update` é mensagem do embed, não essa função.
- Testes não cobrem polling, `tryonImagePrep`, nem `resolveTryOnProvider`. Prioridade: [docs/architecture/frontend-refactor-plan.md](docs/architecture/frontend-refactor-plan.md).
