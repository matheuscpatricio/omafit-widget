# Rollout — Consultor sénior v1 (Growth+)

1. **Omafit (Railway):** `npx prisma migrate deploy` (tabela `WidgetStoreProfile`), deploy app.
2. **Supabase:** deploy `validate-size` (GPT curador + `score_reason_tags` como pistas).
3. **Widget (Netlify):** deploy branch com HMAC v2 (`price_band`, `store_profile_source`).
4. **Verificar:** loja piloto com plano `growth` em `shopify_shops`; abrir app Omafit no admin (sessão Shopify).
5. **Smoke:** consultor após try-on → chips → “mais barato” → cards em 2.º turno; loja Starter deve ver mensagem Growth+ sem busca.
