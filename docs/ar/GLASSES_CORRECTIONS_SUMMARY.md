# Correções do Widget AR para Óculos

## Resumo Executivo

Implementadas correções para resolver problemas de **escala gigante**, **posição fora do rosto**, **oclusão facial incorreta** e **calibração ignorada** para óculos no widget AR Omafit.

## Problemas Identificados

### 1. Escala Gigante
**Causa:** A fórmula de escala IPD (`ipdMetric * ipdMul`) não normalizava pela largura intrínseca do GLB, levando a óculos exageradamente grandes quando o modelo tinha bounding box grande (ex: `glbMaxDim: 1.262`).

**Exemplo do problema:**
- IPD medido: ~0.065m
- Multiplicador: 1.5
- Escala resultante: 0.065 * 1.5 = 0.0975
- Para um GLB com largura 1.26m: óculos ficavam ~12x maiores que o esperado
- Clamp máximo de 22 permitia tamanhos absurdos

### 2. Posição Fora do Rosto
**Causa:** O flag `glassesEyeMidpointAlign` era explicitamente desabilitado quando `glassesSimpleFaceOnly` era true (L8963), forçando alinhamento ao ponto genérico da face mesh (landmark 168) ao invés do ponto médio entre os olhos.

### 3. Oclusão Cortando os Óculos
**Causa:** O `faceOccluderMesh` e `templeOccL/R` estavam ativos por padrão. Com escala e posição incorretas, a malha de oclusão cortava os óculos de forma visível.

### 4. Calibração Ignorada
**Causa:** O `calibRot` para face path era forçado a `identity()` (L9379), ignorando completamente os valores `rx/ry/rz` configurados pelo lojista na página de calibração.

## Correções Implementadas

### 1. Normalização da Escala por Largura do Frame
**Arquivo:** `public/ar/omafit-ar-widget.js`

**Mudanças:**
- **L8746-8755:** Introduzida variável `glassesFrameWidthLocal` que captura a largura do GLB após bake/bind (`sz.x`).
- **L9922:** Adicionada `glassesFrameWidthLocal` ao estado `st` para ser acessível no loop `onUpdate`.
- **L10679:** Fórmula de escala alterada de:
  ```javascript
  let scale = ipdMetric * ipdMul;
  ```
  Para:
  ```javascript
  let scale = (ipdMetric * ipdMul) / st.glassesFrameWidthLocal;
  ```
- **L873:** Limite máximo reduzido de `22` para `2.5` para prevenir escalas absurdas.

**Resultado:** Óculos agora têm escala proporcional ao IPD do usuário, independente do tamanho do GLB.

### 2. Habilitação do Alinhamento ao Ponto Médio dos Olhos
**Arquivo:** `public/ar/omafit-ar-widget.js`

**Mudanças:**
- **L8961-8968:** Removida condição `!glassesSimpleFaceOnly &&` que desabilitava o alinhamento.
- Condição alterada de:
  ```javascript
  const glassesEyeMidpointAlign =
    accessoryType === "glasses" &&
    !glassesSimpleFaceOnly &&  // ❌ Esta linha foi removida
    !glassesManualMindarRig &&
    ...
  ```
  Para:
  ```javascript
  const glassesEyeMidpointAlign =
    accessoryType === "glasses" &&
    !glassesManualMindarRig &&
    ...
  ```

**Resultado:** Óculos agora se alinham precisamente ao ponto médio entre os olhos, independente do modo.

### 3. Aplicação da Calibração de Loja (rx/ry/rz)
**Arquivo:** `public/ar/omafit-ar-widget.js`

**Mudanças:**
- **L12604-12623:** Refatorada função `applyCalibRot` em `_applyThreeGroupCalibRot` genérica que aceita qualquer grupo Three.js.
- **L9395-9401:** Adicionada aplicação condicional da calibração para óculos:
  ```javascript
  if (accessoryType === "glasses" && _initialHandCal) {
    _applyThreeGroupCalibRot(calibRot, _initialHandCal);
    calibRot.updateMatrix();
    calibRot.updateMatrixWorld(true);
  }
  ```
- **L11502-11511:** Integrada aplicação da calibração em `window.__omafitArSwitchGlb` para troca dinâmica de variantes.
- **L11344-11368:** Atualizado log de diagnóstico para refletir que a calibração agora é aplicada para óculos.

**Resultado:** Valores `rx/ry/rz` configurados na página de calibração agora são respeitados no widget para óculos, assim como já funcionava para pulseiras e relógios.

### 4. Desabilitação Temporária da Oclusão Facial
**Arquivo:** `public/ar/omafit-ar-widget.js`

**Mudanças:**
- **L524:** Flag `OMAFIT_GLASSES_FACE_OCCLUSION_DEBUG_OFF` alterada de `false` para `true`.

**Resultado:** Oclusão facial desabilitada temporariamente para diagnóstico. Após validação de escala/posição/orientação, pode ser reativada.

## Fluxo de Dados Corrigido

### Página de Calibração → Metafield
1. Lojista ajusta `rx`, `ry`, `rz` na página `app.ar-eyewear_.calibrate.$assetId`
2. Valores salvos no metafield `omafit.ar_calibration`

### Metafield → Widget AR
1. Widget carrega metafield via `data-ar-omafit-calibration`
2. Valores parseados em `_initialHandCal`
3. **NOVO:** Para óculos, `_applyThreeGroupCalibRot(calibRot, _initialHandCal)` é chamado
4. Rotação aplicada usando `rotateOnWorldAxis` (Y→X→Z) para consistência

### Widget → Rendering
1. `calibRot` com quaternion correto composto na hierarquia
2. `glassesTrackingWrap` recebe pose da face mesh
3. `glassesPivot` aplica offsets locais
4. Mesh do GLB com escala normalizada por IPD e largura do frame
5. Posição alinhada ao ponto médio dos olhos

## Logs de Diagnóstico

Os seguintes logs foram atualizados para facilitar debugging:

### L9347 - Face scale resolved
```javascript
console.log("[omafit-ar] face scale resolved", {
  glbMaxDim: maxDim,
  accessoryMeshNormalizeScale,
  glassesSimpleFaceOnly,
  // ... (mantido como estava)
});
```

### L11349 - calibRot
```javascript
console.log("[omafit-ar] calibRot para óculos (calibração de loja aplicada)", {
  glassesSimpleFaceOnly,
  wearPosM: wearPosMEffective,
  accessoryMeshNormalizeScale,
  glassesFrameWidthLocal,  // ✨ NOVO
  glassesScaleIpdMul,
  glassesScaleIpdMetricMul,
  calibrationApplied: calApplied ? { rx, ry, rz } : "none",  // ✨ NOVO
  calibRotXinWorld: [...],
  calibRotYinWorld: [...],
  calibRotZinWorld: [...],
  calSource: arCfg?.dataset?.arOmafitCalSource || "unknown",
});
```

## Arquivos Modificados

- `public/ar/omafit-ar-widget.js` (6 seções alteradas)

## Próximos Passos Recomendados

1. ✅ **Testar com múltiplos GLBs de óculos** com diferentes dimensões de bounding box
2. ✅ **Validar alinhamento** ao ponto médio dos olhos em diferentes ângulos de face
3. ✅ **Verificar calibração** ajustando rx/ry/rz na página de admin
4. ⏳ **Reativar oclusão facial** (`OMAFIT_GLASSES_FACE_OCCLUSION_DEBUG_OFF = false`) após confirmar que escala/posição estão corretas
5. ⏳ **Ajustar parâmetros de clamp** se necessário (atualmente `0.04` a `2.5`)

## Compatibilidade

- ✅ **Pulseiras:** Arquitetura não foi tocada (usa hand path)
- ✅ **Relógios:** Arquitetura não foi tocada (usa hand path)
- ✅ **Óculos (modos avançados):** `glassesManualMindarRig`, `glassesStructuralMindarRig`, etc. mantidos intactos
- ✅ **Óculos (modo simples):** Todas as correções aplicam-se principalmente a `glassesSimpleFaceOnly`

## Notas Técnicas

### Por que normalizar pela largura do frame?
Um GLB de óculos com largura de 1.26m no espaço 3D precisa de uma escala de ~0.05 para atingir ~6.3cm (largura típica de frame real). Se aplicarmos diretamente `ipdMetric * 1.5` sem normalização, obtemos escalas inadequadas.

### Por que remover !glassesSimpleFaceOnly da condição?
O modo `glassesSimpleFaceOnly` é o pipeline padrão para a maioria dos óculos. Desabilitar `glassesEyeMidpointAlign` nesse modo causava alinhamento ao landmark 168 (genérico) ao invés do ponto médio anatômico dos olhos.

### Por que aplicar calibração ao face path?
Anteriormente, apenas hand path (pulseiras/relógios) aplicava `rx/ry/rz`. Para óculos, isso causava inconsistência: o lojista ajustava a rotação no admin mas não via efeito no widget.

---

**Data da Implementação:** 2026-05-19  
**Versão do Build:** `2026-05-19-glasses-corrections-v1`
