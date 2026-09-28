# Canonização de Orientação para Relógios

## Visão Geral

Implementação de orientação previsível e fixa para relógios no widget AR, garantindo que modelos 3D apareçam sempre corretamente orientados (não de cabeça para baixo) independentemente da orientação original do arquivo GLB.

## Problema Resolvido

Relógios que já vinham "enrolados" no GLB (com correia curva, flatRatio < 2.0) não passavam por canonização de orientação, resultando em casos onde o relógio aparecia de cabeça para baixo no AR, mesmo quando a mão estava voltada para a câmera.

## Solução Implementada

### 1. Detecção de Relógios Enrolados

Relógios são classificados por seu `flatRatio` (razão entre dimensão máxima e mediana do bounding box):

- **flatRatio > 2.0**: Relógio plano (correia esticada) → passa por bend cilíndrico
- **flatRatio ≤ 2.0**: Relógio enrolado → **NOVO**: passa por canonização de orientação

### 2. Canonização de Orientação

Para relógios enrolados, aplicamos uma rotação que alinha consistentemente:

```
Eixo dorsal (MIN) → +Y local (para cima, face visível)
Eixo arm (MED)    → +Z local (direção do braço)  
Eixo lateral (MAX) → +X local (ao redor do pulso)
```

#### Lógica de Alinhamento

1. **Detecção do sentido dorsal**: Usa o centro do bounding box para determinar qual lado tem mais massa (tipicamente a face do relógio)
   ```javascript
   if (bboxCenter.dot(dorsalN) < 0) dorsalN.negate();
   ```

2. **Base ortonormal right-handed**: Garante que `lateral × dorsal = arm`
   ```javascript
   const expectedArm = crossVectors(lateralN, dorsalN);
   if (expectedArm.dot(armN) < 0) armN.negate();
   ```

3. **Rotação via mudança de base**: Constrói matriz que mapeia os eixos detectados para o frame da âncora
   ```javascript
   const M = makeBasis(lateralN, dorsalN, armN);
   const q = setFromRotationMatrix(M.transpose());
   glbScene.quaternion.premultiply(q);
   ```

## Arquitetura Preservada

### Pulseiras (Não Afetadas)

A implementação **não toca** na arquitetura de pulseiras, que continua usando:
- Rigid slot mode (forçado por padrão)
- Depth occluder otimizado
- Rotação pelo menor eixo bbox
- Duplo recentramento

### Relógios (Escala e Posição Fixas)

Os relógios já possuíam escala e posição fixas antes desta implementação:

- **Escala fixa**: Calculada por `targetInnerR / localInnerR`
  - `targetInnerR = OMAFIT_DEFAULT_WRIST_R_M + OMAFIT_WATCH_WRIST_GAP_M`
  - Gap de 1mm entre correia e pele
  
- **Posição fixa**: Ajuste vertical constante
  - `glbScene.position.y += OMAFIT_HAND_GLB_LOCAL_Y_BIND_M` (atualmente 0)

Esta implementação adiciona apenas a **orientação fixa**, completando o trio:
1. ✅ Escala fixa
2. ✅ Posição fixa  
3. ✅ Orientação fixa (novo)

## Benefícios

### Previsibilidade
Todos os relógios aparecem consistentemente orientados, independente da orientação do GLB de origem

### Facilidade de Calibração
Lojistas podem ajustar apenas a rotação na página de calibração, sem precisar compensar orientações aleatórias

### Compatibilidade
- Relógios planos (flatRatio > 2.0) continuam usando bend cilíndrico
- Relógios enrolados (flatRatio ≤ 2.0) agora têm orientação consistente
- Pulseiras mantêm arquitetura rigid slot intacta

## Constantes Relacionadas

```javascript
// Gap entre relógio e pulso (1mm)
const OMAFIT_WATCH_WRIST_GAP_M = 0.001;

// Offset vertical local (zero para relógios)
const OMAFIT_HAND_GLB_LOCAL_Y_BIND_M = 0;

// Ratio knuckles → pulso para relógios
const OMAFIT_WATCH_KNUCKLE_TO_WRIST_R = 0.325;

// Escala do occluder
const OMAFIT_HAND_OCCLUDER_RADIUS_SCALE = 0.93;
```

## Logging

A implementação adiciona log detalhado para debug:

```javascript
console.log("[omafit-ar] watch orientation canonicalized (already wrapped)", {
  lateralAxis: bend.name,
  dorsalAxis: dorsal.name,
  armAxis: arm.name,
  armFlipped: armN.dot(arm.vec) < 0,
  flatRatio: Number(flatRatio.toFixed(3)),
  preBbox: { max, mid, min },
  postBbox: { x, y, z }
});
```

## Arquivo Modificado

- `public/ar/omafit-ar-widget.js` - Função `fitWristGlb()` (linhas ~13370-13430)

## Testes Recomendados

1. Testar relógios com diferentes orientações de origem no GLB
2. Verificar que relógios aparecem sempre com a face voltada para cima
3. Confirmar que calibração de rotação (`rx/ry/rz`) funciona corretamente
4. Validar que pulseiras não foram afetadas
5. Verificar compatibilidade com diferentes formatos de GLB (Tripo, Blender, etc.)

## Próximos Passos

- Monitorar feedback de lojistas sobre orientação de relógios
- Ajustar thresholds se necessário (atualmente flatRatio threshold = 2.0)
- Considerar adicionar metafield override similar ao das pulseiras (`omafit.ar_watch_orientation_mode`)
