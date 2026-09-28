# Guia de Integração: Shopify Billing + Supabase - Omafit

## 📋 Visão Geral

Este guia explica como usar o sistema de billing completo implementado para o app Omafit, que integra **Shopify Billing** com **Supabase**.

## 🏗️ Arquitetura

```
┌─────────────────┐
│  Shopify Store  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Omafit App     │◄────►│   Supabase   │
│  (Remix)        │      │   Database   │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐
│ Shopify Billing │
│   GraphQL API   │
└─────────────────┘
```

## 📦 Arquivos Criados

### Backend (Server-side)

1. **`app/utils/shopify-billing.server.js`**
   - Funções auxiliares para gerenciar billing no Supabase
   - `getPlanDetails()` - Busca detalhes do plano
   - `upsertShopBilling()` - Cria/atualiza billing da loja
   - `getShopBilling()` - Busca billing da loja
   - `incrementImageUsage()` - Incrementa contador de imagens
   - `calculateExtraImagesBilling()` - Calcula imagens extras

2. **`app/utils/usage-billing.server.js`**
   - Gerencia cobrança por uso de imagens extras
   - `registerImageUsageAndBill()` - Registra uso e cobra se necessário
   - `getImageUsageInfo()` - Retorna info de uso atual

3. **`app/routes/api.billing.start.jsx`**
   - Rota: `POST /api/billing/start`
   - Inicia assinatura Shopify
   - Salva no Supabase com status 'pending'
   - Retorna `confirmationUrl` para redirecionar lojista

4. **`app/routes/admin.billing.return.jsx`**
   - Rota: `GET /admin/billing/return`
   - Callback após lojista aprovar assinatura
   - Atualiza status para 'active' no Supabase
   - Redireciona para dashboard

5. **`app/routes/api.billing.usage.jsx`**
   - Rota: `POST /api/billing/usage`
   - Registra uso de imagens
   - Cria cobrança automática se ultrapassar limite

### Frontend (UI Components)

6. **`app/components/BillingPlans.jsx`**
   - Componente React para exibir planos
   - Cards com Starter, Pro e Enterprise
   - Botões para assinar

7. **`app/components/UsageIndicator.jsx`**
   - Componente React para mostrar uso de imagens
   - Barra de progresso
   - Alertas quando próximo do limite

8. **`app/routes/app.billing.jsx`**
   - Página completa de billing
   - Usa os componentes BillingPlans e UsageIndicator
   - Acesse em `/app/billing`

### Database

9. **Migration: `create_shopify_billing_schema.sql`**
   - Tabela `billing_plans` - Planos disponíveis
   - Tabela `shopify_shops` - Info de billing por loja
   - Tabela `shopify_usage_records` - Histórico de cobranças

---

## 🚀 Como Usar

### 1. Configurar Variáveis de Ambiente

Adicione ao seu `.env`:

```bash
# Supabase (você já deve ter estas)
SUPABASE_URL=https://lhkgnirolvbmomeduoaj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui

# URL pública do seu app Shopify (para returnUrl)
SHOPIFY_APP_URL=https://seu-app.fly.dev
# ou
SHOPIFY_APP_URL=https://seu-dominio.com
```

### 2. Ajustar returnUrl

No arquivo `app/routes/api.billing.start.jsx`, linha ~80:

```javascript
const returnUrl = `${process.env.SHOPIFY_APP_URL}/admin/billing/return`;
```

Certifique-se de que `SHOPIFY_APP_URL` está configurado corretamente.

### 3. Vincular user_id com shop_domain

Atualmente, o código salva `user_id: null` no Supabase (linha ~142 em `api.billing.start.jsx`).

**Você precisa ajustar isso para vincular o `shop_domain` ao `user_id` do Omafit.**

Opções:

A) **Usar tabela existente `shopify_stores`:**
```javascript
// Buscar user_id da tabela shopify_stores
const { data: storeData } = await supabase
  .from('shopify_stores')
  .select('user_id')
  .eq('store_url', shopDomain)
  .maybeSingle();

const userId = storeData?.user_id || null;
```

B) **Criar via webhook de instalação:**
Quando o app for instalado, salve o `shop_domain` e `user_id` no Supabase.

### 4. Adicionar Link para Página de Billing

No menu do seu app, adicione um link para `/app/billing`:

```jsx
<NavMenu>
  <NavMenu.Item url="/app">Dashboard</NavMenu.Item>
  <NavMenu.Item url="/app/billing">Planos & Billing</NavMenu.Item>
  <NavMenu.Item url="/app/products">Produtos</NavMenu.Item>
</NavMenu>
```

---

## 💳 Fluxo de Assinatura

### Passo a Passo

1. **Lojista acessa `/app/billing`**
   - Vê os planos disponíveis
   - Clica em "Assinar Starter" ou "Assinar Pro"

2. **Frontend chama `POST /api/billing/start`**
   ```javascript
   const response = await fetch('/api/billing/start', {
     method: 'POST',
     body: JSON.stringify({ plan: 'starter' })
   });
   const data = await response.json();
   ```

3. **Backend cria assinatura na Shopify**
   - Usa GraphQL mutation `appSubscriptionCreate`
   - Salva no Supabase com status 'pending'
   - Retorna `confirmationUrl`

4. **Frontend redireciona para confirmationUrl**
   ```javascript
   window.top.location.href = data.confirmationUrl;
   ```

5. **Lojista aprova na Shopify**
   - Shopify exibe página de confirmação
   - Lojista clica em "Aprovar"

6. **Shopify redireciona para `/admin/billing/return`**
   - Backend atualiza status para 'active'
   - Redireciona lojista para `/app`

---

## 📊 Cobrança por Uso de Imagens

### Quando registrar uso

**Toda vez que uma loja gerar imagens**, você deve chamar a API de usage:

```javascript
// Exemplo: Após gerar imagem com sucesso
const response = await fetch('/api/billing/usage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shopDomain: 'minha-loja.myshopify.com',
    imagesCount: 1
  })
});

const result = await response.json();
console.log(result);
// {
//   success: true,
//   billed: false, // ou true se cobrou
//   message: "Ainda dentro do limite incluído"
// }
```

### Integração Automática

**Onde adicionar isso?**

1. **Edge Function `/functions/v1/fashnai-tryon`**
   - Quando o try-on for bem-sucedido
   - Antes de retornar a imagem gerada

2. **Rota de geração de imagens**
   - Qualquer endpoint que gere imagens virtuais

### Exemplo de Integração

```javascript
// Em fashnai-tryon ou similar
async function handleTryOn(request) {
  // ... lógica de geração de imagem ...

  if (success) {
    // Registrar uso de imagem
    try {
      await fetch('https://seu-app.com/api/billing/usage', {
        method: 'POST',
        body: JSON.stringify({
          shopDomain: shop,
          imagesCount: 1
        })
      });
    } catch (err) {
      console.error('Erro ao registrar uso:', err);
      // Não falhar a requisição por causa disso
    }

    return imageResult;
  }
}
```

---

## 🔄 Lógica de Cobrança por Uso

### Como funciona

1. **Incrementa contador**
   ```
   images_used_month = images_used_month + 1
   ```

2. **Calcula imagens extras**
   ```
   extraImages = max(0, images_used_month - images_included)
   unbilledImages = extraImages - last_billed_images
   ```

3. **Se houver imagens extras não cobradas:**
   - Calcula valor: `amount = unbilledImages * price_per_extra_image`
   - Cria `AppUsageRecord` na Shopify
   - Salva em `shopify_usage_records`
   - Atualiza `last_billed_images`

### Evitando Cobrança Duplicada

O sistema usa `last_billed_images` para rastrear quantas imagens extras já foram cobradas. Isso garante que a mesma imagem não seja cobrada duas vezes.

**Exemplo:**

```
Plano Starter: 100 imagens incluídas, US$ 0.17 por extra

Mês 1:
- Usou 120 imagens
- Extra: 20 imagens
- Cobra: 20 × $0.17 = $3.40
- last_billed_images = 20

Gera mais 10 imagens:
- Usou 130 imagens
- Extra: 30 imagens
- Já cobrou: 20
- Cobra agora: 10 × $0.17 = $1.70
- last_billed_images = 30
```

---

## 🏢 Plano Enterprise

### Como funciona

O plano **Enterprise** não usa billing automático da Shopify.

**No código:**
- Se `plan === 'enterprise'`, não chama `appSubscriptionCreate`
- Salva no Supabase com `billing_status = 'manual'`
- UI mostra botão "Fale Conosco"

**Futuramente:**
- Você pode implementar billing manual
- Ou criar uma assinatura customizada via GraphQL
- Ou integrar com sistema externo (CRM, etc.)

---

## 🔍 Monitoramento e Debug

### Logs

Todos os arquivos incluem logs detalhados:

```javascript
console.log('[Billing] Criando assinatura:', variables);
console.log('[Usage Billing] Registrando uso:', shopDomain);
```

### Verificar no Supabase

```sql
-- Ver todas as lojas com billing
SELECT * FROM shopify_shops;

-- Ver uso de imagens
SELECT shop_domain, plan, images_used_month, images_included
FROM shopify_shops
WHERE billing_status = 'active';

-- Ver histórico de cobranças
SELECT * FROM shopify_usage_records
ORDER BY created_at DESC
LIMIT 10;
```

### Verificar na Shopify

No Shopify Admin:
1. Settings → Apps and sales channels
2. Clique no seu app
3. Vá em "Billing"
4. Veja assinaturas ativas e usage records

---

## ⚠️ TODOs Importantes

### 1. Configurar returnUrl
- [ ] Adicionar `SHOPIFY_APP_URL` no `.env`
- [ ] Testar redirecionamento após aprovação

### 2. Vincular user_id
- [ ] Implementar busca de `user_id` por `shop_domain`
- [ ] Salvar corretamente em `shopify_shops`

### 3. Adicionar Usage Line Item
Atualmente, a assinatura criada só tem recurring pricing. Para usage billing funcionar perfeitamente, você pode:

A) Criar uma linha de uso na assinatura:
```graphql
mutation {
  appSubscriptionCreate(
    name: "Omafit Starter"
    returnUrl: "..."
    lineItems: [
      {
        plan: {
          appRecurringPricingDetails: {
            price: { amount: "25.00", currencyCode: USD }
            interval: EVERY_30_DAYS
          }
        }
      },
      {
        plan: {
          appUsagePricingDetails: {
            cappedAmount: { amount: "100.00", currencyCode: USD }
            terms: "Imagens adicionais: US$ 0.17 cada"
          }
        }
      }
    ]
  ) { ... }
}
```

B) Salvar o `id` da linha de uso em `shopify_usage_line_item_id`

### 4. Integrar com geração de imagens
- [ ] Adicionar chamada para `/api/billing/usage` quando gerar imagens
- [ ] Testar cobrança automática de imagens extras

### 5. Adicionar webhooks
Para detectar:
- Cancelamento de assinatura
- Renovação de assinatura
- Atualização de plano

---

## 📚 Referências

- [Shopify Billing API](https://shopify.dev/docs/apps/billing)
- [AppSubscriptionCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appSubscriptionCreate)
- [AppUsageRecordCreate](https://shopify.dev/docs/api/admin-graphql/latest/mutations/appUsageRecordCreate)
- [Supabase Documentation](https://supabase.com/docs)

---

## 🎯 Próximos Passos

1. ✅ Configurar `.env` com variáveis corretas
2. ✅ Ajustar returnUrl
3. ✅ Vincular user_id com shop_domain
4. ✅ Adicionar link para `/app/billing` no menu
5. ✅ Testar fluxo completo de assinatura
6. ✅ Integrar com geração de imagens
7. ✅ Testar cobrança por uso
8. ✅ Monitorar logs e Supabase

---

## 💡 Dicas

- **Teste em modo de desenvolvimento** da Shopify primeiro
- Use **test stores** para testar billing
- A Shopify não cobra de verdade em apps em desenvolvimento
- Monitore os logs no console para debug
- Verifique o Supabase regularmente

---

## 🆘 Suporte

Se tiver dúvidas ou problemas:

1. Verifique os logs no console
2. Verifique os dados no Supabase
3. Verifique a billing page na Shopify Admin
4. Revise este guia

---

**Boa sorte com a implementação do billing! 🚀**
