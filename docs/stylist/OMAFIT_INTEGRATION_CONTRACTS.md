# Contratos de integração — widget ↔ omafit (Stylist multimodal)

O widget **não** duplica lógica de catálogo. Continua a consumir os endpoints HMAC existentes e prepara um turno multimodal estável.

## Já usados (manter)

| Endpoint | Uso |
|----------|-----|
| `POST /api/widget/catalog-search` | Candidatos + `store_profile` |
| `GET/POST product-by-handle` | Carregar PDP sugerido para try-on/ATC |
| `POST /api/widget/suggestion-events` | `impression` \| `stylist_click` \| `atc` |

Autorização Growth+ / plano pago: **servidor omafit + validate-size**. Ignorar `stylistModeEnabled` do frontend como única fonte de verdade.

## Sessão (widget → futuros endpoints)

Shape canónico em `src/features/stylist/types/session.ts`:

```ts
{
  session_id: string;
  shop_domain: string;
  current_product: { handle; title?; variant_id?; description? } | null;
  messages: Array<{ role; content; timestamp; suggestedProducts?; ... }>;
  style_preferences: { keywords; sort_price_asc; occasion?; gift_recipient? };
  recommended_size: string | null;
  recommended_products: SuggestedProductCard[];
  language: 'pt' | 'es' | 'en';
  consents: { photo_processing; analytics; voice_recording };
}
```

**Não persistir** fotos de pessoa, áudio bruto ou blobs sem consentimento explícito.

## Resposta estruturada (validate-size / futuro stylist-turn)

Uma resposta pode combinar:

| `type` | Payload |
|--------|---------|
| `text` | `content` |
| `products` | `products[]`, `impressionId?`, `anchorHandle?` |
| `selection_options` | `options[{ label, message }]` |
| `request_try_on` | `handle`, `autoSubmit?` |
| `cart_action` | `handle?`, `source`, `variantId?` |
| `end_conversation` | `reason?` |

Compatibilidade: campos flat atuais (`explicacao`, `suggested_products`, `tamanho_final`, `should_end_conversation`) continuam válidos; o widget mapeia para ações.

## Modalidade

- Entrada: `{ modality: 'text', text }` ou `{ modality: 'voice', transcript, is_final }`
- Voz parcial (`is_final: false`) não dispara turno
- Fallback textual obrigatório se IA/voz falhar — widget permanece usável sem ElevenLabs

## Pedidos futuros ao repo omafit (não implementar nesta PR)

1. Endpoint opcional `POST /api/widget/stylist-session` para retoma server-side (ou confirmar que retoma fica só no client).
2. Eco de `session_id` + `consents.voice_recording` em suggestion-events quando voz existir.
3. Manter `plan_required` / HTTP claro quando loja Starter chama catalog-search.
