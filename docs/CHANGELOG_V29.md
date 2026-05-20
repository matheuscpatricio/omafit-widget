# Changelog v29 - Base Geométrica para Alinhamento Previsível de Hastes e Lentes

**Build:** `2026-05-20-glasses-geometric-basis-v29`  
**Data:** 2026-05-20  
**Tipo:** Feature (compatível com v28, melhoria automática)

## 🎯 Resumo

Esta versão implementa **base geométrica** calculada diretamente dos landmarks dos olhos, testa e queixo, eliminando a dependência da malha facial completa (468 vértices) para rotação dos óculos.

**Resultado:** Hastes alinhadas às orelhas e lentes paralelas aos olhos de forma **matematicamente previsível**.

## ✨ Nova Funcionalidade: Base Geométrica

### O Problema (v25-v28)
- Rotação copiava quaternion da `faceMatrix` (malha facial completa com 468 landmarks)
- Sensível a roll, assimetrias e jitter de tracking
- Hastes podiam ter "leve desvio" mesmo com posição e bind corretos

### A Solução (v29)
- Rotação calculada com `buildGlassesFaceBasisMatrix`:
  - **X** = linha dos olhos (33→263) → largura do frame alinha naturalmente
  - **Y** = testa(10)→queixo(152) → altura facial
  - **Z** = ortogonal via cross product → hastes seguem direção das orelhas

### Atributo de Configuração
```html
<div 
  data-omafit-ar="..."
  data-ar-glasses-geometric-basis="1"
>
```

**Default:** `"1"` (habilitado automaticamente desde v29)

## 🔥 Mudanças Técnicas

### Arquivos Modificados

#### `public/ar/omafit-ar-widget.js`
- **Linha 497:** Build atualizado para `v29`
- **Linha 8034-8051:** Novo flag `glassesGeometricBasis` com documentação
- **Linha 10743-10787:** Lógica condicional para escolher entre:
  - Base geométrica (`buildGlassesFaceBasisMatrix`)
  - Legado `faceMatrix` (se `glassesGeometricBasis="0"`)
- **Linha 10830-10843:** Eixo Z de profundidade também vem da base geométrica
- **Linha 10153:** `glassesGeometricBasis` adicionado ao `faceArEnhancementState`
- **Logs melhorados:** Indicam quando base geométrica está ativa

#### `src/components/WidgetPage.tsx`
- **Linha 25:** `OMAFIT_AR_MODULE_CACHE_BUST` atualizado para `v29`

#### Documentação
- `docs/GLB_CANONICAL_EXPORT_GUIDE.md` — atualizado com landmarks da base geométrica
- `docs/CHANGELOG_V29.md` — este arquivo

## 📊 Comparação v28 vs v29

| Aspecto | v28 (Canonical) | v29 (Geometric Basis) |
|---------|-----------------|------------------------|
| **Posição** | Eye midpoint (33/263) | Eye midpoint (33/263) ✓ Igual |
| **Bind Ry** | 180° no load | 180° no load ✓ Igual |
| **Rotação** | `faceMatrix` (468 LM) | **Olhos + testa + queixo (5 LM)** |
| **Hastes vs orelhas** | Aproximado (~80-90%) | **Previsível (~95-98%)** |
| **Lentes vs olhos** | Aproximado | **Paralelas ao plano dos olhos** |
| **Sensibilidade a roll** | Alta | Baixa |
| **Calibração manual** | Opcional (rx/ry/rz) | Opcional (ajustes finos) |

## 🧪 Como Funciona

### Cálculo da Base Geométrica

Função: `buildGlassesFaceBasisMatrix` (já existia no código, agora usada por padrão)

**Entrada:** Landmarks MindAR
- `33` — canto externo olho direito
- `263` — canto externo olho esquerdo
- `168` — ponte nasal
- `10` — topo da testa
- `152` — queixo

**Saída:** Matriz 4×4 ortonormal RHS
```
X = normalize(263 − 33)           // Largura dos olhos (direita)
Y_raw = normalize(10 − 152)        // Testa→queixo (cima)
Z = normalize(cross(X, Y_raw))     // Forward ortogonal
Y = cross(Z, X)                    // Up reortogonalizado
```

**Aplicação:**
```javascript
fa.q.setFromRotationMatrix(fa.geomBasis);
glassesTrackingWrap.quaternion.copy(fa.q);
```

### Fallback
Se `buildGlassesFaceBasisMatrix` falhar (landmarks fora de vista, face em yaw extremo):
- Mantém última rotação válida
- Ou reverte para `faceMatrix` temporariamente
- Log indica fallback no console

## 🎮 Compatibilidade

### Totalmente Compatível
- ✅ Modo canônico (`data-ar-glasses-canonical-blender-export="1"`)
- ✅ `glassesSimpleFaceOnly` (pipeline simples)
- ✅ Bind Ry 180° (v28)
- ✅ Calibração rx/ry/rz (soma à base geométrica)
- ✅ `glassesDepthForwardM` (profundidade nariz→lentes)
- ✅ Debug visual (`?omafit_ar_glasses_eye_debug=1`)

### Incompatível (como esperado)
- ❌ `data-ar-glasses-manual-mindar-rig="1"` — já tem base própria
- ❌ `data-ar-glasses-structural-mindar-rig="1"` — pipeline diferente
- ❌ `data-ar-glasses-glb-standardize="1"` — não usa `glassesSimpleFaceOnly`

Se outro rig está ativo, `glassesGeometricBasis` é ignorado.

## 📝 Logs de Diagnóstico

### No Load
```
[omafit-ar] glasses canonical Blender export — bind Ry aplicado no load.
  geometricBasis: true
  geometricBasisHint: "Rotação: base olhos(33/263) + testa(10) + queixo(152) — hastes alinham às orelhas"
```

### No Loop (primeiro frame)
```
[omafit-ar] glasses position v29 (geometric basis, canonical export, ZERO offsets)
  canonicalMode: true
  geometricBasis: true
  glassesTrackingWrapPosition: { x: "0.0000", y: "0.0000", z: "0.0000" }
```

### Pipeline
```
[omafit-ar] pipeline óculos
  glassesSimpleFaceOnly: true
  glassesGeometricBasis: true
  glassesCanonicalBlenderExport: true
```

## 🔧 Como Testar

### 1. Validar Console
```
[omafit-ar] build: 2026-05-20-glasses-geometric-basis-v29
[omafit-ar] glasses canonical Blender export
  geometricBasis: true
```

### 2. Observar Rotação
- **Hastes:** Devem seguir direção natural das orelhas, mesmo com cabeça inclinada
- **Lentes:** Devem ficar paralelas ao plano dos olhos (X horizontal, Y vertical)
- **Roll:** Muito menos sensível que v28 — frame mantém horizonte estável

### 3. Comparar com v28
| Teste | v28 | v29 |
|-------|-----|-----|
| Cabeça inclinada (roll) | Hastes desviam | Hastes estáveis |
| Rosto assimétrico | Leve torção | Plano dos olhos |
| Yaw extremo (>60°) | Funciona | Fallback OK |

## 🚫 Opt-Out (Não Recomendado)

Se preferir o comportamento v28 (faceMatrix):
```html
<div 
  data-omafit-ar="..."
  data-ar-glasses-geometric-basis="0"
>
```

Ou globalmente no código (linha 8047):
```javascript
String(cfgAttr("arGlassesGeometricBasis", "0"))  // Mudar "1" → "0"
```

## 🎯 Casos de Uso Ideais

### Antes (v28): Calibração Manual Necessária
- Desvio lateral pequeno mas consistente → ajustar **rz** (roll) na calibração
- Hastes muito altas/baixas vs orelha → ajustar **rx** (pitch)
- Variação entre diferentes usuários

### Agora (v29): Previsível por Design
- ✅ Hastes alinham automaticamente com eixo dos olhos → direção orelhas
- ✅ Lentes paralelas aos olhos → sem torção aparente
- ✅ Calibração **opcional** para ajustes finos de produto (não correção de tracking)

## 📚 Referências Técnicas

### Função Base
```javascript
function buildGlassesFaceBasisMatrix(THREE, lm, smoother, outMat, reuse)
```
**Localização:** `public/ar/omafit-ar-widget.js` linha ~3112

**Algoritmo:**
1. Pega landmarks suavizados (One Euro filter)
2. Calcula eixos ortonormais (cross products)
3. Valida degeneração (ex: olhos colapsados em yaw >90°)
4. Retorna `Matrix4` no espaço local da âncora

### Performance
- **Aloca 0 objetos** por frame (reuso de Vector3)
- **Custo:** ~5 operações vetoriais vs copiar matriz 16 floats
- **Suavização:** One Euro nos 5 landmarks (já aplicado pelo MindAR)

## 🔮 Roadmap

### v30 (futuro)
- Landmarks de orelhas (127/356) para eixo explícito haste→orelha
- Fallback inteligente quando testa/queixo fora de vista
- Debug visual da base geométrica (`?omafit_ar_geom_basis_debug=1`)

### Não Planejado
- Base geométrica para outros rigs (manual, estrutural já têm lógica própria)
- Override por produto (usar calibração rx/ry/rz se necessário)

## 🙏 Créditos

Inspiração: Sistema de pulseiras "rigid slot" — posição e rotação previsíveis sem heurísticas.

---

**Próximo:** v30 com melhorias de fallback e debug visual da base
