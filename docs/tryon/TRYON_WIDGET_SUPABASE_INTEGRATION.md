# TryOnWidget - Integração com Supabase

## Visão Geral

O TryOnWidget (componente React dentro do iframe) foi atualizado para integrar-se diretamente com o Supabase, permitindo:

1. **Buscar configurações do widget** ao carregar
2. **Buscar tabelas de medidas** após completar a calculadora de tamanho
3. **Calcular tamanho recomendado** usando fórmulas baseadas em medidas corporais
4. **Exibir o tamanho recomendado** na interface do usuário
5. **Incluir recommendedSize** no payload da API de try-on

## Fluxo de Integração

### 1. Recebendo shopDomain via URL

O WidgetPage extrai o `shopDomain` da URL:

```typescript
const params = new URLSearchParams(window.location.search);
const shop = params.get('shopDomain');
setShopDomain(shop);
```

O shopDomain é passado para o TryOnWidget:

```tsx
<TryOnWidget
  garmentImage={productImage}
  productImages={productImages}
  shopDomain={shopDomain}
  // ... outras props
/>
```

### 2. Busca de Configurações ao Carregar

Quando o componente é montado:

```typescript
useEffect(() => {
  const fetchWidgetConfig = async () => {
    const { data: configs } = await supabase
      .from('widget_configurations')
      .select('link_text, store_logo, primary_color, widget_title, widget_subtitle')
      .eq('shop_domain', shopDomain)
      .limit(1);

    if (configs && configs.length > 0) {
      console.log('✅ Configurações do widget carregadas:', configs[0]);
    }
  };

  fetchWidgetConfig();
}, [shopDomain]);
```

**Endpoint**: `GET /rest/v1/widget_configurations?shop_domain=eq.{shopDomain}`

### 3. Calculadora de Tamanho

Quando o usuário completa a calculadora de tamanho:

```typescript
<SizeCalculator
  onComplete={(data) => {
    setSizeData(data);
    setStep('photo');
  }}
  primaryColor={primaryColor}
/>
```

Os dados salvos em `sizeData`:
```typescript
{
  height: 175,         // cm
  weight: 70,          // kg
  gender: 'male',      // 'male', 'female', 'unisex'
  bodyTypeIndex: 1,    // 0 = slim, 1 = regular, 2 = plus
  fitIndex: 1          // 0 = ajustado, 1 = regular, 2 = largo
}
```

### 4. Busca de Tabela de Medidas

Um `useEffect` monitora mudanças em `sizeData.gender`:

```typescript
useEffect(() => {
  const loadSizeChart = async () => {
    // Buscar tabela específica para o gênero
    const { data: charts } = await supabase
      .from('size_charts')
      .select('sizes')
      .eq('shop_domain', shopDomain)
      .eq('gender', sizeData.gender);

    if (charts && charts.length > 0) {
      sizeChartData = charts[0].sizes;
    } else {
      // Fallback para unisex
      const { data: unisexCharts } = await supabase
        .from('size_charts')
        .select('sizes')
        .eq('shop_domain', shopDomain)
        .eq('gender', 'unisex');

      sizeChartData = unisexCharts[0]?.sizes;
    }

    setSizeChart(sizeChartData);
  };

  loadSizeChart();
}, [sizeData?.gender, shopDomain]);
```

**Endpoint**: `GET /rest/v1/size_charts?shop_domain=eq.{shopDomain}&gender=eq.{gender}&select=sizes`

**Estrutura dos dados retornados**:
```json
[
  {
    "sizes": [
      {
        "size": "P",
        "peito": "88",
        "cintura": "70",
        "quadril": "92"
      },
      {
        "size": "M",
        "peito": "92",
        "cintura": "74",
        "quadril": "96"
      }
    ]
  }
]
```

### 5. Cálculo de Tamanho Recomendado

Função que calcula o tamanho baseado nas medidas:

```typescript
const calculateRecommendedSize = (
  measurements: SizeCalculatorData,
  chart: SizeChartEntry[]
): string | null => {
  const { height, bodyTypeIndex, fitIndex } = measurements;

  // Normalizar índices para multiplicadores
  const bodyType = 0.9 + (bodyTypeIndex * 0.1);  // 0.9, 1.0, 1.1
  const fit = 0.95 + (fitIndex * 0.05);          // 0.95, 1.0, 1.05

  // Calcular medidas base do usuário
  const baseChest = height * 0.45 * bodyType * fit;
  const baseWaist = height * 0.35 * bodyType * fit;
  const baseHip = height * 0.50 * bodyType * fit;

  // Encontrar tamanho com menor distância euclidiana
  let bestSize = null;
  let minDistance = Infinity;

  chart.forEach((sizeData) => {
    const chest = parseFloat(sizeData.peito || sizeData.chest || '0');
    const waist = parseFloat(sizeData.cintura || sizeData.waist || '0');
    const hip = parseFloat(sizeData.quadril || sizeData.hip || '0');

    const distance = Math.sqrt(
      Math.pow(baseChest - chest, 2) +
      Math.pow(baseWaist - waist, 2) +
      Math.pow(baseHip - hip, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      bestSize = sizeData.size;
    }
  });

  return bestSize;
};
```

**Exemplo de Cálculo**:

Usuário com:
- Altura: 175 cm
- Tipo de corpo: Regular (index 1 → multiplicador 1.0)
- Ajuste: Regular (index 1 → multiplicador 1.0)

Medidas calculadas:
- Peito: 175 × 0.45 × 1.0 × 1.0 = 78.75 cm
- Cintura: 175 × 0.35 × 1.0 × 1.0 = 61.25 cm
- Quadril: 175 × 0.50 × 1.0 × 1.0 = 87.5 cm

Comparação com tabela:
```
Tamanho P: peito=88, cintura=70, quadril=92
Distância = √[(78.75-88)² + (61.25-70)² + (87.5-92)²] = 13.42

Tamanho M: peito=92, cintura=74, quadril=96
Distância = √[(78.75-92)² + (61.25-74)² + (87.5-96)²] = 19.21

Resultado: P (menor distância)
```

### 6. Envio de Mensagem para Parent Window

Após calcular o tamanho recomendado:

```typescript
if (recommended) {
  window.parent.postMessage({
    type: 'sizeCalculatorComplete',
    measurements: {
      height: sizeData.height,
      bodyType: 0.9 + (sizeData.bodyTypeIndex * 0.1),
      fit: 0.95 + (sizeData.fitIndex * 0.05),
      gender: sizeData.gender
    },
    recommendedSize: recommended
  }, '*');
}
```

Esta mensagem pode ser capturada pelo omafit-widget.js (página pai) para processamento adicional.

### 7. Exibição do Tamanho Recomendado

Na tela de confirmação (step 'confirm'), o tamanho recomendado é exibido:

```tsx
{recommendedSize && (
  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 md:p-5">
    <div className="flex items-center justify-center gap-3">
      <Ruler className="w-6 h-6 text-green-600" />
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-1">
          Tamanho recomendado para você:
        </p>
        <p className="text-2xl md:text-3xl font-bold text-green-700">
          {recommendedSize}
        </p>
      </div>
      <CheckCircle className="w-6 h-6 text-green-600" />
    </div>
  </div>
)}
```

### 8. Inclusão no Payload da API

Quando o usuário clica em "Processar":

```typescript
const payload = {
  model_image: modelImageDataUrl,
  garment_image: selectedProductImage,
  product_name: product.name,
  product_id: product.id,
  public_id: publicId,
  user_measurements: sizeData ? {
    gender: sizeData.gender,
    height: sizeData.height,
    weight: sizeData.weight,
    body_type_index: sizeData.bodyTypeIndex,
    fit_preference_index: sizeData.fitIndex,
    recommended_size: recommendedSize || calculatedSize  // ← Incluído aqui
  } : null
};

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tryon`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(payload)
  }
);
```

## Estrutura de Estados

### Estados Principais

```typescript
const [sizeData, setSizeData] = useState<SizeCalculatorData | null>(null);
const [recommendedSize, setRecommendedSize] = useState<string | null>(null);
const [sizeChart, setSizeChart] = useState<SizeChartEntry[]>([]);
const [shopDomain, setShopDomain] = useState<string>('');
```

### Interface SizeChartEntry

```typescript
interface SizeChartEntry {
  size: string;
  peito?: string;
  chest?: string;
  cintura?: string;
  waist?: string;
  quadril?: string;
  hip?: string;
}
```

## Fluxo Completo do Usuário

1. **Usuário abre o widget** → shopDomain é extraído da URL
2. **Widget carrega configurações** do Supabase
3. **Usuário completa calculadora de tamanho** → sizeData é salvo
4. **Sistema busca tabela de medidas** usando shopDomain + gender
5. **Sistema calcula tamanho recomendado** usando fórmulas
6. **Sistema envia postMessage** para parent window (opcional)
7. **Usuário faz upload da foto** → avança para confirmação
8. **Tela mostra tamanho recomendado** em destaque
9. **Usuário clica em "Processar"** → recommendedSize vai no payload
10. **API gera try-on** com informações de tamanho

## Debugging

Logs disponíveis no console:

```
⚠️ Não há gender no sizeData
📊 Carregando size chart para gender: male shopDomain: minhaloja.myshopify.com
✅ Size chart encontrado para male
✅ Size chart definido com 3 tamanhos
📏 Medidas calculadas: {baseChest: 78.75, baseWaist: 61.25, baseHip: 87.5, bodyType: 1, fit: 1}
✅ Tamanho recomendado: M
✅ Configurações do widget carregadas
```

## Tratamento de Erros

### Tabela de medidas não encontrada

```typescript
if (!sizeChartData) {
  console.log('❌ Nenhum chart encontrado para shopDomain:', shopDomain);
  // Widget continua funcionando normalmente, mas sem recomendação de tamanho
}
```

### ShopDomain não fornecido

```typescript
if (!shopDomain) {
  console.log('⚠️ Não há shopDomain para buscar size chart');
  return;
  // Widget continua funcionando normalmente
}
```

### Fallback automático para unisex

Se não houver tabela para o gênero específico (male/female), o sistema automaticamente tenta buscar uma tabela unisex.

## Compatibilidade

- ✅ Funciona sem shopDomain (não busca size charts)
- ✅ Funciona sem tabelas de medidas (não calcula tamanho)
- ✅ Funciona com tabelas parciais (usa campos disponíveis)
- ✅ Suporta nomes de campos em português e inglês (peito/chest, etc)

## Melhorias Futuras

1. **Cache de configurações**: Evitar múltiplas buscas da mesma loja
2. **Validação de medidas**: Alertar se tabela de medidas está incompleta
3. **Histórico de preferências**: Salvar preferências de tamanho do usuário
4. **Machine Learning**: Melhorar precisão com base em devoluções
5. **Múltiplas tabelas**: Suportar diferentes tabelas por categoria de produto
