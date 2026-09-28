# QA — oclusão AR (pulseira/colar) e lentes translúcidas

Checklist manual antes de `shopify app deploy` + deploy Netlify. Build alvo: `2026-06-01-ar-occlusion-lenses-v162` (`OMAFIT_AR_WIDGET_BUILD`).

## Pré-release

1. `cd omafit` → `npm run sync:ar-widget-to-widget`
2. Confirmar `grep OMAFIT_AR_WIDGET_BUILD` idêntico em `extensions/omafit-theme/assets/omafit-ar-widget.js` e `omafit-widget/public/ar/omafit-ar-widget.js`
3. `cd omafit-widget` → `npm run ar:qa-matrix`
4. Manifest publicado contém `occlusionProxy` / `materialProfile` (certify: `?omafit_ar_certify=1`)

## Matriz mínima (3 dispositivos × 5 classes × 2 poses)

| Classe | Dispositivos | Poses | Critério |
|--------|--------------|-------|----------|
| `bracelet_bangle` | iPhone Safari, Android mid, desktop Chrome | palma ↔ dorso | anel não atrás do pulso; não desaparece total |
| `bracelet_chain` | idem | rotação lenta | sem regressão; sem depth agressivo |
| `necklace_chain` | idem | frontal + ¾ | arco traseiro oculto; peça no peito visível |
| `glasses_clear` | idem | frente | estável (lite); sem lente preta |
| `glasses_premium` | iPhone + Android high | frente + lateral | transmissão visível em tier high |

## Métricas qualitativas

- Flicker de oclusão: aceitável &lt; 5% dos frames em vídeo 10s
- Pulseira “sumida”: zero em rigid com manifest `wrist_cylinder`
- Lente preta em low-tier: fallback `clear_fake` aceitável

## Rollback

- Manifest: `occlusionPolicy.mode` = `off`
- Attr iframe: `data-ar-occlusion-mode=off`
- Emergência pulseira: desligar depth no código (`OMAFIT_BRACELET_DEPTH_OCCLUDER_ENABLED=0`) + redeploy

## Ordem de deploy

1. Sync + Netlify (widget)
2. `shopify app deploy` (tema)
3. Reenfileirar jobs `queued` só se ingest antigo sem `lens_glass`
