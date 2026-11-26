# O que só o dono faz na conta VTEX

Este ambiente não tem login VTEX nem o projeto Supabase de produção. Nada abaixo foi executado contra a loja.

## 1. Aplicar o SQL no Supabase de produção

Arquivo: `supabase/migrations/20261124213000_link_vtex_store.sql`.

Ele cria `store_links`, `link_vtex_store`, `widget_owner_id`, `get_vtex_widget_flags` e preenche `size_charts.shop_domain` quando o usuário já tem um único domínio em `widget_keys`.

Sem esse SQL:

- omafit.co/vtex responde erro de função
- a PDP não resolve a tabela pelo `public_id`
- o consultor VTEX continua desligado

Não grave `shop_domain` na `widget_keys` do usuário. O trigger `ensure_shopify_widget_consistency` apaga o `user_id` e o try-on passa a exigir uma loja Shopify.

## 2. Conta sponsor e vendor

1. Crie ou escolha a conta VTEX que será a dona do app (sponsor). O nome da conta vira o `vendor`.
2. Se não for `omafit`, troque `vendor` em `vtex-app/manifest.json` e `OMAFIT_VENDOR` em `vtex-app/react/modules/constants.ts` **antes** do primeiro `vtex publish`. Depois de publicado o vendor não muda.
3. Instale o Toolbelt e entre:

```bash
npm install -g vtex
vtex login {conta-sponsor}
vtex use omafit-dev
cd vtex-app
vtex link
```

4. Na loja de teste (pode ser a própria conta sponsor, ou outra conta em que você instalou o app linkado):
   - Admin → `/admin/omafit`: cole o `public_id` (`wgt_pub_…`) do gerador em omafit.co.
   - Site Editor: bloco `omafit-pdp` na coluna de compra do produto.
   - Se a loja tiver `Content-Security-Policy` `frame-src`, inclua `https://omafit.co`.

## 3. Ligar a loja no painel Omafit

1. Entre em omafit.co, crie a chave em Gerador de Widget e a tabela em Tabela de Medidas.
2. Abra `/vtex`, digite só o nome da conta (`minhaloja`, sem `.myvtex.com`) e salve.
3. Confirme a assinatura ativa em Configurações da Conta. Sem assinatura o try-on responde que não há plano.
4. O identificador na vitrine é `{conta}.myvtex.com`, também no workspace de dev. Domínio próprio não entra na chave.

## 4. Publicar na App Store

```bash
cd vtex-app
vtex publish
vtex deploy
```

No portal [apps.vtex.com](https://apps.vtex.com), com a mesma conta sponsor:

- envie `vtex-app/docs/app-store/icon.jpg` (ou exporte um PNG 1024 se o formulário recusar JPG)
- cole os textos de `vtex-app/docs/app-store/listing.md` (pt, en, es)
- substitua os SVG de `vtex-app/docs/app-store/screenshots/` por prints reais do admin, da PDP e do widget aberto
- suporte: `contato@omafit.co` e `https://omafit.co`
- cobrança: gratuita na VTEX. O uso do provador continua na assinatura Omafit. Cobrar pela VTEX exigiria plano `billable` e um serviço de métrica que não existe.

## O que os outros repositórios não precisam

`omafit` (Shopify) e `omafit-nuvem` não mudam. A busca do consultor na VTEX usa `/api/catalog_system/pub/products/search` na própria vitrine, chamada pelo bloco, e volta ao iframe por `postMessage`. Não passa pelo Railway da app Shopify.

Limites reais, sem credencial VTEX:

- Catálogo que a API pública da vitrine não devolve (produto oculto, trade policy sem o item) não entra no consultor.
- O carrinho de uma sugestão só aceita um SKU que essa busca acabou de devolver. Um id arbitrário do iframe é recusado.
- Telemetria `suggestion-events` continua no backend Shopify e só segue se o build do widget tiver o HMAC. Na VTEX ela não é necessária para achar o produto.
- AR de calçado (`/widget-shoes`) segue sem campo de GLB. Sem URL de modelo, a página mostra o sapato de exemplo. O padrão do bloco é `/widget`.
