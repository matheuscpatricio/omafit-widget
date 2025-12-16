# App Folder - Shopify Billing Components

Esta pasta contém os componentes React para integração com Shopify Billing, convertidos de Remix para React Router DOM puro.

## 📁 Estrutura de Arquivos

### Rotas Principais
- **`app._index.jsx`** - Dashboard principal do app Shopify
- **`app.billing.jsx`** - Página de billing com planos e uso
- **`app.plans.jsx`** - Seleção e troca de planos
- **`app.usage.jsx`** - Histórico de uso de imagens
- **`app.analytics.jsx`** - Analytics avançado
- **`app.widget.jsx`** - Configuração do widget

### Rotas de API/Callback
- **`admin.billing.return.jsx`** - Callback após aprovação de billing na Shopify
- **`api.billing.start.jsx`** - Helper para iniciar assinatura
- **`api.billing.usage.jsx`** - Helper para registrar uso de imagens

### Componentes
- **`components/BillingPlans.jsx`** - Componente de exibição de planos
- **`components/UsageIndicator.jsx`** - Indicador de uso mensal

### Utilitários (Server-side)
- **`utils/billing-guard.server.js`** - Middleware de proteção de rotas
- **`utils/shopify-billing.server.js`** - Funções de billing Shopify
- **`utils/usage-billing.server.js`** - Gestão de cobranças por uso

## 🔄 Mudanças Realizadas

### De Remix para React Router DOM

Todos os arquivos foram adaptados de **Remix** para **React Router DOM puro**:

1. **Loaders Removidos**: Loaders do Remix foram convertidos para `useEffect` com `fetch`
2. **Actions Removidos**: Actions foram convertidas para funções async exportadas
3. **Autenticação Shopify**: Autenticação server-side removida (agora usa Supabase)
4. **Server-side Code**: Código server-side movido para Edge Functions do Supabase

### Principais Alterações

#### Antes (Remix):
```jsx
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  // ...
};

export default function Page() {
  const data = useLoaderData();
  // ...
}
```

#### Depois (React Router DOM):
```jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function Page() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const response = await fetch(/* ... */);
    // ...
  };
  // ...
}
```

## 🚀 Como Usar

### Integração no App Principal

Para usar estes componentes no seu app React principal (`src/App.tsx`):

```tsx
import DashboardPage from '../app/app._index';
import BillingReturn from '../app/admin.billing.return';
import BillingPage from '../app/app.billing';
import PlansPage from '../app/app.plans';
import UsagePage from '../app/app.usage';
import AnalyticsPage from '../app/app.analytics';
import WidgetPage from '../app/app.widget';

// Adicionar nas rotas:
<Routes>
  <Route path="/app" element={<DashboardPage />} />
  <Route path="/app/billing" element={<BillingPage />} />
  <Route path="/app/plans" element={<PlansPage />} />
  <Route path="/app/usage" element={<UsagePage />} />
  <Route path="/app/analytics" element={<AnalyticsPage />} />
  <Route path="/app/widget" element={<WidgetPage />} />
  <Route path="/admin/billing/return" element={<BillingReturn />} />
</Routes>
```

### Usando os Helpers de API

```jsx
import { startBillingSubscription } from '../app/routes/api.billing.start';
import { registerImageUsage } from '../app/routes/api.billing.usage';

// Iniciar assinatura
const result = await startBillingSubscription('pro', 'shop.myshopify.com');

// Registrar uso de imagens
const usage = await registerImageUsage('shop.myshopify.com', 5);
```

## 📦 Dependências

Estes componentes utilizam:
- **React Router DOM** (`react-router-dom`) - Navegação
- **@shopify/polaris** - UI components Shopify
- **@supabase/supabase-js** - Cliente Supabase
- **React Hooks** - useState, useEffect, useCallback

## 🔐 Variáveis de Ambiente

Certifique-se de ter estas variáveis configuradas no `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

## 📝 Notas Importantes

1. **Autenticação**: A autenticação Shopify server-side foi removida. Agora usa parâmetros de URL (`?shop=...`)
2. **Edge Functions**: Operações críticas como criar assinaturas devem usar Edge Functions do Supabase
3. **RLS**: Certifique-se de que as políticas RLS do Supabase estejam configuradas corretamente
4. **Shopify App Bridge**: Se precisar de autenticação real Shopify, você precisará adicionar o App Bridge

## 🛠️ Desenvolvimento

Para rodar o projeto:

```bash
npm install
npm run dev
```

Para build:

```bash
npm run build
```

## 📚 Documentação Relacionada

- [Shopify Billing Guide](../SHOPIFY_BILLING_GUIDE.md)
- [Quick Start Billing](../QUICK_START_BILLING.md)
- [Billing Integration Examples](../BILLING_INTEGRATION_EXAMPLES.md)

---

**Status**: ✅ Todos os arquivos adaptados e funcionando sem dependências do Remix
