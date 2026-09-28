# Billing Guard - Exemplos de Uso

## 🛡️ O que é o Billing Guard?

O **Billing Guard** é um conjunto de funções que protegem rotas e features do seu app, garantindo que apenas lojas com assinatura ativa possam acessá-las.

---

## 📦 Funções Disponíveis

### 1. `checkBillingAccess(shopDomain, allowEnterprise)`

Verifica se a loja tem billing ativo.

**Retorna:**
```javascript
{
  hasAccess: true,       // boolean
  shop: { ... },         // dados da loja
  reason: 'active',      // motivo do resultado
  message: '...'         // mensagem amigável
}
```

### 2. `requireBilling(shopDomain, options)`

Middleware para loaders/actions do Remix. Retorna erro se não tiver billing.

**Opções:**
- `allowEnterprise` - Permitir plano Enterprise (default: true)
- `redirectTo` - URL para redirecionar se não tiver acesso (default: null)

### 3. `checkImageLimit(shopDomain)`

Verifica se a loja está dentro do limite de imagens.

**Retorna:**
```javascript
{
  withinLimit: true,     // boolean
  used: 45,              // imagens usadas
  included: 100,         // imagens incluídas
  remaining: 55,         // imagens restantes
  percentage: 45         // % usado
}
```

### 4. `assertBillingActive(shopDomain)`

Lança exceção se não tiver billing ativo. Útil para usar em funções.

---

## 📝 Exemplos de Uso

### Exemplo 1: Proteger uma rota (com redirect)

```javascript
// app/routes/app.generate-images.jsx
import { requireBilling } from '../utils/billing-guard.server';
import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // ✅ Verificar billing (redireciona para /app/billing se não tiver)
  const billingError = await requireBilling(shopDomain, {
    redirectTo: '/app/billing'
  });
  if (billingError) return billingError;

  // Se chegou aqui, tem billing ativo!
  return json({ message: 'Acesso autorizado' });
};

export default function GenerateImagesPage() {
  return (
    <Page title="Gerar Imagens">
      <p>Esta página só é acessível com assinatura ativa</p>
    </Page>
  );
}
```

### Exemplo 2: Proteger uma rota (com erro JSON)

```javascript
// app/routes/api.premium-feature.jsx
import { json } from '@remix-run/node';
import { requireBilling } from '../utils/billing-guard.server';
import { authenticate } from '../shopify.server';

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // ✅ Verificar billing (retorna erro JSON se não tiver)
  const billingError = await requireBilling(shopDomain);
  if (billingError) return billingError;

  // Processar feature premium...
  return json({ success: true });
};
```

### Exemplo 3: Verificar limite de imagens antes de gerar

```javascript
// app/routes/api.generate-tryon.jsx
import { json } from '@remix-run/node';
import { checkImageLimit } from '../utils/billing-guard.server';

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // ✅ Verificar limite de imagens
  const limit = await checkImageLimit(shopDomain);

  // Opcional: Avisar se estiver próximo do limite
  if (limit.percentage >= 90) {
    console.warn(`⚠️ Loja ${shopDomain} está em ${limit.percentage}% do limite`);
  }

  // Não bloquear, apenas informar
  // (O billing por uso cobrará automaticamente pelas extras)

  // Gerar imagem...
  const result = await generateVirtualTryOn(productImage, modelImage);

  return json({
    success: true,
    imageUrl: result.imageUrl,
    usage: {
      used: limit.used + 1,
      included: limit.included,
      remaining: limit.remaining - 1
    }
  });
};
```

### Exemplo 4: Usar em uma função auxiliar

```javascript
// app/services/image-processor.server.js
import { assertBillingActive } from '../utils/billing-guard.server';

export async function processImage(shopDomain, imageUrl) {
  // ✅ Garantir que tem billing ativo (lança exceção se não tiver)
  await assertBillingActive(shopDomain);

  // Processar imagem...
  const result = await doSomeProcessing(imageUrl);
  return result;
}

// Uso:
try {
  const result = await processImage('loja.myshopify.com', imageUrl);
} catch (error) {
  if (error.message.includes('assinatura')) {
    // Erro de billing
    console.error('Billing inativo:', error);
  }
}
```

### Exemplo 5: Verificar billing e mostrar na UI

```javascript
// app/routes/app.dashboard.jsx
import { useLoaderData } from '@remix-run/react';
import { checkBillingAccess } from '../utils/billing-guard.server';
import { Banner } from '@shopify/polaris';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // ✅ Verificar billing (sem bloquear)
  const billingCheck = await checkBillingAccess(shopDomain);

  return json({
    billingAccess: billingCheck
  });
};

export default function Dashboard() {
  const { billingAccess } = useLoaderData();

  return (
    <Page title="Dashboard">
      {/* Mostrar banner se não tiver billing ativo */}
      {!billingAccess.hasAccess && (
        <Banner
          title="Assinatura Necessária"
          tone="warning"
          action={{ content: 'Escolher Plano', url: '/app/billing' }}
        >
          <p>{billingAccess.message}</p>
        </Banner>
      )}

      {/* Resto do dashboard */}
      <Layout>
        {/* ... */}
      </Layout>
    </Page>
  );
}
```

### Exemplo 6: Proteger múltiplas rotas com um wrapper

```javascript
// app/utils/protected-route.server.js
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { requireBilling } from './billing-guard.server';

export async function withBillingProtection(request, callback) {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // Verificar billing
  const billingError = await requireBilling(shopDomain);
  if (billingError) return billingError;

  // Executar callback com dados
  return callback({ admin, session, shopDomain });
}

// Uso em múltiplas rotas:

// app/routes/app.feature1.jsx
export const loader = async ({ request }) => {
  return withBillingProtection(request, async ({ shopDomain }) => {
    // Lógica protegida
    return json({ data: 'feature 1' });
  });
};

// app/routes/app.feature2.jsx
export const loader = async ({ request }) => {
  return withBillingProtection(request, async ({ shopDomain }) => {
    // Lógica protegida
    return json({ data: 'feature 2' });
  });
};
```

### Exemplo 7: Bloquear Enterprise de features específicas

```javascript
// Algumas features podem não estar disponíveis para Enterprise
// (ex: features experimentais, beta features, etc.)

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // ✅ Não permitir Enterprise nesta feature
  const billingError = await requireBilling(shopDomain, {
    allowEnterprise: false
  });
  if (billingError) return billingError;

  // Processar feature...
};
```

### Exemplo 8: Verificar billing em edge function

```javascript
// supabase/functions/protected-feature/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const { shopDomain } = await req.json();

  // Criar cliente Supabase
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // ✅ Verificar billing
  const { data: shop } = await supabase
    .from('shopify_shops')
    .select('*')
    .eq('shop_domain', shopDomain)
    .eq('billing_status', 'active')
    .maybeSingle();

  if (!shop) {
    return new Response(
      JSON.stringify({ error: 'Assinatura inválida ou inativa' }),
      { status: 403 }
    );
  }

  // Processar feature...
  return new Response(JSON.stringify({ success: true }));
});
```

---

## 🎯 Quando Usar Cada Função?

| Situação | Função | Motivo |
|----------|--------|--------|
| Proteger rota Remix com redirect | `requireBilling()` com `redirectTo` | Melhor UX - redireciona para página de planos |
| Proteger API endpoint | `requireBilling()` sem `redirectTo` | Retorna erro JSON apropriado |
| Verificar antes de processar | `assertBillingActive()` | Simples, lança exceção |
| Mostrar aviso na UI | `checkBillingAccess()` | Não bloqueia, apenas informa |
| Verificar limite de imagens | `checkImageLimit()` | Para avisos e analytics |
| Edge function/webhook | Query direta no Supabase | Não tem acesso aos helpers do Remix |

---

## ⚠️ Boas Práticas

### ✅ DO:

- Use `requireBilling()` em **todas** as rotas que geram imagens
- Use `checkImageLimit()` para mostrar avisos quando próximo do limite
- Use `redirectTo: '/app/billing'` para melhor UX
- Mostre mensagens amigáveis quando bloquear acesso
- Permita Enterprise por padrão (`allowEnterprise: true`)

### ❌ DON'T:

- Não bloqueie totalmente a geração de imagens se ultrapassar o limite
  - O billing por uso cobrará automaticamente
  - Apenas avise o usuário
- Não use billing guard em rotas públicas (webhooks, etc.)
- Não exponha detalhes internos de billing nos erros

---

## 🔍 Debugging

### Verificar status de billing no console:

```javascript
import { checkBillingAccess } from '../utils/billing-guard.server';

const result = await checkBillingAccess('loja.myshopify.com');
console.log('Billing status:', result);
// {
//   hasAccess: true,
//   shop: { plan: 'starter', billing_status: 'active', ... },
//   reason: 'active',
//   message: 'Acesso autorizado'
// }
```

### Testar diferentes cenários:

```javascript
// Loja sem billing configurado
const result1 = await checkBillingAccess('nova-loja.myshopify.com');
// { hasAccess: false, reason: 'no_billing_configured', ... }

// Loja com billing inativo
const result2 = await checkBillingAccess('loja-inativa.myshopify.com');
// { hasAccess: false, reason: 'billing_inactive', ... }

// Loja Enterprise
const result3 = await checkBillingAccess('loja-enterprise.myshopify.com');
// { hasAccess: true, reason: 'enterprise', ... }
```

---

## 📊 Monitoramento

Adicione logs para monitorar tentativas de acesso sem billing:

```javascript
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const billingCheck = await checkBillingAccess(shopDomain);

  if (!billingCheck.hasAccess) {
    // 📊 Log para analytics
    console.warn(`[Billing Block] ${shopDomain} tentou acessar sem billing ativo`, {
      reason: billingCheck.reason,
      plan: billingCheck.shop?.plan
    });

    // Opcional: Enviar para sistema de analytics
    // analytics.track('billing_access_denied', { ... });
  }

  const billingError = await requireBilling(shopDomain);
  if (billingError) return billingError;

  // ...
};
```

---

**Pronto! Agora você pode proteger todas as features premium do seu app com billing guard. 🛡️**
