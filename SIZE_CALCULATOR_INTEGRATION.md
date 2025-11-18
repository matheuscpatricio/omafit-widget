# Integração da Calculadora de Tamanhos - Guia de Implementação

## ✅ Componentes Implementados

### 1. **Tabela no Supabase** (✅ Completo)
- `size_charts` - Tabela principal de tabelas de medidas
- `size_chart_entries` - Entradas individuais de cada tamanho
- RLS configurado para segurança
- Políticas públicas para leitura via widget

### 2. **Componente SizeCalculator** (✅ Completo)
Arquivo: `/src/components/SizeCalculator.tsx`

**Funcionalidades:**
- Seleção de gênero (Masculino/Feminino)
- Input de altura e peso
- Seleção visual de tipo de corpo (5 manequins)
- Escolha de ajuste (Justa, Na medida, Solta)
- Validação de dados
- Interface responsiva e intuitiva

**Props:**
```typescript
interface SizeCalculatorProps {
  onComplete: (data: SizeCalculatorData) => void;
  onBack: () => void;
}

export interface SizeCalculatorData {
  gender: 'male' | 'female';
  height: number;
  weight: number;
  bodyType: number;  // Fator do manequim
  fit: number;       // Fator de ajuste
}
```

### 3. **Lógica de Cálculo** (✅ Completo)
Arquivo: `/src/utils/sizeCalculation.ts`

**Função principal:**
```typescript
calculateIdealSize(
  height: number,
  weight: number,
  bodyTypeFactor: number,
  fitFactor: number,
  sizeChart: SizeChartEntry[]
): { size: string; measurements: BodyMeasurements } | null
```

**Algoritmo:**
1. Calcula IMC básico
2. Aplica fator do tipo de corpo
3. Aplica fator de ajuste de roupa
4. Interpola medidas (busto, cintura, quadril) baseado em tabela antropométrica
5. Compara com tabela de medidas do lojista
6. Retorna o tamanho com menor diferença média

### 4. **Painel Admin - Tabela de Medidas** (✅ Completo)
Arquivo: `/src/components/SizeChartManager.tsx`

**Funcionalidades:**
- Interface para criar/editar tabela de medidas
- Campos: Nome do tamanho, Busto, Cintura, Quadril
- Salvar/carregar do Supabase
- Validação de dados
- Instruções de como medir
- Aba "Tabela de Medidas" adicionada ao menu do admin

## 🔄 Integração Pendente no Widget

### Mudanças Necessárias no TryOnWidget.tsx

#### 1. Importar Componentes
```typescript
import { SizeCalculator, SizeCalculatorData } from './SizeCalculator';
import { calculateIdealSize } from '../utils/sizeCalculation';
import { supabase } from '../lib/supabase';
```

#### 2. Adicionar Estados
```typescript
const [sizeData, setSizeData] = useState<SizeCalculatorData | null>(null);
const [calculatedSize, setCalculatedSize] = useState<string | null>(null);
const [sizeChart, setSizeChart] = useState<any[]>([]);
```

#### 3. Atualizar Type do Step
```typescript
const [step, setStep] = useState<'info' | 'calculator' | 'photo' | 'confirm' | 'processing' | 'result'>('info');
```

#### 4. Carregar Tabela de Medidas
```typescript
useEffect(() => {
  // Carregar tabela de medidas do lojista via widgetID
  const loadSizeChart = async () => {
    // TODO: Buscar size_chart baseado no widgetID/user
    const { data } = await supabase
      .from('size_chart_entries')
      .select('*')
      .eq('size_chart_id', 'USER_SIZE_CHART_ID')
      .order('order');

    if (data) {
      setSizeChart(data);
    }
  };

  loadSizeChart();
}, []);
```

#### 5. Atualizar Fluxo Info Step
Mudar de:
```typescript
<button onClick={() => setStep('email')}>
```

Para:
```typescript
<button onClick={() => setStep('calculator')}>
```

E atualizar as instruções para:
1. Calculadora de tamanho
2. Envie sua foto
3. Veja o resultado + tamanho ideal

#### 6. Remover Email Step Completo
Deletar todo o bloco:
```typescript
{step === 'email' && (
  // ... todo o conteúdo
)}
```

#### 7. Adicionar Calculator Step
```typescript
{step === 'calculator' && (
  <SizeCalculator
    onComplete={(data) => {
      setSizeData(data);
      setStep('photo');
    }}
    onBack={() => setStep('info')}
  />
)}
```

#### 8. Atualizar goBack Function
```typescript
const goBack = () => {
  switch (step) {
    case 'calculator':
      setStep('info');
      break;
    case 'photo':
      setStep('calculator');
      break;
    case 'confirm':
      setStep('photo');
      break;
    default:
      break;
  }
};
```

#### 9. Calcular Tamanho no handleSubmit
Adicionar após o try-on ser processado:
```typescript
// Após receber resultado do try-on
if (sizeData && sizeChart.length > 0) {
  const result = calculateIdealSize(
    sizeData.height,
    sizeData.weight,
    sizeData.bodyType,
    sizeData.fit,
    sizeChart
  );

  if (result) {
    setCalculatedSize(result.size);
  }
}
```

#### 10. Atualizar Result Step
Adicionar após a imagem do resultado:
```typescript
{calculatedSize && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
    <div className="flex items-center gap-3">
      <Ruler className="w-6 h-6 text-green-600" />
      <div>
        <h4 className="font-semibold text-green-900 mb-1">
          Tamanho Ideal: {calculatedSize}
        </h4>
        <p className="text-sm text-green-700">
          Com base na sua altura, peso e tipo físico
        </p>
      </div>
    </div>
  </div>
)}
```

#### 11. Remover Botão "Adicionar ao Carrinho"
Deletar o botão inteiro:
```typescript
<button
  onClick={() => { /* ... */ }}
  className="flex-1 bg-primary ..."
>
  <ShoppingCart className="w-5 h-5" />
  Adicionar ao Carrinho
</button>
```

#### 12. Atualizar resetWidget
```typescript
const resetWidget = () => {
  setStep('info');
  setModelImage(null);
  setImagePreview(null);
  setSizeData(null);
  setCalculatedSize(null);
  setResult(null);
  setError('');
  setPredictionId(null);
};
```

## �� Fluxo Final

1. **Info** → Introdução e instruções
2. **Calculator** → Calculadora de tamanho
3. **Photo** → Upload de foto
4. **Confirm** → Confirmar dados
5. **Processing** → Processamento
6. **Result** → Resultado + Tamanho ideal

## 🔒 Segurança

- RLS habilitado em todas as tabelas
- Políticas públicas apenas para leitura
- Validação de widgetID
- Verificação de créditos do lojista

## 🎨 Manequins

### Feminino
1. Muito magra - 0.90
2. Magra - 0.95
3. Média - 1.00
4. Curvilínea - 1.10
5. Plus - 1.20

### Masculino
1. Ectomorfo - 0.90
2. Atlético magro - 0.95
3. Médio - 1.00
4. Mesomorfo - 1.10
5. Endomorfo - 1.20

## 📝 Notas Importantes

- O arquivo TryOnWidget.tsx tem 600 linhas e requer modificação manual
- Todas as dependências e utilities estão criadas
- A integração final deve ser feita com cuidado para manter a funcionalidade existente
- Testar cada step após a integração
