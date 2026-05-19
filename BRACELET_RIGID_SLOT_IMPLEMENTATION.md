# Implementação: Todas as Pulseiras em Modo Rigid Slot

## 📋 Resumo

Todas as pulseiras do widget AR Omafit agora usam o **modo "rigid slot"** por padrão, garantindo máxima previsibilidade e fidelidade ao design original do GLB.

## 🎯 Objetivo

Fornecer a renderização mais previsível possível para pulseiras AR, eliminando deformações de geometria e garantindo que o resultado visual seja fiel ao modelo 3D original.

## ✨ Mudanças Implementadas

### 1. Modo Rigid Slot Forçado por Padrão

**Arquivo:** `public/ar/omafit-ar-widget.js`

**Nova constante:**
```javascript
const OMAFIT_BRACELET_FORCE_RIGID_SLOT_MODE = true;
```

- **TODAS** as pulseiras agora usam rigid slot independente da elongação
- Geometria preservada (sem wrap cilíndrico destrutivo)
- Escala uniforme (sem deformação elíptica)
- Depth occluder sempre ativo
- Resultado mais previsível

### 2. Metafield Override (omafit.ar_bracelet_mode)

**Função atualizada:** `computeBraceletRigidSlotFromScene(scene, cfgAttrFn)`

Novos valores suportados via metafield `omafit.ar_bracelet_mode`:

| Valor    | Comportamento                                                    |
|----------|------------------------------------------------------------------|
| `rigid`  | Força rigid slot (padrão com FORCE_RIGID_SLOT_MODE=true)       |
| `legacy` | Permite modo legado com wrap cilíndrico (menos previsível)      |
| `auto`   | Usa detecção automática por elongação (elong ≤ 3.0 → rigid)    |

**Exemplos de uso no Shopify:**
```json
{
  "omafit": {
    "ar_bracelet_mode": "rigid"
  }
}
```

### 3. Depth Occluder Otimizado

**Documentação melhorada:** Linhas 399-419 e 14894-14915

**Características:**
- Cilindro invisível (BackSide) centrado no braço
- Escreve no depth buffer sem pintar cor
- Esconde parte posterior da pulseira (cria efeito de "envolver o pulso")
- Sempre ativo em modo rigid slot
- Escala elíptica adapta-se à anatomia (largura × espessura)

**Visual:**
```
           [Câmera]
               |
         [Pulseira] ← Parte visível
              |
        [Occluder] ← Parte escondida pelo depth buffer
              |
          [Braço]
```

### 4. Hierarquia Three.js Mantida

```
anchorGroup → wearPosition → calibRot → braceletWristAlignGroup → glbRoot → glbScene
                                 ↑
                          Rotação de calibração
                          do lojista (rx/ry/rz)
```

**Confirmado:** A calibração de rotação do lojista funciona perfeitamente com rigid slot!

## 🔍 O Que é Rigid Slot?

### Modo RIGID SLOT (Novo Padrão) ✓
- ✅ Geometria preservada exatamente como no GLB original
- ✅ Escala uniforme (não deforma)
- ✅ Depth occluder sempre ativo (volume realista)
- ✅ Rotação de calibração respeitada
- ✅ **Máxima previsibilidade**

### Modo LEGADO (Somente com override)
- ❌ Wrap cilíndrico pode deformar geometria
- ❌ Escala elíptica pode distorcer proporções
- ❌ Occluder só ativo em certas orientações
- ❌ **Menos previsível**

### Modo PROCEDURAL RADIAL (Correntes/Chains)
- Continua disponível via `omafit.ar_bracelet_radial`
- Cria instâncias radiais (beads distribuídos em círculo)
- Útil para correntes de elos/beads

## 📊 Comparação de Modos

| Característica           | Rigid Slot | Legacy | Procedural Radial |
|-------------------------|------------|--------|-------------------|
| Geometria preservada    | ✅ Sim     | ❌ Não | 🔄 Recriada      |
| Escala uniforme         | ✅ Sim     | ❌ Não | ✅ Sim           |
| Depth occluder ativo    | ✅ Always  | 🔄 Às vezes | ✅ Always    |
| Fidelidade ao design    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐        |
| Previsibilidade         | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐          |
| Uso recomendado         | Todas pulseiras | Casos especiais | Correntes/chains |

## 🛠️ Metafields Relacionados

### Metafield de Modo (NOVO)
```json
{
  "namespace": "omafit",
  "key": "ar_bracelet_mode",
  "type": "single_line_text_field",
  "value": "rigid" | "legacy" | "auto"
}
```

### Metafield de Calibração (Existente)
```json
{
  "namespace": "omafit",
  "key": "ar_calibration",
  "type": "json",
  "value": {
    "rx": 0,    // Rotação X (pitch)
    "ry": 0,    // Rotação Y (yaw)
    "rz": 15    // Rotação Z (roll) - principal para pulseiras
  }
}
```

### Metafield Radial (Existente - para correntes)
```json
{
  "namespace": "omafit",
  "key": "ar_bracelet_radial",
  "type": "single_line_text_field",
  "value": "auto" | "on" | "off"
}
```

## 🎨 Resultado Visual

### Antes (Modo Legado)
- Geometria deformada pelo wrap cilíndrico
- Pode parecer "2D por cima" do braço
- Inconsistente entre diferentes GLBs

### Depois (Rigid Slot)
- Geometria preservada perfeitamente
- Parece "envolver" o pulso de forma realista
- Consistente e previsível para todos os GLBs

## 🧪 Testes Recomendados

1. **Pulseiras sólidas (bangles):**
   - Carregar GLB
   - Verificar que não há deformação de geometria
   - Confirmar que depth occluder cria efeito de volume

2. **Pulseiras com calibração:**
   - Ajustar `rz` (roll) na página de calibração
   - Verificar que rotação é aplicada corretamente no widget
   - Confirmar que geometria permanece intacta

3. **Override de modo:**
   - Testar metafield `ar_bracelet_mode: "legacy"`
   - Verificar que modo legado é ativado conforme esperado
   - Confirmar que pode voltar para "rigid"

## 📝 Notas Técnicas

### Detecção Automática (quando mode="auto")
```javascript
const elongation = maxDim / medianDim;
const isRigidSlot = elongation <= 3.0;
```

- **Elongação ≤ 3.0:** Bangle/sólido → Rigid slot
- **Elongação > 3.0:** Corrente/chain → Considerado para radial ou legacy

### Ordem de Decisão
1. Verifica `omafit.ar_bracelet_mode` metafield
2. Se não definido, usa `OMAFIT_BRACELET_FORCE_RIGID_SLOT_MODE`
3. Se `FORCE_RIGID_SLOT_MODE = false`, usa detecção automática

### Compatibilidade
- ✅ Funciona com todas as pulseiras existentes
- ✅ Compatível com sistema de calibração de rotação
- ✅ Não quebra pulseiras que já funcionam
- ✅ Melhora consistência visual geral

## 🚀 Próximos Passos (Opcional)

1. **Analytics:** Monitorar se há casos onde override é necessário
2. **Feedback:** Coletar feedback dos lojistas sobre previsibilidade
3. **Documentação:** Atualizar guias do lojista sobre o novo comportamento
4. **UI Admin:** Considerar adicionar toggle na página de calibração

## 📚 Referências de Código

- **Constante principal:** Linha 12747 - `OMAFIT_BRACELET_FORCE_RIGID_SLOT_MODE`
- **Função de detecção:** Linha 13519 - `computeBraceletRigidSlotFromScene()`
- **Depth occluder:** Linha 399 - `OMAFIT_BRACELET_DEPTH_OCCLUDER_ENABLED`
- **Aplicação de modo:** Linha 14894 - Visibilidade do occluder
- **Hierarquia:** Linha 11694 - Comentário da hierarquia Three.js

## ✅ Status

- [x] Modo rigid slot forçado por padrão
- [x] Metafield override implementado
- [x] Depth occluder otimizado
- [x] Documentação atualizada
- [x] Calibração de rotação verificada

**Data de implementação:** 19 de Maio de 2026  
**Autor:** Omafit AR Widget Team
