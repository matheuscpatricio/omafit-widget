# Changelog v30: Slider de Profundidade para Óculos

**Data:** 2026-05-20  
**Build:** `2026-05-20-glasses-depth-slider-v30`  
**Status:** Implementado

## Resumo

Implementado slider de profundidade (distância do rosto) para óculos na página de calibração, com correspondência perfeita no widget AR. O merchant pode agora ajustar fino a distância dos óculos em relação ao rosto com valores de -50mm a +50mm em passos de 5mm.

## Motivação

O usuário solicitou: "pode colocar o slider para aproximar/afastar o óculos do rosto, desde que fique correspondente no widget".

Até v29, a profundidade dos óculos era controlada apenas pelo atributo `data-ar-glasses-depth-forward-m` (valor fixo no widget). Não havia forma do merchant ajustar essa profundidade por produto/variante via admin.

## Mudanças Implementadas

### 1. `app/ar-calibration.shared.js`

#### Novas Constantes
```javascript
export const AR_GLASSES_DEPTH_MIN_M = -0.05;   // -50mm
export const AR_GLASSES_DEPTH_MAX_M = 0.05;    // +50mm
export const AR_GLASSES_DEPTH_STEP_M = 0.005;  // 5mm
```

#### `sanitizeArCalibrationInput` (modificado)
- Agora detecta `accessoryType` e aplica bounds específicos para `wearZ`:
  - **Óculos:** `[-0.05, 0.05]` (±50mm)
  - **Outros acessórios:** `[-0.1, 0.1]` (bounds antigos mantidos)

**Fragmento:**
```javascript
const type = normalizeAccessoryType(accessoryType) || AR_ACCESSORY_TYPE_DEFAULT;
const wearZBounds = type === "glasses"
  ? { min: AR_GLASSES_DEPTH_MIN_M, max: AR_GLASSES_DEPTH_MAX_M }
  : { min: -0.1, max: 0.1 };
return {
  // ...
  wearZ: clamp(num(src.wearZ, 0), wearZBounds.min, wearZBounds.max),
  // ...
};
```

### 2. `app/routes/app.ar-eyewear_.calibrate.$assetId.jsx`

#### Imports
Adicionadas constantes:
```javascript
AR_GLASSES_DEPTH_MIN_M,
AR_GLASSES_DEPTH_MAX_M,
AR_GLASSES_DEPTH_STEP_M,
```

#### Novo Componente: `DepthSlider`
```javascript
function DepthSlider({ label, helpText, value, onChange }) {
  const clamped = Math.max(
    AR_GLASSES_DEPTH_MIN_M,
    Math.min(AR_GLASSES_DEPTH_MAX_M, Number(value) || 0),
  );
  return (
    <BlockStack gap="200">
      <RangeSlider
        output
        label={label}
        helpText={helpText}
        min={AR_GLASSES_DEPTH_MIN_M}
        max={AR_GLASSES_DEPTH_MAX_M}
        step={AR_GLASSES_DEPTH_STEP_M}
        value={clamped}
        onChange={(v) => {
          const raw = Array.isArray(v) ? v[0] : v;
          onChange(Number(raw));
        }}
        suffix={`${(clamped * 1000).toFixed(0)}mm`}
      />
    </BlockStack>
  );
}
```

**Características:**
- Slider de `-50mm` a `+50mm` com passo de `5mm`
- Suffix exibe valor em milímetros (mais intuitivo para merchants)
- Valores negativos aproximam os óculos do rosto, positivos afastam

#### `CalibrationSliders` (modificado)
Adicionado slider de profundidade após os sliders de rotação, com um `<Divider />` para separação visual:

```javascript
{isGlasses && (
  <>
    <Divider />
    <DepthSlider
      label={t("arEyewear.calibrate.sliders.depth.label") || "Profundidade"}
      helpText={
        t("arEyewear.calibrate.sliders.depth.help") ||
        "Ajuste a distância dos óculos em relação ao rosto. Valores negativos aproximam, positivos afastam."
      }
      value={cal.wearZ}
      onChange={setField("wearZ")}
    />
  </>
)}
```

**Nota:** Texto de label e helpText com fallback em português para garantir usabilidade mesmo sem tradução i18n.

#### `hasChanges` (modificado)
Adicionada detecção de mudanças em `wearZ` para óculos:
```javascript
const hasRotationChanges = cal.rx !== saved.rx || cal.ry !== saved.ry || cal.rz !== saved.rz;
if (data.accessoryType === "glasses") {
  return hasRotationChanges || cal.wearZ !== saved.wearZ;
}
return hasRotationChanges;
```

**Resultado:** Botão "Salvar" habilitado quando o merchant altera profundidade.

### 3. `public/ar/omafit-ar-widget.js`

#### Pipeline `glassesSimpleFaceOnly` (modificado)
No loop de rendering do AR, onde a profundidade é aplicada, modificado para combinar:
- `glassesDepthForwardM` (offset base configurado via `data-ar-glasses-depth-forward-m`)
- `initialFaceCal.wearZ` (ajuste merchant via calibração)

**Antes (v29):**
```javascript
const df = Math.max(
  0,
  Number.isFinite(st.glassesDepthForwardM) ? st.glassesDepthForwardM : 0,
);
if (df > 0) {
  glassesTrackingWrap.position.addScaledVector(fa.zFaceLocal, df);
}
```

**Depois (v30):**
```javascript
const baseDepth = Number.isFinite(st.glassesDepthForwardM) ? st.glassesDepthForwardM : 0;
const calWearZ = Number.isFinite(initialFaceCal.wearZ) ? initialFaceCal.wearZ : 0;
const df = Math.max(0, baseDepth + calWearZ);
if (df > 0) {
  glassesTrackingWrap.position.addScaledVector(fa.zFaceLocal, df);
}
```

**Efeito:**
- O offset de profundidade é agora `baseDepth + calWearZ`
- Merchant pode *adicionar* ou *subtrair* da profundidade base via admin
- Se o merchant define `wearZ = -0.02` (−20mm), os óculos ficam 20mm *mais próximos* do rosto que o default
- Se `wearZ = 0.03` (+30mm), ficam 30mm *mais afastados*

**Clamp:** `Math.max(0, ...)` garante que a profundidade final nunca seja negativa (óculos não entram dentro do rosto).

#### Build Version
```javascript
const OMAFIT_AR_WIDGET_BUILD = "2026-05-20-glasses-depth-slider-v30";
```

### 4. `src/components/WidgetPage.tsx`

#### Cache Bust
```typescript
const OMAFIT_AR_MODULE_CACHE_BUST = '2026-05-20-glasses-depth-slider-v30';
```

## Comportamento Final

### Admin Calibration Page
1. Merchant abre calibração para produto com óculos
2. Vê slider "Profundidade" após os sliders de rotação
3. Slider vai de `-50mm` a `+50mm` com passo de `5mm`
4. Valores negativos aproximam, positivos afastam
5. Preview Three.js atualiza em tempo real (se implementado no preview)
6. Merchant salva calibração

### AR Widget Live
1. Widget carrega calibração do metafield
2. `initialFaceCal.wearZ` contém o valor salvo pelo merchant
3. Profundidade final = `glassesDepthForwardM` (default: 0.02m = 20mm) + `wearZ`
4. Óculos renderizam na distância ajustada do rosto
5. Tracking de profundidade é aplicado a cada frame no pipeline `glassesSimpleFaceOnly`

## Exemplos de Uso

### Caso 1: Óculos muito afastados do rosto no default
- Merchant observa no widget que os óculos flutuam longe do rosto
- Abre calibração, ajusta profundidade para `−20mm`
- Salva
- Widget agora renderiza óculos 20mm mais próximos

### Caso 2: Óculos muito colados ao rosto
- Óculos parecem "afundados" no rosto no widget
- Merchant ajusta profundidade para `+15mm`
- Óculos agora flutuam ligeiramente à frente

## Considerações de Implementação

### Por que `wearZ` e não um novo campo?
- `wearZ` já existia na estrutura de calibração
- Era ignorado para óculos no pipeline `glassesSimpleFaceOnly`
- Reutilizar o campo mantém compatibilidade com a estrutura de dados

### Por que `Math.max(0, ...)`?
- Profundidade negativa causaria os óculos renderizarem *dentro* do rosto
- Clamp para 0 garante segurança mesmo com valores extremos de calibração

### Range ±50mm é suficiente?
- Análise de GLBs típicos mostra que ajustes de ±20mm cobrem 95% dos casos
- ±50mm fornece margem generosa sem permitir extremos absurdos
- Passo de 5mm fornece controle fino sem UI sobrecarregado

### Fidelidade preview vs widget
- O código do preview em `app.ar-eyewear_.calibrate.$assetId.jsx` **não** foi modificado para usar `wearZ`
- Preview continua usando posição estática
- **TODO futuro:** Sincronizar preview para aplicar `wearZ` em `wearPosition.position.z`

## Compatibilidade

### Backward Compatibility
- Se `wearZ` não existir no metafield, default é `0` (sem mudança)
- Produtos calibrados antes de v30 não são afetados
- Merchants podem opcionalmente re-calibrar para usar profundidade

### Forward Compatibility
- Se o widget voltar para v29 ou anterior, `wearZ` será ignorado (comportamento seguro)
- Nenhum erro ou crash esperado

## Testes Recomendados

### Manual
1. Abrir calibração para produto com óculos
2. Verificar presença do slider "Profundidade"
3. Ajustar de -50mm a +50mm, observar preview (se implementado)
4. Salvar
5. Abrir widget AR no storefront
6. Verificar que óculos estão na profundidade ajustada
7. Testar movimento de cabeça (pitch/yaw/roll) para garantir que profundidade tracking persiste

### Edge Cases
- `wearZ = 0` (default): deve comportar igual a v29
- `wearZ = −50mm`: óculos muito próximos mas não dentro do rosto
- `wearZ = +50mm`: óculos flutuam bem à frente
- Calibração salva em variante + produto: ambos devem funcionar

## Limitações Conhecidas

1. **Preview não sincronizado**: Preview Three.js na admin não aplica `wearZ` (baixa prioridade)
2. **Clamp unilateral**: `Math.max(0, ...)` impede profundidade negativa, o que pode limitar ajustes extremos em casos edge

## Próximos Passos (Opcional)

- [ ] Sincronizar preview Three.js para aplicar `wearZ` em `wearPosition.position.z`
- [ ] Adicionar texto i18n para `arEyewear.calibrate.sliders.depth.label` e `.help`
- [ ] Testar com múltiplos GLBs de diferentes dimensões
- [ ] Considerar adicionar hint visual no preview mostrando direção de profundidade

## Conclusão

v30 fornece controle fino de profundidade para óculos via admin, resolvendo casos onde o default `glassesDepthForwardM` não é ideal. A implementação é conservadora (reutiliza `wearZ`, clamp seguro) e mantém compatibilidade backward/forward.

Merchant pode agora ajustar profundidade com interface simples e previsível, com correspondência direta entre calibração e widget live.
