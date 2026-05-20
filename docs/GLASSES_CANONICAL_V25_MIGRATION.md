# Migração para Modo Canônico v25 (Óculos)

## Resumo das Mudanças

A partir do **build v25** (`2026-05-20-glasses-canonical-v25`), o widget AR Omafit passa a usar **Export Canônico** como padrão para óculos.

### Antes (v24 e anteriores)
```javascript
// Default: auto-detecção de centro e bind
data-ar-glasses-canonical-blender-export="0"
```

**Comportamento:**
- Widget detectava automaticamente centro entre lentes
- Aplicava heurísticas Tripo/PCA para bind
- Recentrava GLB após rotação
- Usava offsets empíricos (`glassesEmpiricalAlignM`, `glassesNoseAlignOffsetXM`, etc)

**Problemas:**
- Comportamento imprevisível com geometria assimétrica
- Divergência entre preview admin e widget AR
- Offsets empíricos funcionavam para alguns GLBs mas não outros
- Desvios laterais (esquerda/direita) difíceis de corrigir

### Agora (v25+)
```javascript
// Default: modo canônico
data-ar-glasses-canonical-blender-export="1"
```

**Comportamento:**
- Widget **confia** no origin e orientação do GLB exportado do Blender
- Aplica apenas bind Ry 180° fixo (conversão −Z Blender → +Z MindAR)
- Calcula largura do frame diretamente da bbox canônica
- **ZERO offsets empíricos** — alinhamento puro ao ponto médio dos olhos
- Respeita calibração rx/ry/rz do merchant sem interferências

**Benefícios:**
- ✅ Posicionamento 100% previsível
- ✅ Comportamento idêntico entre preview e AR
- ✅ Similar ao "rigid slot" das pulseiras
- ✅ Sem "magia" ou heurísticas que podem falhar

## Como Preparar GLBs para v25

Todos os GLBs de óculos devem seguir o **Contrato de Export Canônico**:

1. **Origin na ponte do nariz** (bridge, entre as lentes)
2. **Frente das lentes = −Z** (eixo Z negativo)
3. **+X = largura**, **+Y = altura**
4. **Apply All Transforms** no Blender antes de exportar
5. **Dimensões em metros reais** (ex: 0.14m para frame de 14cm)

Ver [GLB_CANONICAL_EXPORT_GUIDE.md](./GLB_CANONICAL_EXPORT_GUIDE.md) para detalhes completos.

## Impacto em GLBs Existentes

### Caso 1: GLBs já seguiam o contrato (origem correta)
**Impacto:** ✅ **Nenhum** — Vai funcionar perfeitamente com v25.

### Caso 2: GLBs usavam auto-detecção e funcionavam bem
**Impacto:** ⚠️ **Possível desalinhamento** se origin não estiver na ponte.

**Solução:**
1. Teste o GLB com v25
2. Se desalinhar, ajuste o origin no Blender conforme guia
3. Re-exporte e re-upload

### Caso 3: GLBs usavam offsets empíricos para compensar origin incorreto
**Impacto:** ⚠️ **Vai desalinhar** — v25 ignora offsets empíricos.

**Solução:**
1. Corrija o origin no Blender (ponte do nariz)
2. Apply All Transforms
3. Re-exporte seguindo o contrato canônico
4. Remova configurações de offsets empíricos no admin (se houver)

## Como Testar a Migração

### Passo 1: Verificar Build
No console do browser (sessão AR):
```
[omafit-ar] build: 2026-05-20-glasses-canonical-v25 (netlify-iframe)
```

### Passo 2: Verificar Modo Canônico
No mesmo log, procure:
```
[omafit-ar] glasses canonical Blender export — sem bind automático / Tripo.
  bbox: { x: 0.14, y: 0.05, z: 0.04 }
```

Ou no log de posicionamento:
```
[omafit-ar] glasses position v25 (canonical export, ZERO offsets, eye-center aligned)
  canonicalMode: true
```

### Passo 3: Validar Posicionamento
1. Abra o AR widget no celular ou desktop
2. Óculos devem aparecer **exatamente** no ponto médio dos olhos
3. **Sem desvios** para esquerda/direita
4. Rotação calibrada (rx/ry/rz) deve funcionar perfeitamente no admin

### Passo 4: Comparar Preview vs AR
1. Abra a página de calibração no admin
2. O preview 3D deve mostrar o óculos **centralizado, rotação zero**
3. Abra o AR widget
4. O óculos no AR deve estar **idêntico** ao preview (exceto escala dinâmica IPD)

## Rollback para Modo Legado (Não Recomendado)

Se você encontrar problemas e não puder corrigir o GLB imediatamente, pode desabilitar temporariamente o modo canônico:

### Opção 1: Via Atributo HTML (por produto)
```html
<div 
  data-omafit-ar="..."
  data-ar-glasses-canonical-blender-export="0"
>
```

### Opção 2: Via Código (global)
Em `public/ar/omafit-ar-widget.js`, linha ~7977:
```javascript
// Mudar de "1" para "0"
String(cfgAttr("arGlassesCanonicalBlenderExport", "0"))
```

⚠️ **Atenção:** Modo legado será descontinuado em versões futuras. Use apenas temporariamente enquanto corrige os GLBs.

## Cronograma de Depreciação

| Versão | Status | Notas |
|--------|--------|-------|
| v25 | **Canônico por padrão** | Modo legado disponível via opt-out |
| v26 | Aviso de depreciação | Console warning se modo legado for usado |
| v27 | Remoção do modo legado | Apenas canônico será suportado |

## Troubleshooting

### "Óculos deslocados para esquerda após v25"
**Causa:** Origin do GLB não está na ponte do nariz  
**Solução:** Ajuste origin no Blender, re-exporte

### "Óculos muito à frente/atrás"
**Causa:** Frente das lentes não é −Z  
**Solução:** Rotacione objeto para −Z, Apply Transforms, re-exporte

### "Óculos virado de cabeça para baixo"
**Causa:** +Y não aponta para cima  
**Solução:** Corrija orientação Y, Apply Transforms, re-exporte

### "Preview admin OK mas AR errado"
**Causa:** Preview e widget estavam desalinhados (bug corrigido em v21)  
**Solução:** Atualize para v25, ambos agora usam mesmo pipeline

### "Console mostra 'canonicalMode: false'"
**Causa:** Flag não está ativo (possível override em HTML)  
**Solução:** Remova `data-ar-glasses-canonical-blender-export="0"` do HTML

## Recursos

- [Guia Completo de Export Canônico](./GLB_CANONICAL_EXPORT_GUIDE.md)
- [Changelog v25](./CHANGELOG.md#v25)
- Suporte técnico: suporte@omafit.com

## Benefícios Técnicos

### Para Desenvolvedores
- Código mais simples e previsível
- Menos flags de configuração
- Debugging mais fácil (sem offsets mágicos)
- Consistência com sistema de pulseiras

### Para Artistas 3D
- Regras claras e documentadas
- Controle total sobre posicionamento
- Feedback imediato (preview = AR)
- Workflow padrão da indústria (origin bem definido)

### Para Merchants
- Experiência AR mais estável
- Menos calibração manual necessária
- Posicionamento previsível entre diferentes óculos
- Melhor qualidade visual geral

---

**Data de Release:** 2026-05-20  
**Build:** v25 (2026-05-20-glasses-canonical-v25)  
**Breaking Change:** Sim (opt-out disponível temporariamente)
