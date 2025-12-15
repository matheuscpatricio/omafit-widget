# 🚀 Quick Start - Shopify Billing Omafit

## ⚡ Setup Rápido (5 minutos)

### 1. Configurar `.env`

```bash
# Adicione ao seu .env:
SUPABASE_URL=https://lhkgnirolvbmomeduoaj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui
SHOPIFY_APP_URL=https://seu-app.fly.dev
```

### 2. Migração já está aplicada ✅

A migration `create_shopify_billing_schema` já foi executada e criou:
- Tabela `billing_plans` com planos Starter, Pro e Enterprise
- Tabela `shopify_shops` para billing por loja
- Tabela `shopify_usage_records` para histórico

### 3. Adicionar Link no Menu

No seu app, adicione um link para a página de billing:

```jsx
// app/components/AppNavigation.jsx (ou similar)
<NavMenu.Item url="/app/billing">
  Planos & Billing
</NavMenu.Item>
```

### 4. Testar Fluxo de Assinatura

1. Acesse `/app/billing` no seu app
2. Clique em "Assinar Starter"
3. Será redirecionado para Shopify
4. Aprove a cobrança
5. Será redirecionado de volta para `/app`
6. Status será `active` no Supabase

### 5. Registrar Uso de Imagens

Onde você gera imagens, adicione:

```javascript
// Opção 1: Via API (sem admin client)
await fetch('/api/billing/usage', {
  method: 'POST',
  body: JSON.stringify({
    shopDomain: 'loja.myshopify.com',
    imagesCount: 1
  })
});

// Opção 2: Direto (com admin client)
import { registerImageUsageAndBill } from '../utils/usage-billing.server';

await registerImageUsageAndBill(shopDomain, 1, admin);
```

---

## 📁 Arquivos Criados

### Backend
- ✅ `app/utils/shopify-billing.server.js` - Helpers de billing
- ✅ `app/utils/usage-billing.server.js` - Cobrança por uso
- ✅ `app/routes/api.billing.start.jsx` - POST /api/billing/start
- ✅ `app/routes/admin.billing.return.jsx` - GET /admin/billing/return
- ✅ `app/routes/api.billing.usage.jsx` - POST /api/billing/usage

### Frontend
- ✅ `app/components/BillingPlans.jsx` - UI dos planos
- ✅ `app/components/UsageIndicator.jsx` - Indicador de uso
- ✅ `app/routes/app.billing.jsx` - Página /app/billing

### Database (Supabase)
- ✅ `billing_plans` - Planos (Starter: $25, Pro: $100, Enterprise: sob consulta)
- ✅ `shopify_shops` - Billing por loja
- ✅ `shopify_usage_records` - Histórico de cobranças

### Documentação
- ✅ `SHOPIFY_BILLING_GUIDE.md` - Guia completo
- ✅ `BILLING_INTEGRATION_EXAMPLES.md` - Exemplos de integração
- ✅ `QUICK_START_BILLING.md` - Este arquivo

---

## 🎯 Fluxo Completo

```
┌──────────────┐
│  Lojista     │
│  acessa      │
│  /app/billing│
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Escolhe plano        │
│ (Starter ou Pro)     │
└──────┬───────────────┘
       │
       ▼ POST /api/billing/start
┌──────────────────────┐
│ Backend cria         │
│ assinatura Shopify   │
│ (GraphQL)            │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Salva no Supabase    │
│ status: 'pending'    │
└──────┬───────────────┘
       │
       ▼ confirmationUrl
┌──────────────────────┐
│ Lojista aprova       │
│ na Shopify           │
└──────┬───────────────┘
       │
       ▼ returnUrl
┌──────────────────────┐
│ GET /admin/billing/  │
│ return               │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Atualiza Supabase    │
│ status: 'active'     │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Redireciona para     │
│ /app (dashboard)     │
└──────────────────────┘
```

---

## 💳 Cobrança por Uso

```
┌──────────────────────┐
│ Gera imagem          │
└──────┬───────────────┘
       │
       ▼ POST /api/billing/usage
┌──────────────────────┐
│ Incrementa contador  │
│ images_used_month++  │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Calcula extras       │
│ extras = used -      │
│          included    │
└──────┬───────────────┘
       │
       ▼ Se > 0
┌──────────────────────┐
│ Cria AppUsageRecord  │
│ na Shopify (GraphQL) │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Salva em Supabase    │
│ shopify_usage_records│
└──────────────────────┘
```

---

## ✅ Checklist Inicial

- [ ] Configurar `.env` com variáveis corretas
- [ ] Verificar que a migration foi aplicada
- [ ] Adicionar link para `/app/billing` no menu
- [ ] Acessar `/app/billing` e ver os planos
- [ ] Testar fluxo de assinatura (Starter)
- [ ] Verificar no Supabase se salvou com status 'pending'
- [ ] Aprovar na Shopify
- [ ] Verificar se voltou para o app com status 'active'
- [ ] Gerar uma imagem de teste
- [ ] Verificar se incrementou o contador no Supabase
- [ ] Gerar 105 imagens (ultrapassar limite de 100)
- [ ] Verificar se cobrou as 5 extras
- [ ] Ver usage record no Supabase e na Shopify Admin

---

## 🔧 Ajustes Necessários

### Prioridade Alta

1. **Vincular user_id com shop_domain**

No arquivo `app/routes/api.billing.start.jsx`, linha ~142:

```javascript
// ANTES (atual):
const userId = null;

// DEPOIS:
const { data: storeData } = await supabase
  .from('shopify_stores')
  .select('user_id')
  .eq('store_url', shopDomain)
  .maybeSingle();

const userId = storeData?.user_id || null;
```

2. **Configurar SHOPIFY_APP_URL correto**

```bash
# .env
SHOPIFY_APP_URL=https://omafit-app.fly.dev
# ou o domínio real do seu app
```

### Prioridade Média

3. **Adicionar linha de usage pricing na assinatura**

Ver seção "TODO 3" no `SHOPIFY_BILLING_GUIDE.md`

4. **Integrar com geração de imagens**

Ver exemplos no `BILLING_INTEGRATION_EXAMPLES.md`

---

## 🐛 Troubleshooting Rápido

### Erro: "Plano não encontrado"
- Verifique se a migration foi aplicada
- Verifique se há dados em `billing_plans`

### Erro: "Não autenticado"
- Verifique se está acessando via Shopify Admin
- Verifique se a autenticação está configurada

### Assinatura não aparece na Shopify
- Verifique logs do console
- Verifique se a mutation retornou erros
- Verifique se o `confirmationUrl` está correto

### Não está cobrando imagens extras
- Verifique se `billing_status = 'active'`
- Verifique se está chamando `/api/billing/usage`
- Verifique logs da função `registerImageUsageAndBill()`

---

## 📚 Documentação Completa

- **`SHOPIFY_BILLING_GUIDE.md`** - Guia detalhado de tudo
- **`BILLING_INTEGRATION_EXAMPLES.md`** - Exemplos práticos de integração
- **Este arquivo** - Quick start para começar rápido

---

## 💡 Dicas de Teste

1. Use uma **test store** da Shopify
2. No modo de desenvolvimento, o billing não cobra de verdade
3. Monitore os logs no console
4. Verifique o Supabase constantemente
5. Use o Shopify Admin para ver assinaturas

---

## 🎉 Pronto!

Agora você tem um sistema completo de billing integrado com Shopify e Supabase!

**Próximo passo:** Integrar com a geração de imagens e testar o fluxo completo.

Boa sorte! 🚀
