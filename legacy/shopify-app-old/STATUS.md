# `legacy/shopify-app-old`

Cópia preservada de uma porta incompleta de app Shopify (Remix / React Router framework). Não entra no build Vite, no lint TypeScript nem nas rotas de `src/App.tsx`.

## Evidência de que não é o app em execução

- `tsconfig.app.json` inclui apenas `src`.
- `vite.config.ts` não tem entrypoint em `app/`.
- Nenhum arquivo em `src/`, `scripts/`, `public/` ou `supabase/` importa `app/` ou `shopify.server.js`.
- `shopify.server.js` importa `@shopify/shopify-app-remix` e `@shopify/shopify-api`, pacotes que **não** estão em `package.json`. Esse arquivo não instala nem roda neste repositório.
- `root.jsx` importa `Links`, `Meta`, `Outlet` e `Scripts` de `react-router` (API de framework). O app real usa `react-router-dom` v6 dentro de `src/App.tsx`.
- O README original mostra um exemplo hipotético de como ligar as rotas no `App.tsx`. Essas rotas (`/app`, `/app/billing`, `/admin/billing/return`) não existem no router atual.
- `docs/historical/IMPLEMENTATION_SUMMARY.md` cita `app/routes/app.ar-eyewear_.calibrate.$assetId.jsx`, arquivo que não existe nem nesta pasta. A calibração AR de óculos do admin está no repositório `omafit`.

## O que esta pasta era

Uma tentativa de trazer telas de billing Shopify (planos, uso, analytics, widget) para dentro do widget, depois de remover loaders Remix. A autenticação server-side foi substituída, no texto do README, por `?shop=` e Supabase. O código de billing “server” (`utils/*.server.js`) ainda chama `authenticate` de `shopify.server.js`.

`@shopify/polaris` continua em `package.json` e em `optimizeDeps` / `ssr.noExternal` do Vite por causa desta UI. O bundle da SPA não importa Polaris. Essas entradas não foram removidas nesta organização.

## O que é o app Shopify de verdade

O admin embutido, o tema (`extensions/omafit-theme`) e o backend Railway estão no repositório [`omafit`](https://github.com/matheuscpatricio/omafit).

Neste repositório, o que permanece ativo para Shopify é:

- a experiência do shopper e o dashboard web em `src/` (`/dashboard`, `/cadastro-loja`, `/widget`, …);
- as Edge Functions `shopify-app-uninstalled-webhook`, `shopify-welcome-email` e `shopify-uninstall-email`;
- a cópia servida de `public/omafit-widget.js` e `public/ar/*`, sincronizada do tema.

## Remoção futura

Só remover esta pasta depois de confirmar que ninguém usa os exemplos de `docs/billing/` como especificação viva do admin. Os documentos de billing descrevem esta porta e o schema Supabase; não são o código do app `omafit`.
