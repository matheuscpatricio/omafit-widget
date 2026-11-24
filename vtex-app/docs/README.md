# Omafit para VTEX IO

App VTEX IO que coloca o widget Omafit (provador, recomendação de tamanho e consultor) na página de produto e guarda a configuração do lojista no Admin. O widget em si continua sendo o que este repositório já publica em `https://omafit.co/widget`. O app não reimplementa try-on, tabela nem consultor.

O encaixe segue o que a loja Shopify (`omafit`) e a Nuvemshop (`omafit-nuvem`) já fazem: um botão na PDP abre um iframe do widget e manda o produto (nome, imagens, SKUs/tamanhos, categoria), o `publicId` e o identificador da loja. Na Shopify isso é o domínio `*.myshopify.com`. Na Nuvemshop é `nuvemshop/{storeId}` mais um bootstrap da API da app. Na VTEX o identificador é `{conta}.myvtex.com`.

## O que o lojista instala

| Peça | Onde aparece |
| --- | --- |
| Bloco `omafit-pdp` | Site Editor, no template de produto |
| Admin `/admin/omafit` | Store Setup (Admin v3) e Storefront (Admin v4) |
| `settingsSchema` | Apps instalados → Omafit → Configurações. Grava os mesmos campos |

O bloco lê o produto com `vtex.product-context` (nome, `linkText`, imagens, itens/SKUs, variações de tamanho e cor, árvore de categoria). O idioma da loja (`pt`, `en`, `es`) vai na URL do iframe. O carrinho do produto atual usa `vtex.order-items` e só aceita um SKU que está nesse produto.

Textos do bloco e do admin existem em `messages/pt.json`, `messages/en.json` e `messages/es.json`.

## Identificador da loja

O try-on (`supabase/functions/tryon/index.ts`) e `src/utils/shopperProfile.ts` normalizam o shop domain e **cortam tudo depois da primeira barra**. `vtex/minhaconta` viraria `vtex` para todas as contas. Por isso o app envia:

```text
{conta}.myvtex.com
```

A conta é a do `useRuntime().account`, em minúsculas. Workspace (`{workspace}--{conta}.myvtex.com`) e domínio próprio não entram nessa chave: dev e produção compartilham a mesma loja Omafit. O admin mostra o valor e tem um botão para copiar.

## Como ligar num workspace (sem publicar)

O `vendor` do `manifest.json` tem de ser o nome da conta VTEX que é dona do app. Neste repositório está `omafit`. Se a conta for outra, troque **antes do primeiro** `vtex publish`:

- `vendor` em `manifest.json`
- `OMAFIT_VENDOR` em `react/modules/constants.ts`

Os dois precisam continuar iguais. `node scripts/validate.mjs` confere isso. Depois de publicado, o vendor não muda.

```bash
npm install -g vtex
vtex login {conta}
vtex use omafit-dev
cd vtex-app
vtex link
```

`vtex link` sobe o app no workspace de desenvolvimento e instala. Não há token VTEX neste ambiente, então o link não foi executado aqui.

No Site Editor, abra o template de produto e adicione o bloco **Omafit** (`omafit-pdp`), em geral na coluna de compra, perto do botão de comprar. No tema, o equivalente é:

```json
"flex-layout.col#right-col": {
  "children": [
    "product-name",
    "product-price",
    "omafit-pdp",
    "buy-button"
  ]
}
```

No Admin, abra `/admin/omafit` (ou Store Setup → Omafit → Widget). Cole o ID público (`wgt_pub_…`) gerado em [omafit.co](https://omafit.co) no gerador do widget (`/widget-generator`). Não cole a chave privada. Salve. O bloco some enquanto o ID estiver vazio ou o interruptor estiver desligado.

Props do bloco no Site Editor, se preenchidas, substituem o ID e o texto do botão salvos no admin. Servem para um teste rápido quando o `getSettings` do storefront ainda não devolve a configuração.

Abra uma PDP no workspace. O botão abre o iframe em `https://omafit.co/widget` com nome, imagem, id, handle, categoria, tamanhos e o shop domain. O `postMessage` repete o catálogo de SKUs (o mesmo formato que `omafit-widget.js` manda no tema Shopify: `productCatalog.sizes`, `colors`, `variants` com `selectedOptions`). Adicionar ao carrinho a partir do tamanho recomendado só funciona para um SKU desta PDP.

Se a loja tiver `Content-Security-Policy` com `frame-src`, inclua `https://omafit.co`. O iframe carrega no navegador do shopper. O app não tem builder `node`, então não declara `outbound-access`.

## O que já funciona sem mudança de backend

- O iframe abre o widget deste repositório (`/widget`) com os dados do produto VTEX.
- O try-on aceita o `publicId` de um usuário Omafit (`widget_keys.user_id` preenchido) com linha ativa em `subscriptions`. É o ID do gerador do widget em omafit.co, não uma chave só de Shopify (`user_id` nulo). Chave só de Shopify cai em `shopify_shops` e responde que a loja não está instalada.
- Cor, texto, layout (`default`, `hero`, `sidebar`) e gênero padrão vão na URL. Se não existir `widget_configurations` para `{conta}.myvtex.com`, o widget segue com esses valores. Se a linha existir e `tryon_enabled` for falso, o try-on desliga, como nas outras plataformas.
- pt-BR, en e es saem de `culture.locale`.

## O que falta (não foi simulado)

Nada disto foi inventado no app. Precisa do dono do Omafit, com acesso ao Supabase e, para o consultor, ao backend Railway da app Shopify.

1. **Tabelas de tamanho.** O widget na vitrine busca `size_charts` com `.eq('shop_domain', shop)` (`src/utils/resolveSizeChart.ts`). O editor em `src/components/SizeChartManagerNew.tsx` grava `user_id` e não preenche `shop_domain`. Uma tabela criada no dashboard atual não aparece na PDP VTEX. Falta gravar `size_charts.shop_domain = '{conta}.myvtex.com'` (e `collection_handle` / `product_handle` quando a tabela não for a padrão da loja). O slug de categoria que o bloco envia é o nome da categoria folha, sem acento, em minúsculas, com hífens (`Camisetas` → `camisetas`).
2. **Não há instalação VTEX** em `matheuscpatricio/omafit` nem em `matheuscpatricio/omafit-nuvem`. A Nuvemshop cria `nuvemshop/{id}` no OAuth. A Shopify usa o domínio myshopify. Nenhum dos dois backends recebe uma conta VTEX. O admin deste app só grava o ID nas settings do app VTEX (`saveAppSettings`).
3. **Consultor e busca de catálogo.** `get_shop_widget_flags(p_shop_domain, p_public_id)` não tem linha para o host VTEX, então o consultor fica desligado. A busca `POST /api/widget/catalog-search` (app Shopify no Railway, HMAC `WIDGET_CATALOG_HMAC_SECRET`) conhece produto Shopify, não SKU VTEX. Sugestão de outro produto não entra no carrinho: o bloco recusa SKU que não pertence à PDP e responde isso ao iframe.
4. **AR de calçado e acessórios.** A opção “AR de calçado” abre `/widget-shoes`. Sem um campo de GLB na VTEX, essa página usa o modelo de exemplo que já está em `ShoeARWidgetPage.tsx`. O padrão do app é o provador de roupa (`/widget`). Metafields de óculos/relógio/colar/pulseira do tema Shopify não existem aqui.
5. **Cobrança.** `billingOptions.type` é `free`: instalar pela App Store não cobra na VTEX. O uso do provador continua na assinatura Omafit (`subscriptions`). Cobrar pela VTEX exigiria plano `billable`, métrica e um serviço que reporte uso. Isso não existe.
6. **Publicação.** Falta a conta sponsor, o login `vtex`, ícone, screenshots e a ficha em [VTEX App Store](https://apps.vtex.com). Este checkout não rodou `vtex link`, `vtex publish` nem `vtex deploy`.

## Publicar na App Store

Quando a conta sponsor existir e o `vendor` já for o nome dessa conta:

```bash
cd vtex-app
vtex publish
vtex deploy --force
```

`vtex deploy` manda a versão para o canal estável. A submissão da App Store é outro passo, no portal, com:

- conta sponsor (a mesma do `vendor`)
- ícone e screenshots enviados no formulário (não estão neste repo)
- e-mail e URL de suporte já apontam para `contato@omafit.co` e `https://omafit.co`
- países `*` (todos) e tipo de cobrança gratuito
- política de privacidade em `https://omafit.co` (página `/privacidade` deste site)

Builders usados: `react` 3.x, `store` 0.x, `admin` 0.x, `messages` 1.x, `docs` 0.x. Dependências: `vtex.styleguide` 9.x, `vtex.product-context` 0.x, `vtex.render-runtime` 8.x, `vtex.css-handles` 1.x, `vtex.order-items` 0.x, `vtex.apps-graphql` 3.x. Peer: `vtex.store` 2.x.

## Validar sem conta VTEX

Na raiz do repositório, com Node 22:

```bash
node vtex-app/scripts/validate.mjs
```

Isso confere o manifest, as mensagens pt/en/es, o vendor, o TypeScript do app e os testes do contrato (URL do widget, SKUs, shop domain, carrinho). Não substitui `vtex link`.
