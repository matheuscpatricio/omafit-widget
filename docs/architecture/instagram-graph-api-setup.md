# Publicar carrossel no Instagram via API (Omafit)

Integração com a **Instagram Graph API** (Meta). O MCP Canva **não publica** no Instagram — só cria/exporta. A publicação fica nesta API ou no app Meta Business Suite.

## Pré-requisitos (obrigatórios)

1. Conta Instagram **Profissional** (Empresa ou Criador).
2. Conta ligada a uma **Página do Facebook** (você precisa ser admin da página).
3. App em [developers.facebook.com](https://developers.facebook.com/) (tipo Business).
4. **App Review** da Meta para permissões de publicação (pode levar semanas).
5. Imagens do carrossel em **URLs HTTPS públicas** (Meta baixa os ficheiros dos teus links).

Permissões típicas (nomes atuais; confirmar na documentação Meta):

- `instagram_business_basic`
- `instagram_business_content_publish`
- `pages_read_engagement`
- `pages_show_list`

Documentação oficial: [IG User Media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media/)

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | ID numérico da conta IG (`ig-user-id`) |
| `META_PAGE_ACCESS_TOKEN` | Page access token com permissão de publish |
| `META_GRAPH_API_VERSION` | Opcional, default `v22.0` |
| `INSTAGRAM_PUBLISH_SECRET` | Segredo para proteger a Edge Function (header `X-Instagram-Publish-Secret`) |

### Obter `INSTAGRAM_BUSINESS_ACCOUNT_ID`

Com um Page access token válido:

```http
GET https://graph.facebook.com/v22.0/me/accounts?access_token={PAGE_TOKEN}
```

Depois, para cada `page_id`:

```http
GET https://graph.facebook.com/v22.0/{page-id}?fields=instagram_business_account&access_token={PAGE_TOKEN}
```

O campo `instagram_business_account.id` é o `INSTAGRAM_BUSINESS_ACCOUNT_ID`.

## Onde hospedar as imagens (1080×1350)

A Meta **não aceita** ficheiros locais — só URLs públicas.

Opções para o Omafit:

1. **Supabase Storage** — bucket público `marketing` (ou signed URLs com TTL longo; preferir público para publish).
2. Export PNG do Canva → upload → URLs públicas na ordem do carrossel.
3. CDN do site (`https://omafit.co/...`) se os assets estiverem em `public/`.

## Fluxo da API (carrossel)

1. Para cada imagem: `POST /{ig-user-id}/media` com `image_url` + `is_carousel_item=true`.
2. Poll `GET /{container-id}?fields=status_code` até `FINISHED`.
3. `POST /{ig-user-id}/media` com `media_type=CAROUSEL`, `children=id1,id2,...`, `caption`.
4. Poll até `FINISHED`.
5. `POST /{ig-user-id}/media_publish` com `creation_id` do carrossel.

Implementação no repo:

- `supabase/functions/_shared/instagram-graph.ts`
- `supabase/functions/instagram-publish-carousel/index.ts`
- `scripts/instagram-publish-carousel.mjs` (teste local)

## Deploy da Edge Function

```bash
supabase secrets set META_PAGE_ACCESS_TOKEN=...
supabase secrets set INSTAGRAM_BUSINESS_ACCOUNT_ID=...
supabase secrets set INSTAGRAM_PUBLISH_SECRET=um-segredo-longo-aleatorio
supabase functions deploy instagram-publish-carousel
```

## Publicar via HTTP

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/instagram-publish-carousel" \
  -H "Content-Type: application/json" \
  -H "X-Instagram-Publish-Secret: <INSTAGRAM_PUBLISH_SECRET>" \
  -d '{
    "caption": "Sua loja online merece um vendedor que entende. #Omafit #Shopify",
    "image_urls": [
      "https://example.com/slide-01.jpg",
      "https://example.com/slide-02.jpg",
      "https://example.com/slide-03.jpg",
      "https://example.com/slide-04.jpg",
      "https://example.com/slide-05.jpg",
      "https://example.com/slide-06.jpg"
    ],
    "share_to_feed": true
  }'
```

Resposta de sucesso:

```json
{
  "ok": true,
  "media_id": "...",
  "carousel_container_id": "...",
  "child_container_ids": ["...", "..."]
}
```

## Script local (sem deploy)

```bash
# PowerShell
$env:META_PAGE_ACCESS_TOKEN = "..."
$env:INSTAGRAM_BUSINESS_ACCOUNT_ID = "..."

node scripts/instagram-publish-carousel.mjs `
  --caption "Carrossel Omafit — consultor inteligente na Shopify" `
  --images "https://url1.jpg,https://url2.jpg,https://url3.jpg,https://url4.jpg,https://url5.jpg,https://url6.jpg"
```

## Limites e erros comuns

| Erro | Causa |
|------|--------|
| Conta pessoal | Só Business/Creator + página FB |
| URL inacessível | Imagem não pública ou sem HTTPS |
| Permissão negada | App Review pendente ou token sem scope de publish |
| Container ERROR | Proporção/formato inválido; carrossel usa ratio da **primeira** imagem |
| Rate limit | ~50–100 publicações API / 24h (ver docs Meta) |

## OAuth para produto (fase 2)

Para publicar **em nome de clientes** (B2B), é preciso fluxo OAuth Meta por loja, tokens long-lived e armazenamento seguro — fora do escopo desta função interna Omafit.

## Relação com MCP Canva

1. Canva MCP → exportar 6 PNG 1080×1350.
2. Upload → URLs públicas.
3. Edge Function ou script → `publishInstagramCarousel`.
