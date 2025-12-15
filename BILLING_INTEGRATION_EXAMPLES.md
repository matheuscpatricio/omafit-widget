# Exemplos de Integração: Billing com Geração de Imagens

## 📸 Onde Registrar Uso de Imagens

Você deve registrar o uso de imagens **toda vez que uma loja gerar imagens virtuais com sucesso**.

---

## Exemplo 1: Edge Function (Supabase)

### Cenário
Você tem uma edge function que processa try-on de imagens.

**Arquivo:** `supabase/functions/fashnai-tryon/index.ts` (ou similar)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  try {
    const { shopDomain, productImage, modelImage } = await req.json();

    // ... lógica de processamento da imagem ...

    const resultImage = await processVirtualTryOn(productImage, modelImage);

    // ✅ ADICIONE AQUI: Registrar uso de imagem
    if (shopDomain) {
      try {
        // Chamar API de billing do Omafit
        await fetch(`${YOUR_APP_URL}/api/billing/usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopDomain: shopDomain,
            imagesCount: 1
          })
        });
        console.log('✅ Uso registrado para:', shopDomain);
      } catch (billingError) {
        // Não falhar a requisição se o billing der erro
        console.error('⚠️ Erro ao registrar uso:', billingError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: resultImage
    }));

  } catch (error) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
});
```

**Importante:**
- Sempre use `try/catch` ao chamar o billing
- Não falhe a requisição principal se o billing der erro
- Registre logs para debug

---

## Exemplo 2: Rota Backend (Remix/Node)

### Cenário
Você tem uma rota no backend que gera imagens.

**Arquivo:** `app/routes/api.generate-image.jsx`

```javascript
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { registerImageUsageAndBill } from '../utils/usage-billing.server';

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  try {
    const body = await request.json();
    const { productId, modelImage } = body;

    // Gerar imagem virtual
    const resultImage = await generateVirtualTryOn(productId, modelImage);

    // ✅ Registrar uso e cobrar se necessário
    const billingResult = await registerImageUsageAndBill(
      shopDomain,
      1,  // 1 imagem gerada
      admin  // passar admin client
    );

    console.log('Billing result:', billingResult);

    return json({
      success: true,
      imageUrl: resultImage,
      billing: {
        billed: billingResult.billed,
        message: billingResult.message
      }
    });

  } catch (error) {
    console.error('Erro ao gerar imagem:', error);
    return json({ error: error.message }, { status: 500 });
  }
};
```

---

## Exemplo 3: Múltiplas Imagens

### Cenário
O lojista pode gerar várias imagens de uma vez (ex: batch processing).

```javascript
export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  try {
    const { productIds } = await request.json();

    // Gerar múltiplas imagens
    const results = await Promise.all(
      productIds.map(id => generateVirtualTryOn(id))
    );

    const successCount = results.filter(r => r.success).length;

    // ✅ Registrar uso de todas as imagens de uma vez
    if (successCount > 0) {
      await registerImageUsageAndBill(
        shopDomain,
        successCount,  // número de imagens geradas
        admin
      );
    }

    return json({
      success: true,
      results,
      imagesGenerated: successCount
    });

  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
```

---

## Exemplo 4: Webhook de Try-On

### Cenário
Você recebe um webhook de um serviço externo (ex: Fashn.ai) quando o try-on fica pronto.

**Arquivo:** `app/routes/webhooks.tryon-complete.jsx`

```javascript
import { json } from '@remix-run/node';
import { supabase } from '../utils/supabase.server';

export const action = async ({ request }) => {
  try {
    const payload = await request.json();
    const { sessionId, status, resultImage } = payload;

    if (status !== 'completed') {
      return json({ message: 'Not completed yet' });
    }

    // Buscar sessão no Supabase para pegar o shop_domain
    const { data: session } = await supabase
      .from('tryon_sessions')
      .select('*, users!inner(shopify_shops!inner(shop_domain))')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      return json({ error: 'Session not found' }, { status: 404 });
    }

    const shopDomain = session.users?.shopify_shops?.shop_domain;

    // ✅ Registrar uso
    if (shopDomain) {
      try {
        await fetch(`${process.env.SHOPIFY_APP_URL}/api/billing/usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopDomain: shopDomain,
            imagesCount: 1
          })
        });
      } catch (billingError) {
        console.error('Erro ao registrar billing:', billingError);
      }
    }

    // Atualizar sessão com resultado
    await supabase
      .from('tryon_sessions')
      .update({ result_image: resultImage, fashn_status: 'completed' })
      .eq('id', sessionId);

    return json({ success: true });

  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
```

---

## Exemplo 5: Widget Frontend → Backend

### Cenário
O widget frontend chama uma API que gera imagens.

**Frontend (widget):**
```javascript
async function generateTryOn(productImage, modelImage) {
  const response = await fetch('/api/tryon/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      shopDomain: SHOP_DOMAIN,  // do data-attribute
      productImage,
      modelImage
    })
  });

  const data = await response.json();
  return data;
}
```

**Backend:**
```javascript
// app/routes/api.tryon.generate.jsx
export const action = async ({ request }) => {
  const { shopDomain, productImage, modelImage } = await request.json();

  // Validar shop_domain
  const shop = await getShopBilling(shopDomain);
  if (!shop || shop.billing_status !== 'active') {
    return json({
      error: 'Assinatura inválida ou inativa'
    }, { status: 403 });
  }

  // Verificar se tem créditos disponíveis (opcional)
  const usage = await getImageUsageInfo(shopDomain);
  // Se quiser bloquear após X imagens, faça aqui

  // Gerar imagem
  const result = await processVirtualTryOn(productImage, modelImage);

  // ✅ Registrar uso
  // Como não temos admin client aqui, precisamos fazer de outra forma
  // Opção 1: Salvar em fila para processar depois
  // Opção 2: Usar service account com offline token
  // Opção 3: Incrementar contador e cobrar via cron job

  // Por simplicidade, vamos apenas incrementar o contador
  await incrementImageUsage(shopDomain, 1);

  // TODO: Cobrar depois via cron job que processa lojas com imagens extras

  return json({
    success: true,
    imageUrl: result.imageUrl
  });
};
```

---

## 🕐 Cobrança por Cron Job (Alternativa)

Se você não conseguir chamar `registerImageUsageAndBill()` com admin client em todas as situações, pode usar um cron job:

**Arquivo:** `app/routes/cron.process-billing.jsx`

```javascript
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { supabase } from '../utils/supabase.server';
import { calculateExtraImagesBilling, saveUsageRecord } from '../utils/shopify-billing.server';

export const action = async ({ request }) => {
  // Verificar secret para segurança
  const secret = request.headers.get('X-Cron-Secret');
  if (secret !== process.env.CRON_SECRET) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Buscar todas as lojas ativas com imagens extras não cobradas
    const { data: shops } = await supabase
      .from('shopify_shops')
      .select('*')
      .eq('billing_status', 'active')
      .gt('images_used_month', 'images_included');

    const results = [];

    for (const shop of shops || []) {
      const billing = calculateExtraImagesBilling(shop);

      if (!billing.shouldCharge) continue;

      try {
        // Obter admin client para esta loja
        // TODO: Você precisa ter offline access token salvo
        const { admin } = await authenticate.admin(request, shop.shop_domain);

        // Criar usage record
        const variables = {
          subscriptionLineItemId: shop.shopify_app_subscription_id,
          amount: billing.amount.toString(),
          currency: shop.currency,
          description: `${billing.extraImages} imagens adicionais`
        };

        const response = await admin.graphql(CREATE_USAGE_RECORD_MUTATION, { variables });
        const data = await response.json();

        if (data.data?.appUsageRecordCreate?.appUsageRecord) {
          const usageRecord = data.data.appUsageRecordCreate.appUsageRecord;

          // Salvar no Supabase
          await saveUsageRecord({
            shopDomain: shop.shop_domain,
            usageRecordId: usageRecord.id,
            amount: billing.amount,
            currency: shop.currency,
            imagesCount: billing.extraImages,
            description: variables.description
          });

          results.push({ shop: shop.shop_domain, success: true });
        }
      } catch (error) {
        console.error(`Erro ao processar ${shop.shop_domain}:`, error);
        results.push({ shop: shop.shop_domain, success: false, error: error.message });
      }
    }

    return json({ processed: results.length, results });

  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
```

**Configurar cron:**
- Use GitHub Actions, Vercel Cron, ou Upstash QStash
- Chame esta rota a cada hora ou dia
- Passe o `X-Cron-Secret` header para segurança

---

## 🔒 Validações Importantes

### Verificar Status de Billing

Antes de gerar imagens, sempre valide:

```javascript
import { getShopBilling } from '../utils/shopify-billing.server';

export const action = async ({ request }) => {
  const shopDomain = getShopDomainFromRequest(request);

  // ✅ Validar billing
  const shop = await getShopBilling(shopDomain);

  if (!shop) {
    return json({
      error: 'Loja não encontrada. Por favor, configure o billing.'
    }, { status: 403 });
  }

  if (shop.billing_status !== 'active') {
    return json({
      error: 'Assinatura inativa. Por favor, ative seu plano.',
      billingStatus: shop.billing_status
    }, { status: 403 });
  }

  // Opcional: Verificar se atingiu limite diário (anti-abuse)
  const usage = await getImageUsageInfo(shopDomain);
  const DAILY_LIMIT = 1000;  // limite de segurança

  if (usage.used >= DAILY_LIMIT) {
    return json({
      error: 'Limite diário atingido. Entre em contato com o suporte.'
    }, { status: 429 });
  }

  // Continuar com geração de imagem...
};
```

---

## 📊 Dashboard de Uso

Mostre o uso em tempo real na UI:

```jsx
// app/routes/app.dashboard.jsx
import { useLoaderData } from '@remix-run/react';
import { UsageIndicator } from '../components/UsageIndicator';
import { getImageUsageInfo } from '../utils/usage-billing.server';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const usage = await getImageUsageInfo(shopDomain);

  return json({ usage });
};

export default function Dashboard() {
  const { usage } = useLoaderData();

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <UsageIndicator usage={usage} />
        </Layout.Section>

        {/* ... resto do dashboard ... */}
      </Layout>
    </Page>
  );
}
```

---

## ✅ Checklist de Integração

- [ ] Identificar todos os pontos onde imagens são geradas
- [ ] Adicionar chamada para `/api/billing/usage` ou `registerImageUsageAndBill()`
- [ ] Adicionar validação de billing_status antes de gerar
- [ ] Testar com plano Starter (100 imagens)
- [ ] Gerar 105 imagens e verificar se cobrou as 5 extras
- [ ] Verificar no Supabase a tabela `shopify_usage_records`
- [ ] Verificar na Shopify Admin se o usage record foi criado
- [ ] Adicionar indicador de uso na UI
- [ ] Configurar cron job (se necessário)
- [ ] Monitorar logs para erros

---

## 🐛 Troubleshooting

### Não está cobrando imagens extras

1. Verifique `shopify_app_subscription_id` no Supabase
2. Verifique se `billing_status = 'active'`
3. Verifique os logs da função `registerImageUsageAndBill()`
4. Verifique se `last_billed_images` está sendo atualizado

### Admin client não disponível

Se você não tiver acesso ao `admin` client em algum endpoint:

**Solução 1:** Salvar offline access token
**Solução 2:** Usar cron job para processar depois
**Solução 3:** Criar proxy endpoint que tem acesso

### Cobrando em duplicata

Verifique se:
- `last_billed_images` está sendo atualizado corretamente
- Não está chamando `registerImageUsageAndBill()` múltiplas vezes
- Está usando a lógica de `calculateExtraImagesBilling()` corretamente

---

**Pronto! Agora você tem todos os exemplos para integrar o billing com geração de imagens. 🎉**
