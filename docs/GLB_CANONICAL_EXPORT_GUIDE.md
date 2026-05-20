# Guia de Export Canônico para GLBs de Óculos

## Visão Geral

Desde a versão v25 do widget AR Omafit, o modo **Export Canônico** é o padrão para óculos. Este modo elimina todas as heurísticas de auto-detecção e recentragem, proporcionando posicionamento totalmente previsível e estável.

## Por que usar Export Canônico?

### Problema com Auto-Detecção
Antes do v25, o widget tentava detectar automaticamente:
- O centro entre as lentes
- A orientação da frente das lentes
- A largura do frame
- Offsets empíricos para compensar variações

Isso funcionava na maioria dos casos, mas gerava comportamento imprevisível quando:
- O GLB tinha geometria assimétrica
- A origem não estava onde o widget esperava
- Havia artefatos de exportação (rotações aplicadas mas não "bakadas")

### Solução: Contrato de Export
O export canônico define **regras claras** que o artista 3D segue no Blender (ou outro DCC), e o widget **confia** que essas regras foram seguidas. Resultado:
- ✅ Posicionamento previsível em 100% dos casos
- ✅ Sem "magia" ou heurísticas que podem falhar
- ✅ Comportamento idêntico entre diferentes GLBs que seguem o contrato
- ✅ Similar ao sistema de pulseiras "rigid slot" (posição fixa e previsível)

## Contrato de Export Canônico

### 1. **Origin (Ponto de Origem)**
- Posicione o **3D Cursor** exatamente na **ponte do nariz** (bridge), no ponto médio entre as duas lentes.
- Selecione o objeto → Right-click → **Set Origin → Origin to 3D Cursor**

**Por quê?** O widget alinha o origin do GLB com o ponto médio entre os landmarks dos olhos (pontos 33 e 263 do MindAR).

### 2. **Orientação dos Eixos**
Seguindo a convenção do Blender:
- **+X** = Largura do frame (esquerda → direita do usuário)
- **+Y** = Altura (para cima)
- **−Z** = Frente das lentes (direção para onde elas "olham", ou seja, **para a câmera**)

**Por quê?** MindAR usa coordenadas com +Z apontando para a câmera. O widget aplica um bind Ry 180° para converter de −Z (Blender) para +Z (MindAR).

### 3. **Rotação Zero**
Antes de exportar:
1. Selecione o objeto
2. **Object → Apply → All Transforms** (ou Ctrl+A → All Transforms)
3. Verifique no painel Properties → Object Properties que Rotation = (0°, 0°, 0°)

**Por quê?** Rotações não aplicadas ("unapplied") podem causar comportamento inesperado no Three.js.

### 4. **Escala em Metros Reais**
- Use **unidades em metros** para dimensões reais
- Exemplo: Frame de 14cm de largura = **0.14** unidades Blender
- Aplique a escala: **Object → Apply → Scale**

**Por quê?** O widget usa a distância interpupilar (IPD) em metros para calcular escala dinâmica. Se o GLB não estiver em metros, a escala ficará errada.

### 5. **Exportação GLB**
Ao exportar (File → Export → glTF 2.0):
- ✅ Format: **glTF Binary (.glb)**
- ✅ Include: Selected Objects (ou All)
- ✅ Transform: **+Y Up** (padrão Blender)
- ✅ Geometry: Apply Modifiers
- ⚠️ **NÃO** mude "Forward" de −Z (deixe padrão)

## Checklist Pré-Export

Use este checklist antes de cada export:

- [ ] Origin posicionado na ponte do nariz (Set Origin → Origin to 3D Cursor)
- [ ] Frente das lentes olhando para **−Z** (eixo Z negativo azul)
- [ ] Dimensões em **metros reais** (ex: 0.14m para frame de 14cm)
- [ ] **Object → Apply → All Transforms** aplicado
- [ ] Rotation no painel Properties = **(0°, 0°, 0°)**
- [ ] Export como **glTF Binary (.glb)** com +Y Up

## Exemplo Visual

```
Vista de Cima (Top View):
         +Y (para cima)
          ↑
          |
    ------●------- +X (largura)
          |
          |
       (origin)
    
Vista Frontal (Front View):
         +Y
          ↑
          |
    ------●------- +X
         /
        / −Z (frente das lentes)
       ↙
```

## Como Testar

1. Exporte o GLB seguindo o contrato
2. Faça upload no admin Omafit
3. Na página de calibração, o preview deve mostrar o óculos **centralizado e com rotação zero**
4. No widget AR, o óculos deve aparecer **exatamente** no ponto médio entre os olhos, sem desvios para esquerda/direita

## Troubleshooting

### Problema: Óculos aparece com hastes viradas para frente (lado errado)
**Causa:** GLB foi exportado com frente = +Z ao invés de −Z, ou vice-versa  
**Solução Rápida:** Adicione `data-ar-glasses-bind-rotation-y-deg="0"` no HTML para desabilitar o bind de 180°  
**Solução Permanente:** Rotacione o objeto no Blender para que a frente das lentes seja −Z, depois Apply All Transforms

**Exemplo de configuração:**
```html
<div 
  data-omafit-ar="..."
  data-ar-glasses-bind-rotation-y-deg="0"
>
```

**Valores comuns:**
- `180` (padrão): GLB com frente = −Z (convenção Blender)
- `0`: GLB já orientado com frente = +Z (MindAR)
- Outros valores: Para correções específicas

### Problema: Óculos muito grande ou muito pequeno
**Causa:** Dimensões não estão em metros reais  
**Solução:** Escale o objeto para dimensões reais (ex: 0.14m de largura), depois Apply Scale

### Problema: Óculos deslocado para esquerda/direita
**Causa:** Origin não está na ponte do nariz  
**Solução:** Posicione 3D Cursor no centro da ponte, Set Origin → Origin to 3D Cursor

### Problema: Óculos "torto" mesmo após calibração
**Causa:** Rotação não foi aplicada no Blender  
**Solução:** Object → Apply → All Transforms antes de exportar

## Modo Legado (Não Recomendado)

Se por algum motivo você não puder seguir o contrato canônico, pode desabilitar o modo:

```html
<div data-ar-glasses-canonical-blender-export="0">
```

Isso reativa as heurísticas de auto-detecção, mas o comportamento pode ser imprevisível.

## Referências Técnicas

- **Widget Build:** v25+ (2026-05-20-glasses-canonical-v25)
- **Atributo de Configuração:** `data-ar-glasses-canonical-blender-export="1"` (padrão)
- **Landmarks MindAR:** 33 (olho direito), 263 (olho esquerdo), 168 (ponte nasal)
- **Coordenadas MindAR:** +X (direita), +Y (cima), +Z (para câmera)
- **Bind Aplicado:** Ry 180° (converte −Z Blender → +Z MindAR)

## Suporte

Para dúvidas sobre export canônico ou problemas com posicionamento:
1. Verifique o checklist acima
2. Compare seu GLB com modelos de referência que funcionam
3. Entre em contato com o suporte técnico Omafit
