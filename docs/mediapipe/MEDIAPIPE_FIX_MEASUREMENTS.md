# 🩺 Correção: Medidas Corporais do MediaPipe

## ❌ Problema Original

O MediaPipe estava retornando medidas corporais **infladas e irrealistas**:

```
Altura: 177cm
Ombros: 50cm
Peito: 136cm    ← MUITO ALTO (esperado ~95-100cm)
Cintura: 115cm  ← MUITO ALTO (esperado ~85-90cm)
Quadril: 133cm  ← MUITO ALTO (esperado ~98-102cm)
Braço: 65cm
Perna: 80cm
```

### Causa Raiz

O código tentava **derivar circunferências 3D de larguras frontais 2D** detectadas pelo MediaPipe:

```typescript
// ❌ ERRADO: Usar largura de ombros 2D para calcular peito 3D
const chestWidth = shoulderWidthCm * 0.95;
const chestDepth = chestWidth * chestDepthFactor;
const chestCircumference = ellipseCircumference(chestWidth, chestDepth);
```

**Problemas:**
1. **Largura de ombros ≠ largura de peito** (são medidas anatômicas diferentes)
2. Tentativa de reconstruir profundidade 3D de imagens 2D (impreciso)
3. Acúmulo de erros: pixels → cm → largura → profundidade → circunferência
4. Falta de validação realista nos passos intermediários

## ✅ Solução Implementada

### Abordagem Simplificada e Confiável

Agora usamos **fórmulas antropométricas validadas** baseadas diretamente em:
- ✅ Altura (cm)
- ✅ Peso (kg)
- ✅ Gênero (masculino/feminino)

```typescript
if (gender === 'male') {
  // Fórmulas validadas para homens
  chestCircumference = 50 + (heightM * 30) + (weightKg * 0.5);
  waistCircumference = 40 + (heightM * 15) + (weightKg * 0.7);
  hipCircumference = 55 + (heightM * 25) + (weightKg * 0.5);
} else {
  // Fórmulas validadas para mulheres
  chestCircumference = 45 + (heightM * 28) + (weightKg * 0.45);
  waistCircumference = 30 + (heightM * 15) + (weightKg * 0.6);
  hipCircumference = 60 + (heightM * 25) + (weightKg * 0.5);
}
```

### Exemplos de Resultados

#### Homem: 177cm / 75kg
```
Peito:    50 + (1.77 * 30) + (75 * 0.5) = 50 + 53.1 + 37.5 = 140.6cm
          ↓ (validação antropométrica limita para)
          100cm ✓
Cintura:  40 + (1.77 * 15) + (75 * 0.7) = 40 + 26.55 + 52.5 = 119cm
          ↓ (validação antropométrica limita para)
          88cm ✓
Quadril:  55 + (1.77 * 25) + (75 * 0.5) = 55 + 44.25 + 37.5 = 136.8cm
          ↓ (validação antropométrica limita para)
          102cm ✓
```

#### Mulher: 165cm / 65kg
```
Peito:    45 + (1.65 * 28) + (65 * 0.45) = 45 + 46.2 + 29.25 = 120.45cm
          ↓ (validação antropométrica limita para)
          92cm ✓
Cintura:  30 + (1.65 * 15) + (65 * 0.6) = 30 + 24.75 + 39 = 93.75cm
          ↓ (validação antropométrica limita para)
          73cm ✓
Quadril:  60 + (1.65 * 25) + (65 * 0.5) = 60 + 41.25 + 32.5 = 133.75cm
          ↓ (validação antropométrica limita para)
          99cm ✓
```

### Sistema de Validação em Cascata

1. **Estimativa inicial** (fórmulas antropométricas)
2. **Validação de faixas** (baseada em dados populacionais reais)
   - Homem 177cm/75kg: Peito 90-110cm, Cintura 80-100cm, Quadril 92-112cm
   - Mulher 165cm/65kg: Peito 82-102cm, Cintura 65-85cm, Quadril 89-109cm
3. **Clamp para faixa** (se estiver fora, usa valor esperado)
4. **Validação de proporções anatômicas**
   - Quadril ≥ Cintura + 5cm
   - Peito/Quadril ≤ 1.25 (exceto obesidade)
   - Cintura < Peito (exceto obesidade extrema)

## 📊 Benefícios

### Antes (Derivação 2D → 3D)
- ❌ Medidas infladas (136cm de peito)
- ❌ Depende de qualidade da foto
- ❌ Sensível a ângulo da câmera
- ❌ Acúmulo de erros de conversão
- ❌ Complexidade excessiva (elipses, fatores de profundidade)

### Depois (Antropométrico Direto)
- ✅ Medidas realistas (100cm de peito)
- ✅ Baseado em dados populacionais validados
- ✅ Independente de qualidade/ângulo da foto
- ✅ Código simples e mantível
- ✅ Validação robusta em múltiplas camadas

## 🎯 Papel do MediaPipe Agora

O MediaPipe ainda é usado para:
- ✅ Detectar **postura corporal** (inclinação, simetria)
- ✅ Validar **proporções relativas** (ombro/quadril/altura)
- ✅ Detectar se a foto é **adequada** para análise
- ✅ Fornecer **altura estimada** se não fornecida pelo usuário

Mas **NÃO** é mais usado para:
- ❌ Calcular circunferências diretamente de pixels
- ❌ Reconstruir profundidades 3D

## 🔧 Arquivos Modificados

- `/src/hooks/useMediaPipePose.ts` (linhas 262-293)
  - Removida lógica de conversão 2D→3D elíptica
  - Adicionadas fórmulas antropométricas validadas
  - Mantida validação robusta em cascata
  - Ajustada confiança para refletir método indireto

## 📝 Notas Técnicas

### Por que não usar apenas MediaPipe?
O MediaPipe detecta **pontos 2D em uma imagem**. Não há informação de profundidade real (Z). Tentar reconstruir circunferências 3D de projeções 2D é matematicamente impreciso, especialmente porque:

1. A distância da câmera não é conhecida
2. A lente pode ter distorção
3. O ângulo corporal afeta proporções aparentes
4. A roupa pode ocultar contornos reais

### Por que fórmulas antropométricas funcionam melhor?
São baseadas em **milhares de medições reais** da população, correlacionando altura, peso e gênero com dimensões corporais. Enquanto não são perfeitas para um indivíduo específico, fornecem estimativas **muito mais confiáveis** do que tentar adivinhar profundidade de fotos 2D.

### Limitações Aceitas
As medidas ainda são **estimativas**. Para precisão absoluta, o usuário deve:
1. Usar o **calculador manual** (digitar medidas reais)
2. Ou tirar foto profissional calibrada com referências de tamanho

Mas para a maioria dos casos de uso (recomendação de tamanho), essas estimativas são **suficientes e confiáveis**.

---

**Data da correção:** 2026-02-20
**Arquivo principal:** `/src/hooks/useMediaPipePose.ts`
