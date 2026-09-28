# Correções de Persistência de Dados nas Edge Functions

## Resumo das Alterações

Este documento detalha as correções implementadas para garantir que os dados enviados pelo widget sejam salvos corretamente no Supabase.

---

## 🔍 Problemas Identificados

### 1. **Edge Function `tryon`**
- ❌ Não estava recebendo `shop_name` do widget
- ❌ Não estava salvando `shop_name` na tabela `tryon_sessions`
- ❌ Logs insuficientes para debugar dados recebidos
- ❌ Falta de tratamento de erros detalhado ao salvar dados

### 2. **Edge Function `validate-size`**
- ❌ Recebia `shop_name` mas não tinha logs para confirmar
- ⚠️ Interface TypeScript não incluía `shop_domain` e `custom_message`
- ❌ Logs insuficientes para debugar requisições

### 3. **Banco de Dados**
- ❌ Tabela `tryon_sessions` não tinha coluna `shop_name`

---

## ✅ Correções Implementadas

### 1. **Edge Function `tryon` (`/supabase/functions/tryon/index.ts`)**

#### a) Recepção de Dados Expandida
```typescript
const {
  model_image,
  garment_image,
  product_name,
  product_id,
  public_id,
  user_measurements,
  pose_landmarks,
  detected_measurements,
  shop_name,           // ✅ NOVO
  shop_domain,         // ✅ NOVO
  collection_handle    // ✅ NOVO
} = await req.json();
```

#### b) Logs de Debug Detalhados
```typescript
console.log('📦 DADOS RECEBIDOS DO WIDGET:');
console.log('   • shop_name:', shop_name || 'não fornecido');
console.log('   • shop_domain:', shop_domain || 'não fornecido');
console.log('   • collection_handle:', collection_handle || 'não fornecido');
console.log('   • product_name:', product_name || 'não fornecido');
console.log('   • product_id:', product_id || 'não fornecido');
// ... mais logs
```

#### c) Salvamento de `shop_name` na Sessão
```typescript
const sessionData: any = {
  product_id,
  customer_email: clientIp,
  model_image,
  user_id: effectiveUserId,
  fashn_status: 'processing',
  session_start_time: sessionStartTime,
  processing_start_time: sessionStartTime,
};

// ✅ Adicionar shop_name se disponível
if (shop_name) {
  sessionData.shop_name = shop_name;
  console.log('✅ shop_name será salvo na sessão:', shop_name);
}
```

#### d) Logs Detalhados de Persistência
```typescript
console.log('💾 Criando sessão no banco com dados:', {
  product_id: sessionData.product_id,
  user_id: sessionData.user_id,
  shop_name: sessionData.shop_name || 'não definido',
  has_user_measurements: !!user_measurements
});

// Logs de sucesso/erro para cada operação
if (analyticsError) {
  console.error('⚠️ Erro ao criar analytics (não crítico):', analyticsError);
} else {
  console.log('✅ Analytics criado com sucesso');
}
```

---

### 2. **Edge Function `validate-size` (`/supabase/functions/validate-size/index.ts`)**

#### a) Interface TypeScript Atualizada
```typescript
interface ValidateSizeRequest {
  altura_cm: number;
  peso_kg: number;
  peito_cm: number;
  cintura_cm: number;
  quadril_cm: number;
  elasticidade: string;
  categoria: string;
  tamanho_calculado_algoritmo: string;
  intencao_usuario?: string;
  session_id?: string;
  interaction_count?: number;
  shop_name?: string;        // ✅ JÁ EXISTIA
  shop_domain?: string;      // ✅ NOVO
  language?: string;
  custom_message?: string;   // ✅ NOVO
  complementary_product?: {
    name: string;
    category: string;
    image_url: string;
  };
}
```

#### b) Logs de Debug Completos
```typescript
console.log('📦 DADOS RECEBIDOS EM VALIDATE-SIZE:');
console.log('   • shop_name:', data.shop_name || 'não fornecido');
console.log('   • shop_domain:', data.shop_domain || 'não fornecido');
console.log('   • altura_cm:', data.altura_cm);
console.log('   • peso_kg:', data.peso_kg);
console.log('   • tamanho_calculado:', data.tamanho_calculado_algoritmo);
console.log('   • intencao_usuario:', data.intencao_usuario || 'validar tamanho');
console.log('   • custom_message:', data.custom_message || 'não fornecido');
// ... mais logs
```

---

### 3. **Migration de Banco de Dados**

#### Migration: `add_shop_name_to_tryon_sessions.sql`
```sql
-- Adicionar coluna shop_name à tabela tryon_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tryon_sessions' AND column_name = 'shop_name'
  ) THEN
    ALTER TABLE tryon_sessions ADD COLUMN shop_name text;
    COMMENT ON COLUMN tryon_sessions.shop_name IS 'Nome da loja de origem da sessão (para rastreamento)';
  END IF;
END $$;
```

**Características:**
- ✅ Campo `text` nullable (compatível com sessões antigas)
- ✅ Comentário descritivo
- ✅ Verifica existência antes de criar (idempotente)
- ✅ Não requer índice (não usado em queries frequentes)

---

## 🔄 Fluxo de Dados Corrigido

### Widget → Edge Function `tryon`

```mermaid
Widget (omafit-widget.js)
  ↓ envia via fetch/postMessage
  {
    model_image,
    garment_image,
    shop_name,         ← AGORA CAPTURADO
    shop_domain,       ← AGORA CAPTURADO
    user_measurements,
    ...
  }
  ↓
Edge Function tryon
  ↓ logs detalhados
  📦 DADOS RECEBIDOS DO WIDGET
  ↓ valida e processa
  ↓ salva no banco
tryon_sessions
  ↓ com shop_name  ← AGORA SALVO
  ✅ Persistido
```

### Widget → Edge Function `validate-size`

```mermaid
Widget
  ↓ envia
  {
    altura_cm,
    peso_kg,
    shop_name,         ← AGORA LOGADO
    shop_domain,       ← AGORA RECONHECIDO
    custom_message,    ← AGORA RECONHECIDO
    ...
  }
  ↓
Edge Function validate-size
  ↓ logs detalhados
  📦 DADOS RECEBIDOS EM VALIDATE-SIZE
  ↓ processa com GPT
  ✅ Resposta
```

---

## 📊 Estrutura de Dados no Banco

### Tabela: `tryon_sessions`
```
┌─────────────────────┬──────────┬──────────────────────────────┐
│ Coluna              │ Tipo     │ Descrição                    │
├─────────────────────┼──────────┼──────────────────────────────┤
│ id                  │ uuid     │ Primary Key                  │
│ product_id          │ text     │ ID do produto                │
│ user_id             │ uuid     │ ID do usuário                │
│ shop_name           │ text     │ Nome da loja (NOVO) ✅       │
│ model_image         │ text     │ URL da imagem do modelo      │
│ result_image        │ text     │ URL do resultado             │
│ fashn_status        │ text     │ Status do processamento      │
│ fashn_prediction_id │ text     │ ID da predição FAL.ai        │
│ created_at          │ timestamptz │ Data de criação           │
│ ...                 │ ...      │ ...                          │
└─────────────────────┴──────────┴──────────────────────────────┘
```

### Tabela: `session_analytics`
```
✅ JÁ POSSUI: shop_domain (text)
- Não precisa de alterações
```

---

## 🚀 Benefícios das Correções

### 1. **Rastreabilidade Completa**
- ✅ Cada sessão agora registra a loja de origem
- ✅ Possível gerar relatórios por loja
- ✅ Analytics mais precisos

### 2. **Debug Facilitado**
- ✅ Logs detalhados em cada edge function
- ✅ Identificação rápida de problemas de dados
- ✅ Rastreamento do fluxo completo de dados

### 3. **Persistência Garantida**
- ✅ Tratamento de erros individualizado
- ✅ Logs de sucesso/falha para cada operação
- ✅ Dados não são perdidos silenciosamente

### 4. **Compatibilidade**
- ✅ Campos nullable mantêm compatibilidade com dados antigos
- ✅ Migrations idempotentes (podem ser executadas múltiplas vezes)
- ✅ Sem breaking changes

---

## 🧪 Como Testar

### 1. Verificar Logs no Supabase
```bash
# Acesse: Supabase Dashboard → Edge Functions → Logs
# Procure por:
📦 DADOS RECEBIDOS DO WIDGET
📦 DADOS RECEBIDOS EM VALIDATE-SIZE
✅ shop_name será salvo na sessão
✅ Medidas do usuário salvas com sucesso
```

### 2. Consultar Banco de Dados
```sql
-- Verificar sessões recentes com shop_name
SELECT
  id,
  product_id,
  shop_name,
  created_at
FROM tryon_sessions
WHERE shop_name IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Testar no Widget
1. Abrir uma página de produto com o widget
2. Iniciar um try-on
3. Verificar os logs do console do navegador
4. Verificar os logs da edge function no Supabase
5. Consultar o banco para confirmar que `shop_name` foi salvo

---

## 📝 Notas Importantes

### Resolução do Nome da Loja no Widget

O widget usa uma cascata de fallbacks para resolver `shop_name`:

1. `OMAFIT_CONFIG.storeName` (configuração explícita)
2. `meta[property="og:site_name"]` (Open Graph)
3. `meta[name="application-name"]` (meta tag)
4. Sufixo do `document.title` (ex.: "Produto - Nome da Loja")
5. Domínio da loja (sem `.myshopify.com`)
6. "Omafit" (fallback final)

Este valor resolvido é enviado como `shop_name` em todas as requisições.

### Campos Relacionados a Shop

- **`shop_name`**: Nome legível da loja (ex.: "Minha Loja")
- **`shop_domain`**: Domínio completo (ex.: "minha-loja.myshopify.com")
- **`collection_handle`**: Handle da coleção Shopify (se aplicável)

Todos são opcionais e nullable para máxima compatibilidade.

---

## ✅ Status Final

- ✅ Edge Function `tryon` atualizada e deployed
- ✅ Edge Function `validate-size` atualizada e deployed
- ✅ Migration de banco aplicada
- ✅ Logs de debug implementados
- ✅ Documentação completa criada

**Data da Implementação:** 2026-02-20
