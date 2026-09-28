# Plano de refactor do frontend

Estado em 28/09/2026. **Nenhum arquivo de `src/` foi movido.** O alvo `src/features/*` + `src/pages/*` + `src/shared/*` fica para depois, com aprovação. Esta organização só documenta o mapa.

## Grafo de imports

Varredura estática dos `import` / `import()` em `src/**/*.ts(x)` (128 módulos TS, mais `index.css`):

- 0 imports internos não resolvidos.
- 0 ciclos no grafo estático.
- Maior fan-in: `src/lib/supabase.ts` (22), `src/lib/utils.ts` (17), `src/hooks/useAuth.ts` (13), `src/locales/widget-translations.ts` (7), `src/utils/parseTryonLayoutFromUrl.ts` (7).

O que o grafo não vê:

- `new URL('../workers/mediapipe.worker.ts', import.meta.url)` em `useMediaPipePose.ts`. O worker parece “órfão” e não é.
- `React.lazy(() => import(...))` em `App.tsx` entra no grafo (o regex pega `import()`).

## Imports frágeis

- `src/components/landing/magic/*.tsx` usa `../../../lib/utils`. Qualquer pasta extra quebra o relativo. O alias `@/` já existe no Vite e no `tsconfig.app.json` e quase não é usado (só alguns arquivos de try-on/ui).
- `src/services/tryonImagePrep.ts` importa constantes de `src/components/tryon/tryonWidgetConstants.ts`.
- `src/services/tryonProductContext.ts` importa types de `src/components/tryon/tryonWidgetTypes.ts`.
- `src/hooks/useShopperProfileController.ts` importa `SizeCalculator` e constantes do try-on.

Isso não forma ciclo, mas inverte a camada: service/hook depende de pasta de componente. Mover `services/` para `features/tryon/services/` sem levar constants/types quebra o build.

`TryOnWidget.tsx` importa dezenas de módulos (sizing, stylist, shopper, supabase, shells de layout). É o hub. Não é um arquivo “simples”.

## Arquivos sem import estático (não removidos)

| Arquivo | Leitura |
| --- | --- |
| `src/components/ProductDetails.tsx` | nenhum consumidor |
| `src/components/ProductForm.tsx` | nenhum consumidor |
| `src/components/WidgetCustomizer.tsx` | nenhum consumidor |
| `src/components/landing/CtaBlockSurface.tsx` | nenhum consumidor |
| `src/types/omafit-ar-manifest-v1.ts` | nenhum consumidor; o runtime AR é JS em `public/ar/` |

Prova de “não usado no bundle” não é prova de que o produto abandonou a ideia. Ficam até alguém confirmar.

## Por que não mover nem os arquivos pequenos

Mover `LandingPage.tsx` para `src/pages/` é um diff só de path, mas o pedido foi não fazer movimentação em massa e não mudar comportamento antes de aprovação. Um move de página mexe em `App.tsx`, em imports de landing e em testes que não existem para essas páginas. O ganho é navegação; o risco é um import esquecido em string ou doc. Adiado.

Arquivos que seriam o primeiro lote, se houver um PR só de paths:

1. `src/components/ui/*` → `src/shared/ui/*` (poucos consumidores, alias `@/components/ui/progress` precisa atualizar).
2. `src/lib/*` e `src/hooks/useMediaQuery.ts` → `src/shared/`.
3. Páginas de marketing (`LandingPage` + `components/landing`) num segundo PR, depois do alias estar consistente.

Não incluir nesse lote: `TryOnWidget.tsx`, `ShoeARWidget.tsx`, `WidgetPage.tsx`, `WidgetGeneratorPage.tsx`, `useMediaPipePose.ts`, `sizeCalculation.ts`, `validate-size` (Edge Function).

## Try-on

Auditoria e fatia proposta: [docs/tryon/tryon-widget-audit.md](../tryon/tryon-widget-audit.md).

## Testes — o que existe e a ordem do que falta

Vitest inclui só `src/**/*.test.ts` (`vite.config.ts`). Testes ficam ao lado do código. Não foram movidos para `tests/`.

Já cobertos:

| Arquivo | Área |
| --- | --- |
| `utils/sizeCalculation.test.ts` | sizing (não é licença para mudar a fórmula) |
| `utils/chartGenderScope.test.ts` | escopo de gênero da tabela |
| `services/tryonProductContext.test.ts` | contexto de produto |
| `services/tryonAssistantCopy.test.ts` | copy de fallback |
| `utils/productDisplayContext.test.ts` | display do produto |
| `utils/productImageGallery.test.ts` | galeria |
| `utils/resolveAnchorProductPrice.test.ts` | preço âncora |
| `utils/stylistClarification.test.ts` | clarificação do consultor |
| `utils/chatTryOnIntent.test.ts` | intenção de try-on no chat |
| `utils/storeProfile.test.ts` | perfil da loja |
| `utils/retailCalendar.test.ts` | calendário do stylist |
| `utils/shopperProfile.test.ts` | perfil (inclui path `shopper-profile`) |
| `utils/whatsappPilotAccess.test.ts` | piloto WhatsApp |

Prioridade do que **não** tem teste, sem escrever a suíte agora:

1. **Polling** (`TryOnWidget`, bloco de `tryon-status`). É o contrato com fal e com o self-hosted. Só dá para testar depois de extrair o agendador.
2. **Provider selection** (`supabase/functions/_shared/tryon-provider.ts`, `resolveTryOnProvider`). Não há runner Deno neste `npm test`. Um teste de unidade da função pura (fal explícito vs URL self-hosted vs default) é o próximo teste de maior valor e não precisa fatiar o widget.
3. **Image prep** (`tryonImagePrep.ts`): `getOptimizedRemoteTryOnImageUrl` é pura e não tem teste. Upload assinado depende de rede.
4. **Contexto de variante** já tem teste em `tryonProductContext.test.ts`; o buraco é o listener de `postMessage` dentro do widget, não o parser.
5. **Sizing**: já há `sizeCalculation.test.ts`. Não expandir em cima do algoritmo nesta leva.
6. **Stylist**: clarificação, calendário, perfil e intenção têm teste. Sem teste: `stylistContext.ts`, `stylistFeedbackParser.ts`, `occasionGarmentRules.ts`, e o prompt enorme de `validate-size`.
7. **Sanitização de stylist** no sentido de não vazar instrução/preço: olhar `stylistClarification` (coberto) e o que `validate-size` devolve. Isso é Edge Function, não o Vitest atual.

## Alvo (quando for feito)

```text
src/
  features/
    tryon/
    sizing/
    stylist/
    ar/
    widget/
    shopper-profile/
  pages/
  shared/
    ui/ hooks/ lib/ utils/ types/
  App.tsx
  main.tsx
```

A tabela abaixo é a classificação de cada arquivo de `src/` hoje. A coluna de nota vale para o grupo, não é uma instrução de move.

## Classificação

| Arquivo | Área | Nota |
| --- | --- | --- |
| `src/App.tsx` | shell | não mover; entry do Vite |
| `src/components/AccountSettingsPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/AdvancedAnalytics.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/AuthForm.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/CollectionsPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/ContactPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/DashboardPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/FeedbackPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/LandingPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/Layout.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/PricingPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/PrivacyPolicyPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/ProductDetails.tsx` | legado local não referenciado | nenhum import; não apagar sem confirmação de produto |
| `src/components/ProductForm.tsx` | legado local não referenciado | nenhum import; não apagar sem confirmação de produto |
| `src/components/ProtectedRoute.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/PublicRoute.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/ShoeARWidget.tsx` | ar | ShoeARWidget ~2200 linhas |
| `src/components/ShoeARWidgetPage.tsx` | ar | rota `/widget-shoes` |
| `src/components/ShopifyConfigPage.tsx` | pages / merchant | importado por App.tsx; mover só junto com o import da rota |
| `src/components/ShopperProfilePrompt.tsx` | shopper-profile | acoplado ao try-on |
| `src/components/ShopperWhatsAppOptInPrompt.tsx` | shopper-profile | acoplado ao try-on |
| `src/components/SizeCalculator.tsx` | sizing UI | SizeCalculator também é importado pelo hook de perfil |
| `src/components/SizeChartManagerNew.tsx` | sizing UI | rota `/size-chart`; não é o algoritmo |
| `src/components/TryOnWidget.tsx` | tryon central | não mover nem fatiar sem plano; ~6600 linhas |
| `src/components/WidgetCustomizer.tsx` | widget, sem consumidores | nenhum import estático; não apagar ainda |
| `src/components/WidgetGeneratorPage.tsx` | widget | rota `/widget-generator`; também chama `tryon` / `tryon-status`; ~1300 linhas |
| `src/components/WidgetPage.tsx` | widget | rota `/widget`; ~1400 linhas; URL versionada do AR |
| `src/components/landing/CtaBlockSurface.tsx` | landing, sem consumidores | nenhum import estático |
| `src/components/landing/FAQ.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/Footer.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/Hero.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/HeroDesktopSlides.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/HeroMobileSlides.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/ImpactStats.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/InstallPlatformModal.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/LandingSEO.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/Navbar.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/OmafitLogo.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/Pain.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/PainSolutionVideo.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/Pricing.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/Solution.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/magic/BorderBeam.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/magic/Marquee.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/landing/magic/ShimmerHeading.tsx` | landing | cluster coeso; imports relativos entre si e `../../../lib/utils` em magic/ |
| `src/components/magic/TryOnProgressShimmer.tsx` | tryon ui | progress shimmer |
| `src/components/tryon/TryOnInfoStartActions.tsx` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/TryOnLayoutShellHero.tsx` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/TryOnLayoutShellSidebar.tsx` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/TryonLayoutPendingSplash.tsx` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/shoeSidebarStepMeta.ts` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/sidebarShellTypes.ts` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/tryonLayoutSession.ts` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/tryonSidebarStepMeta.ts` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/tryonWidgetConstants.ts` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/tryonWidgetDebug.ts` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/tryon/tryonWidgetTypes.ts` | tryon (já parcialmente extraído) | services importam constants/types daqui |
| `src/components/ui/button.tsx` | shared/ui | shadcn; button tem vários consumidores |
| `src/components/ui/card.tsx` | shared/ui | shadcn; button tem vários consumidores |
| `src/components/ui/carousel.tsx` | shared/ui | shadcn; button tem vários consumidores |
| `src/components/ui/progress.tsx` | shared/ui | shadcn; button tem vários consumidores |
| `src/hooks/useAuth.ts` | auth / billing SPA | dashboard e pricing; não é o app Shopify |
| `src/hooks/useCheckout.ts` | auth / billing SPA | dashboard e pricing; não é o app Shopify |
| `src/hooks/useMediaPipePose.ts` | mediapipe | try-on e calçado; worker via new URL |
| `src/hooks/useMediaQuery.ts` | shared/hooks | landing |
| `src/hooks/useShopperProfileController.ts` | shopper-profile | importa SizeCalculator e constants do try-on |
| `src/hooks/useSubscription.ts` | auth / billing SPA | dashboard e pricing; não é o app Shopify |
| `src/hooks/useTryonLayoutPreference.ts` | tryon hooks | layout do widget |
| `src/hooks/useTryonMobileFullscreenChrome.ts` | tryon hooks | layout do widget |
| `src/index.css` | shell | não mover; entry do Vite |
| `src/lib/site.ts` | shared/lib | supabase.ts é o maior fan-in (22) |
| `src/lib/supabase.ts` | shared/lib | supabase.ts é o maior fan-in (22) |
| `src/lib/utils.ts` | shared/lib | supabase.ts é o maior fan-in (22) |
| `src/locales/widget-translations.ts` | widget i18n | fan-in 7 |
| `src/main.tsx` | shell | não mover; entry do Vite |
| `src/services/tryonAssistantCopy.test.ts` | tryon services teste | já testados em parte; dependem de components/tryon |
| `src/services/tryonAssistantCopy.ts` | tryon services | já testados em parte; dependem de components/tryon |
| `src/services/tryonImagePrep.ts` | tryon services | já testados em parte; dependem de components/tryon |
| `src/services/tryonProductContext.test.ts` | tryon services teste | já testados em parte; dependem de components/tryon |
| `src/services/tryonProductContext.ts` | tryon services | já testados em parte; dependem de components/tryon |
| `src/stripe-config.ts` | billing SPA | price ids do checkout |
| `src/types/omafit-ar-manifest-v1.ts` | ar types | sem imports; não é o runtime |
| `src/utils/arLoadAccelerator.ts` | ar | preload do módulo AR |
| `src/utils/bodyLengthReference.ts` | sizing | não alterar algoritmo |
| `src/utils/chartGenderScope.test.ts` | sizing teste | não alterar algoritmo |
| `src/utils/chartGenderScope.ts` | sizing | não alterar algoritmo |
| `src/utils/chatTryOnIntent.test.ts` | stylist teste | parte com teste |
| `src/utils/chatTryOnIntent.ts` | stylist | parte com teste |
| `src/utils/contrastText.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/isTryonWidgetEmbedded.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/mannequinAssets.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/mergeShopifyCollectionHandles.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/nonGarmentProduct.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/occasionGarmentRules.ts` | stylist | parte com teste |
| `src/utils/omafitCatalogClient.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/omafitEnv.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/parseTryonLayoutFromUrl.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/pickPreferredCollectionHandle.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/productDisplayContext.test.ts` | shared / commerce / widget teste | catálogo, produto, env, supabase, layout URL |
| `src/utils/productDisplayContext.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/productImageGallery.test.ts` | shared / commerce / widget teste | catálogo, produto, env, supabase, layout URL |
| `src/utils/productImageGallery.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/readHttpJsonResponse.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/readWidgetSearchBootstrap.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/resolveAnchorProductPrice.test.ts` | shared / commerce / widget teste | catálogo, produto, env, supabase, layout URL |
| `src/utils/resolveAnchorProductPrice.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/resolveSizeChart.ts` | sizing | não alterar algoritmo |
| `src/utils/retailCalendar.test.ts` | stylist teste | parte com teste |
| `src/utils/retailCalendar.ts` | stylist | parte com teste |
| `src/utils/secondaryTryOnCaption.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/shopifyPlanAccess.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/shopifyProductId.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/shopperProfile.test.ts` | shopper-profile teste | chama função shopper-profile ausente neste repo |
| `src/utils/shopperProfile.ts` | shopper-profile | chama função shopper-profile ausente neste repo |
| `src/utils/sizeCalculation.test.ts` | sizing teste | não alterar algoritmo |
| `src/utils/sizeCalculation.ts` | sizing | não alterar algoritmo |
| `src/utils/storeProfile.test.ts` | stylist teste | parte com teste |
| `src/utils/storeProfile.ts` | stylist | parte com teste |
| `src/utils/stylistClarification.test.ts` | stylist teste | parte com teste |
| `src/utils/stylistClarification.ts` | stylist | parte com teste |
| `src/utils/stylistContext.ts` | stylist | parte com teste |
| `src/utils/stylistFeedbackParser.ts` | stylist | parte com teste |
| `src/utils/supabaseFunctions.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/supabaseStorageDisplayUrl.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/utils/whatsappPilotAccess.test.ts` | shopper-profile teste | chama função shopper-profile ausente neste repo |
| `src/utils/whatsappPilotAccess.ts` | shopper-profile | chama função shopper-profile ausente neste repo |
| `src/utils/widgetFont.ts` | shared / commerce / widget | catálogo, produto, env, supabase, layout URL |
| `src/vite-env.d.ts` | shell | não mover; entry do Vite |
| `src/workers/mediapipe.worker.ts` | mediapipe worker | carregado por URL, não por import estático |
