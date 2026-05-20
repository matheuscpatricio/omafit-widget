# Teste de Posicionamento dos Óculos - v21

## Mudanças Implementadas

### 1. Offsets Empíricos Reduzidos (Widget)
**Antes (v20):**
- `glassesEmpiricalAlignM`: `"-0.035 -0.04 0.02"` (3.5cm esquerda, 4cm abaixo, 2cm frente)
- `glassesDepthForwardM`: `0.025` (2.5cm para frente)
- `glassesNoseAlignOffsetXM`: `-0.03` (3cm esquerda)

**Agora (v21):**
- `glassesEmpiricalAlignM`: `"0 -0.01 -0.005"` (centrado horizontalmente, 1cm abaixo, 0.5cm atrás)
- `glassesDepthForwardM`: `0.015` (1.5cm para frente)
- `glassesNoseAlignOffsetXM`: `0` (centrado)

### 2. Preview Admin Alinhado ao Widget
- **Removido:** Contentor Tripo (`computeGlassesCanonicalOffsetQuat`)
- **Adicionado:** Bind simples `Ry 180°` (mesma lógica que `glassesSimpleFaceOnly`)
- **Resultado:** O que o lojista vê no admin é EXATAMENTE o que o cliente vê no AR

### 3. Logs de Diagnóstico
No console do browser, verá:
```
[omafit-ar] glasses position offsets v21
{
  glassesModelCenterOffsetM: {x, y, z},
  glassesNoseAlignOffsetXM: 0,
  glassesEmpiricalAlignM: {x: 0, y: -0.01, z: -0.005},
  glassesDepthForwardM: 0.015,
  finalPosition: {x, y, z},
  hint: "Ajustar via data-ar-glasses-empirical-align-m='x y z' (metros)"
}
```

## Checklist de Teste

### No Console (após deploy v21)
- [ ] `[omafit-ar] build: 2026-05-19-glasses-position-fix-v21`
- [ ] `[omafit-ar] pipeline óculos` → `glassesSimpleFaceOnly: true`
- [ ] `[omafit-ar] glasses position offsets v21` → offsets reduzidos
- [ ] `[omafit-ar] calibRot (óculos; calibração loja)` → rotação aplicada
- [ ] `[omafit-ar] glasses MindAR bind fix fallback Ry (°)` → `ry: 180`

### Teste Visual (Widget AR)
1. **Posição vertical:** Óculos devem estar alinhados com os olhos (não muito acima/abaixo)
2. **Posição horizontal:** Óculos centrados no rosto (não deslocados lateralmente)
3. **Profundidade:** Lentes próximas ao rosto, mas não "coladas" (1-2cm de espaço)
4. **Rotação:** Calibração `rx/ry/rz` do admin deve corresponder ao AR

### Teste Visual (Preview Admin)
1. **Bind:** Após calibrar no admin, os óculos devem estar na mesma orientação base que no AR
2. **Rotação:** Sliders `rx/ry/rz` devem mover os óculos igual ao AR
3. **Sem Tripo:** Não deve haver "salto" de orientação entre admin e widget

## Ajustes Finos (se necessário)

### Se os óculos estiverem MUITO PRÓXIMOS do rosto:
```html
<div id="omafit-ar-root"
  data-ar-glasses-depth-forward-m="0.025"
  data-ar-glasses-empirical-align-m="0 -0.01 0.01">
```

### Se os óculos estiverem MUITO LONGE do rosto:
```html
<div id="omafit-ar-root"
  data-ar-glasses-depth-forward-m="0.005"
  data-ar-glasses-empirical-align-m="0 -0.01 -0.015">
```

### Se os óculos estiverem DESLOCADOS LATERALMENTE:
```html
<div id="omafit-ar-root"
  data-ar-glasses-nose-align-offset-x-m="-0.02"
  data-ar-glasses-empirical-align-m="-0.02 -0.01 -0.005">
```
(valores negativos = mover para esquerda; positivos = direita)

### Se os óculos estiverem MUITO ACIMA/ABAIXO:
```html
<div id="omafit-ar-root"
  data-ar-glasses-empirical-align-m="0 -0.02 -0.005">
```
(y negativo = descer; y positivo = subir)

## Sistema de Coordenadas

```
       +Y (cima)
        |
        |
        |________ +X (direita)
       /
      /
    +Z (para frente, lentes → câmara)
```

- **glassesEmpiricalAlignM** (x, y, z) em metros:
  - `x`: lateral (+ direita, - esquerda)
  - `y`: vertical (+ cima, - baixo)
  - `z`: profundidade (+ frente, - atrás)

- **glassesDepthForwardM**: sempre positivo (deslocamento ao longo +Z da face)

## Casos de Uso Comuns

### Armação larga (>145mm)
Pode precisar de mais profundidade para não "entrar" no rosto:
```html
data-ar-glasses-depth-forward-m="0.025"
data-ar-glasses-empirical-align-m="0 -0.01 0.005"
```

### Armação estreita (<130mm)
Pode precisar de menos profundidade:
```html
data-ar-glasses-depth-forward-m="0.010"
data-ar-glasses-empirical-align-m="0 -0.01 -0.010"
```

### GLB com centro deslocado
Se o GLB não foi centrado corretamente no export:
```html
data-ar-glasses-model-center-offset-m="0.02 0.01 0"
```

## Próximos Passos

Se após o deploy v21 os óculos ainda não estiverem bem posicionados:

1. **Copie os logs do console** (`glasses position offsets v21`)
2. **Tire screenshot** do rosto com óculos
3. **Indique:** "óculos X cm muito [acima/abaixo/esquerda/direita/frente/trás]"
4. Ajustarei os offsets específicos para o vosso GLB

## Notas Técnicas

- **v21 usa `glassesSimpleFaceOnly: true`** (pipeline mínimo, previsível)
- **Bind fixo `Ry 180°`** para todos os GLBs (sem PCA/heurísticas)
- **Escala automática** via `IPD × 1.5 / frameWidth` (não afetada por offsets)
- **Calibração de rotação** (`rx/ry/rz`) aplicada em `calibRot` com eixos de mundo

Build: `2026-05-19-glasses-position-fix-v21`
