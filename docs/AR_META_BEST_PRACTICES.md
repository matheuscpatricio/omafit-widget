# AR — práticas Meta Reality Labs (Omafit)

Guia interno alinhado à documentação Meta para Web/WebXR no Quest Browser e telemóveis. Implementação em `public/ar/omafit-ar-meta-perf.js` e integração em `omafit-ar-widget.js`.

## O que está aplicado no runtime

| Prática Meta | Implementação Omafit |
|--------------|----------------------|
| Frame budget (~13,7 ms @ 72 Hz no Quest) | `omafitMetaFrameBudgetMs` + `omafitCreateMetaFrameBudgetGovernor` |
| DPR / framebuffer scaling adaptativo | `data-ar-meta-adaptive-dpr` (default `1`); reduz DPR se o frame médio exceder o orçamento |
| Deteção Quest Browser (`OculusBrowser`, `Quest N`) | `omafitDetectMetaQuestBrowser` → caps DPR, AA, vídeo, tier auto |
| Draw calls &lt; ~100 (guia perf) | Aviso dev com `?omafit_ar_debug_perf=1` → `omafitMetaMaybeWarnDrawCalls` |
| Tracking estável (CPU livre) | Filtros MindAR reforçados no Quest via `omafitMetaMindarFilterPreset` |
| WebGL `powerPreference: high-performance` | Face (hints pós-MindAR) + mão + `omafit-ar-scene-base.js` |
| Depth clipping mão (mobile) | `omafitMetaHandCameraClipping` |

## Atributos HTML úteis

- `data-ar-meta-adaptive-dpr="0"` — desliga governor DPR adaptativo
- `data-ar-performance-profile` — `auto` | `quality` | `balanced` | `performance`
- `data-ar-renderer-max-dpr` — tecto manual de DPR (respeita perfil + governor)
- `data-ar-mindar-filter-min-cf` / `data-ar-mindar-filter-beta` — override One Euro MindAR
- `data-ar-hand-min-detection-confidence` (e presence/tracking) — limiares MediaPipe

## Validação

```bash
npm run ar:meta-quest-audit
```

No headset (Developer Mode + USB/Wi‑Fi ADB):

```bash
npx -y @meta-quest/hzdb device list
npx -y @meta-quest/hzdb perf capture
```

Documentação ao vivo:

```bash
npx -y @meta-quest/hzdb docs search "WebXR performance"
```

## Limites

Isto **não** substitui Spark AR (runtime nativo Instagram). Melhora fluidez, estabilidade de tracking e conformidade GPU no browser — o tecto continua a ser MindAR + MediaPipe + Three.js na loja Shopify.
