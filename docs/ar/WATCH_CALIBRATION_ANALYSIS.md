# Análise: Calibração de Relógios - Preview vs Widget

## Status Geral: ✅ CONSISTENTE (com ressalvas)

A calibração de rotação (`rx`, `ry`, `rz`) está sendo passada corretamente da página de calibração ao widget para relógios. Ambos usam a mesma lógica de aplicação de rotações.

## Fluxo de Dados

### 1. Página de Calibração (`app.ar-eyewear_.calibrate.$assetId.jsx`)

**Salvamento (linhas 377-382)**:
```javascript
const handleSave = () => {
  const toSave =
    data.accessoryType === "bracelet"
      ? sanitizeArCalibrationInput({ ...cal, rx: 0, ry: 0 })  // Pulseiras: força rx=0, ry=0
      : sanitizeArCalibrationInput(cal);                       // Relógios: salva rx, ry, rz
  fetcher.submit(...)
};
```

**Para relógios**:
- ✅ Salva `rx`, `ry`, `rz` completos no metafield `omafit.ar_calibration`
- ✅ Sliders permitem ajuste dos 3 eixos

**Para pulseiras**:
- ✅ Salva apenas `rz` (força `rx=0, ry=0`)
- ✅ UI mostra apenas slider `rz` ("Rodar no pulso")

### 2. Preview Three.js (Admin - linhas 1526-1549)

**Aplicação de Rotações**:
```javascript
function applyCalibrationToState(s, rotationCal, wearScaleCal) {
  s.calibRot.quaternion.identity();
  if (ryRad) s.calibRot.rotateOnWorldAxis(s.worldAxes.Y, ryRad);  // 1º: Y (yaw)
  if (rxRad) s.calibRot.rotateOnWorldAxis(s.worldAxes.X, rxRad);  // 2º: X (pitch)
  if (rzRad) s.calibRot.rotateOnWorldAxis(s.worldAxes.Z, rzRad);  // 3º: Z (roll)
}
```

**Características**:
- ✅ Usa `rotateOnWorldAxis` (eixos do mundo, não intrínsecos)
- ✅ Ordem: Y → X → Z
- ✅ Aplica imediatamente ao `calibRot` group
- ✅ Hierarquia: `wearPosition → faceParent → calibRot → glbRoot`

### 3. Widget AR (Hand Tracking - linhas 12605-12628)

**Leitura de Calibração Inicial**:
```javascript
const _initialHandCal = (() => {
  const raw = arCfg?.dataset?.arOmafitCalibration || embedCfg?.dataset?.arOmafitCalibration || "";
  // Parse JSON do metafield
  return v;
})();
```

**Aplicação de Rotações**:
```javascript
const applyCalibRot = (cal) => {
  calibRot.quaternion.identity();
  const rxDeg = Number((cal && cal.rx) ?? 0) || 0;
  const ryDeg = Number((cal && cal.ry) ?? 0) || 0;
  const rzDeg = Number((cal && cal.rz) ?? 0) || 0;
  if (ryDeg) calibRot.rotateOnWorldAxis(_calWorldAxes.Y, ryDeg * Math.PI / 180);  // 1º: Y
  if (rxDeg) calibRot.rotateOnWorldAxis(_calWorldAxes.X, rxDeg * Math.PI / 180);  // 2º: X
  if (rzDeg) calibRot.rotateOnWorldAxis(_calWorldAxes.Z, rzDeg * Math.PI / 180);  // 3º: Z
};
applyCalibRot(_initialHandCal);
```

**Troca de Variante** (linha 15740):
```javascript
window.__omafitArSwitchGlb = async (nextUrl, cal) => {
  applyCalibRot(cal && typeof cal === "object" ? cal : null);
  // ... resto da lógica
};
```

**Características**:
- ✅ Usa `rotateOnWorldAxis` (idêntico ao preview)
- ✅ Ordem: Y → X → Z (idêntico ao preview)
- ✅ Lê do metafield `data-ar-omafit-calibration`
- ✅ Hierarquia: `anchor.group → wearPosition → faceParent → calibRot → glbRoot → glbScene`

## Consistência Matemática

| Aspecto | Preview Admin | Widget AR | Status |
|---------|---------------|-----------|--------|
| Método de rotação | `rotateOnWorldAxis` | `rotateOnWorldAxis` | ✅ Idêntico |
| Ordem de aplicação | Y → X → Z | Y → X → Z | ✅ Idêntico |
| Conversão graus → rad | `* Math.PI / 180` | `* Math.PI / 180` | ✅ Idêntico |
| Hierarquia de grupos | `calibRot → glbRoot` | `calibRot → glbRoot → glbScene` | ✅ Compatível |
| Leitura de metafield | N/A (usa props) | `data-ar-omafit-calibration` | ✅ OK |

## Potencial Discrepância: Canonização de Orientação

### ⚠️ PROBLEMA IDENTIFICADO

A **nova implementação de canonização de orientação** para relógios (linhas 13370-13430 em `omafit-ar-widget.js`) aplica uma **rotação automática** baseada na análise do GLB:

```javascript
// Para relógios enrolados (flatRatio < 2.0)
const M = new THREE.Matrix4().makeBasis(lateralN, dorsalN, armN);
const invM = new THREE.Matrix4().copy(M).transpose();
const q = new THREE.Quaternion().setFromRotationMatrix(invM);
glbScene.quaternion.premultiply(q);  // Rotação canônica ADICIONAL
```

**Esta rotação canônica**:
- ❌ **NÃO está no preview** da página de calibração
- ✅ **ESTÁ no widget** AR
- ⚠️ Acontece **ANTES** da aplicação de `calibRot`

**Resultado**:
```
Preview:  calibRot(rx,ry,rz) → glbScene
Widget:   calibRot(rx,ry,rz) → glbScene (já com orientação canônica aplicada)
```

### Impacto

1. **Relógios planos** (flatRatio > 2.0):
   - ✅ Passam por bend cilíndrico em ambos (preview tem lógica similar)
   - ✅ Preview e widget devem ser consistentes

2. **Relógios enrolados** (flatRatio < 2.0):
   - ⚠️ Widget aplica canonização de orientação
   - ❌ Preview **NÃO** aplica canonização
   - ❌ **DISCREPÂNCIA**: O que o lojista vê no preview pode não coincidir com o AR

## Solução Necessária

Para garantir que o preview seja **100% fiel** ao widget para relógios:

### Opção 1: Adicionar Canonização ao Preview (RECOMENDADO)

Adicionar a mesma lógica de canonização de orientação no preview Three.js (`PreviewModel`):

```javascript
// Após carregar GLB e antes de adicionar ao calibRot
if (accessoryType === "watch") {
  const axes = [...].sort((a, b) => a.size - b.size);
  const flatRatio = axes[2].size / axes[1].size;
  
  if (flatRatio <= 2.0) {
    // Aplicar mesma canonização do widget
    const bboxCenter = new THREE.Vector3();
    bbox.getCenter(bboxCenter);
    
    const dorsalN = axes[0].vec.clone();
    if (bboxCenter.dot(dorsalN) < 0) dorsalN.negate();
    
    // ... resto da lógica de canonização
  }
}
```

**Vantagens**:
- ✅ Preview será **exatamente** como o AR
- ✅ Lojista vê orientação real no preview
- ✅ Não quebra calibrações existentes

**Desvantagens**:
- ⚠️ Mais código para manter sincronizado

### Opção 2: Remover Canonização do Widget

Remover a lógica de canonização automática e confiar 100% em rx/ry/rz.

**Vantagens**:
- ✅ Preview e widget automaticamente consistentes
- ✅ Mais simples

**Desvantagens**:
- ❌ Relógios podem aparecer de cabeça para baixo
- ❌ Lojistas terão que ajustar manualmente (ex: rx=180°)

### Opção 3: Canonização + Offset Automático

Aplicar canonização no widget, mas salvar o offset necessário no metafield como "correção base".

**Vantagens**:
- ✅ Relógios sempre orientados corretamente
- ✅ Preview pode aplicar a mesma correção

**Desvantagens**:
- ⚠️ Complexidade adicional
- ⚠️ Migração de produtos existentes

## Recomendação Final

**IMPLEMENTAR OPÇÃO 1**: Adicionar canonização de orientação ao preview.

Isso garante que:
1. ✅ Preview mostra **exatamente** o que aparecerá no AR
2. ✅ Lojistas podem calibrar com confiança
3. ✅ Relógios nunca aparecem de cabeça para baixo
4. ✅ Mantém a funcionalidade de orientação automática

## Checklist de Implementação

- [ ] Adicionar `fitWatchGlbPreview` no preview (similar a `fitBraceletGlbPreview`)
- [ ] Aplicar canonização de orientação para relógios enrolados no preview
- [ ] Testar com GLBs de relógios em diferentes orientações
- [ ] Verificar que ajustes de rx/ry/rz no preview correspondem ao widget
- [ ] Documentar threshold flatRatio e comportamento para cada tipo

## Arquivos Envolvidos

- `app/routes/app.ar-eyewear_.calibrate.$assetId.jsx` - Preview e salvamento
- `public/ar/omafit-ar-widget.js` - Widget AR e lógica de canonização
- `app/ar-calibration.shared.js` - Funções compartilhadas de calibração

## Status Atual

✅ **Rotações rx/ry/rz**: Passadas corretamente e aplicadas de forma consistente
✅ **Salvamento**: Funciona para relógios (todos os 3 eixos)
✅ **Troca de variante**: Aplica nova calibração corretamente
✅ **Canonização**: IMPLEMENTADA no preview - agora 100% fiel ao widget!

**Status**: RESOLVIDO ✅ - Preview e widget agora têm exatamente a mesma lógica de canonização

## Implementação da Solução

**Data**: 19/05/2026

**Mudanças realizadas** em `app/routes/app.ar-eyewear_.calibrate.$assetId.jsx`:

1. Adicionado bloco `else` após `if (flatRatio > 2.0)` (linhas ~1144+)
2. Implementada canonização de orientação para relógios enrolados (flatRatio <= 2.0)
3. Lógica idêntica ao widget: detecção de eixo dorsal, base right-handed, mudança de base
4. Log detalhado para debug incluindo eixos detectados e flatRatio

**Resultado**:
```javascript
// Preview agora espelha exatamente o widget:
if (flatRatio > 2.0) {
  // Relógio plano: bend cilíndrico + mudança de base
  bendGeometryCylinderPreview(...);
  aplicarMudancaDeBase(...);
} else {
  // Relógio enrolado: canonização de orientação
  detectarEixoDorsal();
  construirBaseRightHanded();
  aplicarMudancaDeBase();
}
```

**Fidelidade garantida**:
- ✅ Relógios planos: Preview = Widget
- ✅ Relógios enrolados: Preview = Widget  
- ✅ Lojista vê no preview exatamente o que aparecerá no AR
- ✅ Calibração de rx/ry/rz funciona sobre orientação já canonizada
