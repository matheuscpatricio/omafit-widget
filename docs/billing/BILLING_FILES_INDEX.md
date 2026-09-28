# 📁 Índice de Arquivos: Shopify Billing + Supabase

## 🎯 Visão Geral

Este documento lista TODOS os arquivos criados para o sistema de billing do Omafit, organizados por categoria.

---

## 🗄️ Database (Supabase)

### Migration
- **`supabase/migrations/create_shopify_billing_schema.sql`** ✅ Aplicada
  - Cria tabelas: `billing_plans`, `shopify_shops`, `shopify_usage_records`
  - Cria enum: `billing_status_type`
  - Configura RLS e políticas
  - Insere planos padrão (Starter, Pro, Enterprise)

---

## 🔧 Backend - Utilities (Server-side)

### Core Billing
1. **`app/utils/shopify-billing.server.js`**
   - Funções principais de billing
   - `getPlanDetails()` - Busca plano no Supabase
   - `upsertShopBilling()` - Cria/atualiza billing da loja
   - `getShopBilling()` - Busca billing da loja
   - `updateBillingStatus()` - Atualiza status
   - `incrementImageUsage()` - Incrementa contador
   - `calculateExtraImagesBilling()` - Calcula cobranças extras
   - `saveUsageRecord()` - Salva registro de uso
   - `resetMonthlyImageUsage()` - Reseta contador mensal
   - `isEnterprisePlan()` - Verifica se é Enterprise

### Usage Billing
2. **`app/utils/usage-billing.server.js`**
   - Gerencia cobrança por uso de imagens extras
   - `registerImageUsageAndBill()` - **Função principal** para registrar uso e cobrar
   - `getImageUsageInfo()` - Retorna informações de uso atual
   - Usa GraphQL mutation `appUsageRecordCreate`

### Billing Guard (Proteção)
3. **`app/utils/billing-guard.server.js`**
   - Middleware para proteger rotas
   - `checkBillingAccess()` - Verifica se tem billing ativo
   - `requireBilling()` - **Middleware para Remix** (retorna erro se não tiver)
   - `checkImageLimit()` - Verifica limite de imagens
   - `assertBillingActive()` - Lança exceção se não tiver billing

---

## 🛣️ Backend - Routes (API Endpoints)

### Billing Flow
4. **`app/routes/api.billing.start.jsx`**
   - Rota: `POST /api/billing/start`
   - Inicia fluxo de assinatura Shopify
   - Body: `{ plan: "starter" | "pro" }`
   - Retorna: `{ confirmationUrl, subscriptionId }`
   - Usa GraphQL: `appSubscriptionCreate`

5. **`app/routes/admin.billing.return.jsx`**
   - Rota: `GET /admin/billing/return`
   - Callback após lojista aprovar assinatura
   - Atualiza status para 'active' no Supabase
   - Redireciona para `/app`

### Usage Billing
6. **`app/routes/api.billing.usage.jsx`**
   - Rota: `POST /api/billing/usage`
   - Registra uso de imagens
   - Body: `{ shopDomain, imagesCount }`
   - Cria cobrança automática se ultrapassar limite

### UI Pages
7. **`app/routes/app.billing.jsx`**
   - Rota: `GET /app/billing`
   - Página completa de billing
   - Exibe planos e uso atual
   - Permite escolher e assinar plano

---

## 🎨 Frontend - Components (React/Polaris)

### Planos
8. **`app/components/BillingPlans.jsx`**
   - Componente React para exibir planos
   - Cards visuais para Starter, Pro e Enterprise
   - Botões para assinar
   - Badges ("Mais Popular", etc.)
   - FAQs integradas

### Usage Indicator
9. **`app/components/UsageIndicator.jsx`**
   - Componente React para mostrar uso de imagens
   - Barra de progresso colorida
   - Alertas quando próximo/acima do limite
   - Cores dinâmicas baseadas em porcentagem

---

## 📚 Documentation

### Guias Principais
10. **`SHOPIFY_BILLING_GUIDE.md`** ⭐
    - Guia completo de todo o sistema
    - Arquitetura e fluxos
    - Configuração passo a passo
    - TODOs importantes
    - Referências e troubleshooting
    - **LEIA ESTE PRIMEIRO** para entender tudo

11. **`QUICK_START_BILLING.md`** 🚀
    - Setup rápido em 5 minutos
    - Checklist inicial
    - Fluxo visual completo
    - Troubleshooting rápido
    - **COMECE AQUI** se quiser testar logo

### Exemplos de Integração
12. **`BILLING_INTEGRATION_EXAMPLES.md`** 💡
    - Exemplos práticos de integração
    - Como registrar uso em edge functions
    - Como registrar uso em rotas Remix
    - Batch processing de imagens
    - Webhooks e cron jobs
    - Validações importantes
    - **USE ISTO** para integrar com geração de imagens

13. **`BILLING_GUARD_EXAMPLES.md`** 🛡️
    - Exemplos de uso do Billing Guard
    - Como proteger rotas
    - Como verificar limites
    - Quando usar cada função
    - Boas práticas
    - **USE ISTO** para proteger features premium

### Referência
14. **`BILLING_FILES_INDEX.md`** 📁
    - Este arquivo
    - Índice de todos os arquivos criados
    - Mapa de navegação

### Configuração
15. **`.env.example.billing`** ⚙️
    - Exemplo de variáveis de ambiente
    - Documentação de cada variável
    - Use como referência para seu `.env`

---

## 🗺️ Mapa Mental

```
BILLING SYSTEM
│
├─ 🗄️ DATABASE
│  └─ Migration SQL (já aplicada)
│
├─ 🔧 BACKEND UTILS
│  ├─ shopify-billing.server.js (funções core)
│  ├─ usage-billing.server.js (cobrança por uso)
│  └─ billing-guard.server.js (proteção)
│
├─ 🛣️ BACKEND ROUTES
│  ├─ /api/billing/start (iniciar assinatura)
│  ├─ /admin/billing/return (callback)
│  ├─ /api/billing/usage (registrar uso)
│  └─ /app/billing (página UI)
│
├─ 🎨 FRONTEND
│  ├─ BillingPlans.jsx (cards dos planos)
│  └─ UsageIndicator.jsx (barra de uso)
│
└─ 📚 DOCS
   ├─ SHOPIFY_BILLING_GUIDE.md (guia completo)
   ├─ QUICK_START_BILLING.md (início rápido)
   ├─ BILLING_INTEGRATION_EXAMPLES.md (exemplos)
   └─ BILLING_GUARD_EXAMPLES.md (proteção)
```

---

## 🎯 Como Navegar

### Se você quer...

**Entender o sistema completo:**
→ Leia `SHOPIFY_BILLING_GUIDE.md`

**Começar rápido (testar logo):**
→ Siga `QUICK_START_BILLING.md`

**Integrar com geração de imagens:**
→ Veja `BILLING_INTEGRATION_EXAMPLES.md`

**Proteger features premium:**
→ Veja `BILLING_GUARD_EXAMPLES.md`

**Saber quais funções existem:**
→ Abra `app/utils/shopify-billing.server.js`
→ Abra `app/utils/usage-billing.server.js`
→ Abra `app/utils/billing-guard.server.js`

**Ver exemplo de página completa:**
→ Abra `app/routes/app.billing.jsx`

**Ver componentes React:**
→ Abra `app/components/BillingPlans.jsx`
→ Abra `app/components/UsageIndicator.jsx`

---

## 📊 Estatísticas

**Total de arquivos criados:** 15
- Backend utilities: 3
- Backend routes: 4
- Frontend components: 2
- Documentation: 5
- Database: 1

**Linhas de código (aproximado):**
- Backend: ~1,500 linhas
- Frontend: ~400 linhas
- Documentation: ~2,500 linhas
- **Total: ~4,400 linhas**

---

## ✅ Arquivos por Status

### ✅ Prontos para Usar
- Todos os arquivos backend
- Todos os componentes frontend
- Toda a documentação
- Migration aplicada no Supabase

### ⚙️ Requerem Configuração
- `.env` (adicionar variáveis)
- `api.billing.start.jsx` (vincular user_id)
- Integração com geração de imagens (adicionar chamadas)

### 📝 Opcionais
- Cron job para processar billing
- Webhooks da Shopify
- Linha de usage pricing na assinatura

---

## 🔗 Links Rápidos

| Arquivo | Caminho | Propósito |
|---------|---------|-----------|
| Guia Principal | `SHOPIFY_BILLING_GUIDE.md` | Documentação completa |
| Quick Start | `QUICK_START_BILLING.md` | Começar rápido |
| Exemplos Integração | `BILLING_INTEGRATION_EXAMPLES.md` | Como usar no código |
| Exemplos Guard | `BILLING_GUARD_EXAMPLES.md` | Proteger rotas |
| Billing Utils | `app/utils/shopify-billing.server.js` | Funções principais |
| Usage Billing | `app/utils/usage-billing.server.js` | Cobrança por uso |
| Billing Guard | `app/utils/billing-guard.server.js` | Proteção |
| Página Billing | `app/routes/app.billing.jsx` | UI completa |
| Componente Planos | `app/components/BillingPlans.jsx` | Cards planos |
| Componente Uso | `app/components/UsageIndicator.jsx` | Barra progresso |

---

## 🎓 Ordem de Leitura Recomendada

### Para Iniciantes
1. `QUICK_START_BILLING.md` - Entender o básico
2. `SHOPIFY_BILLING_GUIDE.md` - Aprofundar conhecimento
3. `BILLING_INTEGRATION_EXAMPLES.md` - Ver como usar
4. Código dos arquivos utils - Entender implementação

### Para Implementadores
1. `SHOPIFY_BILLING_GUIDE.md` - Entender tudo
2. Código: `app/utils/shopify-billing.server.js` - Ver funções
3. Código: `app/routes/api.billing.start.jsx` - Ver fluxo
4. `BILLING_INTEGRATION_EXAMPLES.md` - Integrar
5. `BILLING_GUARD_EXAMPLES.md` - Proteger

### Para Debug
1. `QUICK_START_BILLING.md` → Seção "Troubleshooting"
2. `SHOPIFY_BILLING_GUIDE.md` → Seção "Monitoramento e Debug"
3. Logs do console
4. Dados no Supabase

---

## 📞 Suporte

Se você tiver dúvidas:

1. ✅ Verifique os guias de documentação
2. ✅ Veja os exemplos de código
3. ✅ Verifique os logs no console
4. ✅ Verifique os dados no Supabase
5. ✅ Revise este índice para encontrar o arquivo certo

---

**Navegação facilitada! Tudo organizado e documentado. 🗺️**
