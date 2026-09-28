# Posicionamento Totalmente Previsível - v22

## O que mudou de v21 → v22

### ❌ v21 (AINDA tinha offsets empíricos)
```javascript
glassesEmpiricalAlignM: "0 -0.01 -0.005"  // ainda tinha deslocamento
glassesNoseAlignOffsetXM: 0                // zero mas outro offset existia
glasses.position.set(modelCenter + nose + empirical)  // 3 offsets somados
```

### ✅ v22 (ZERO offsets - 100% previsível)
```javascript
glassesEmpiricalAlignM: "0 0 0"           // ZERO
glassesNoseAlignOffsetXM: 0               // ZERO  
glassesModelCenterOffsetM: "0 0 0"        // ZERO
glasses.position.set(0, 0, 0)             // ZERO — posição pura do tracking wrap
```

**Resultado:** Os óculos ficam EXATAMENTE no ponto médio dos olhos (landmarks 33 e 263), sem qualquer desvio lateral ou vertical.

## Como Funciona (v22)

```
Face Tracking (MindAR)
  ↓
Landmarks dos olhos:
  - Direito: landmark 33
  - Esquerdo: landmark 263
  ↓
Ponto médio = (olho_direito + olho_esquerdo) / 2
  ↓
glassesTrackingWrap.position = ponto médio
  ↓
+ glassesDepthForwardM (default 0.02m = 2cm para frente)
  ↓
glasses.position = (0, 0, 0) LOCAL
  ↓
RESULTADO: Óculos centrados nos olhos
```

## Debug Visual (NOVO em v22)

Adicione `?omafit_ar_glasses_eye_debug=1` na URL do produto:

```
https://sua-loja.myshopify.com/products/seu-produto?omafit_ar_glasses_eye_debug=1
```

Verá:
- 🔴 **Esferas vermelhas:** Landmarks dos olhos (33 e 263)
- 🟢 **Esfera verde:** Centro calculado (onde os óculos devem estar)

Se a esfera verde NÃO estiver entre as vermelhas → problema no tracking MindAR.
Se a esfera verde está correta mas os óculos desviados → problema no GLB ou bind.

## Verificação Pós-Deploy

### 1. Console do Browser
```
[omafit-ar] build: 2026-05-20-glasses-eye-center-v22
[omafit-ar] glasses position v22 (ZERO offsets, eye-center aligned)
{
  glassesTrackingWrapPosition: {x, y, z},
  glassesLocalPosition: {x: "0.0000", y: "0.0000", z: "0.0000"},
  eyeLandmarks: {right: 33, left: 263},
  hint: "v22: Alinhamento direto ao ponto médio dos olhos. Debug: ?omafit_ar_glasses_eye_debug=1"
}
```

### 2. Verificação Visual
- [ ] Óculos centrados horizontalmente (não desviados para esquerda/direita)
- [ ] Óculos alinhados verticalmente com os olhos
- [ ] Profundidade adequada (lentes ~2cm do rosto)
- [ ] Com `?omafit_ar_glasses_eye_debug=1`: verde entre as vermelhas

## Se AINDA Houver Desvio

### Caso 1: Debug mostra verde centrada, mas óculos desviados
**Causa:** O GLB não está centrado na origem (0,0,0).

**Solução:** O centro do GLB precisa estar no ponto médio entre as lentes:
```blender
# No Blender, antes de exportar:
1. Selecionar o objeto
2. Object → Set Origin → Origin to Geometry
3. Mover o objeto para que o centro fique ENTRE as lentes
4. Apply All Transforms (Ctrl+A)
5. Exportar como GLB
```

### Caso 2: Óculos muito largos ou estreitos
**Causa:** Escala automática via IPD (`IPD × 1.5 / frameWidth`).

**Solução:** A largura do GLB em metros deve corresponder à armação real:
- Armação 140mm → GLB deve ter ~0.14m de largura no eixo X
- Se estiver em cm ou outras unidades → reconverter

### Caso 3: Óculos "flutuando" ou "afundados"
**Causa:** Profundidade (Z) ou altura (Y) do centro do GLB.

**Ajuste fino via data-attribute:**
```html
<!-- Óculos muito perto do rosto -->
<div id="omafit-ar-root"
  data-ar-glasses-depth-forward-m="0.03">

<!-- Óculos muito longe do rosto -->
<div id="omafit-ar-root"
  data-ar-glasses-depth-forward-m="0.01">

<!-- Óculos muito acima/abaixo (GLB mal centrado em Y) -->
<div id="omafit-ar-root"
  data-ar-glasses-empirical-align-m="0 -0.015 0">
  <!--                            x   y     z  -->
```

### Caso 4: Desvio lateral persistente
**Se mesmo com v22 houver desvio SEMPRE para o mesmo lado:**

1. **Confirme com debug:** `?omafit_ar_glasses_eye_debug=1`
   - Verde centrada + óculos desviados = problema do GLB
   - Verde desviada = problema do tracking (muito raro)

2. **Verifique a origem do GLB no Blender:**
   ```
   - Abra o GLB no Blender
   - Selecione o objeto
   - N → Transform → Location deve ser (0, 0, 0)
   - Se não for, mova o objeto e Apply Transform
   ```

3. **Se o GLB estiver correto mas desvio persistir:**
   ```html
   <!-- Override manual (último recurso) -->
   <div id="omafit-ar-root"
     data-ar-glasses-empirical-align-m="-0.02 0 0">
     <!-- x: negativo = mover para esquerda -->
     <!-- x: positivo = mover para direita -->
   ```

## Próximos Passos

Após deploy v22:

1. **Teste sem debug:** Verifique o posicionamento base
2. **Teste com debug:** `?omafit_ar_glasses_eye_debug=1` → confirme verde centrada
3. **Reporte resultado:**
   - ✅ "Centrado perfeitamente"
   - ⚠️ "X cm para [esquerda/direita/cima/baixo/frente/trás]"
   - ❌ "Verde desviada" (indica problema no tracking)

## Diferença vs Versões Anteriores

| Versão | Offsets | Alinhamento | Previsibilidade |
|--------|---------|-------------|-----------------|
| v20 | Múltiplos empíricos | Aproximado | ⚠️ Baixa |
| v21 | Reduzidos | Melhorado | ⚠️ Média |
| **v22** | **ZERO** | **Ponto médio olhos** | ✅ **Alta** |

## Arquitetura v22

```
anchor.group (MindAR face tracking)
  └─ wearPosition (sempre 0,0,0 em v22)
      └─ faceParent
          └─ calibRot (rx/ry/rz do admin)
              └─ glassesStaticBindWrap (Ry 180°)
                  └─ glassesTrackingWrap
                      position = (eyeR + eyeL) / 2 + depth*forward
                      quaternion = face quaternion
                      └─ glassesStaticBindWrap (bind orientation)
                          └─ glasses (GLB)
                              position = (0, 0, 0) ← ZERO offsets v22
                              scale = IPD × 1.5 / frameWidth
```

## Garantias Matemáticas (v22)

1. **Posição horizontal (X):** EXATAMENTE entre landmarks 33 e 263
2. **Posição vertical (Y):** EXATAMENTE na altura média dos olhos
3. **Profundidade (Z):** Ponto médio + `glassesDepthForwardM` ao longo do vetor +Z da face
4. **Sem offsets empíricos:** Nenhuma "magia" ou ajuste escondido

Se houver desvio, a causa é **objetiva** e pode ser corrigida de forma **determinística**:
- GLB mal centrado → recentrar no Blender
- Escala errada → ajustar unidades do GLB
- Bind incorreto → já fixo em Ry 180° (v22)

Build: `2026-05-20-glasses-eye-center-v22`
