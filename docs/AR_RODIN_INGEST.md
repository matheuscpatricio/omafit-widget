# Ingest AR com Rodin (Hyper3D)

## Visão geral

Pipeline: **fotos produto** → **fal.ai Rodin v2.5** → **recipe trimesh/Blender** por `wearableClass` → **GLB + manifest v1** → Supabase Storage → Shopify metafields → widget AR.

Implementação: [`omafit/workers/ar-mesh-generate`](../../omafit/workers/ar-mesh-generate).

## Wearable classes

| `wearableClass` | Categoria | Lentes (`materialProfile`) |
|-----------------|-----------|----------------------------|
| `glasses_clear` | óculos | `clear_fake` + `renderMode: lite` |
| `glasses_sun` | óculos | `tinted` + `lite` |
| `glasses_premium` | óculos | `clear_physical` + `pmrem` |
| `bracelet_bangle` | pulseira | certified template |
| `bracelet_chain` | pulseira | certified |
| `bracelet_cuff_open` | pulseira | certified |
| `watch_round` | relógio | hybrid fit |
| `necklace_chain` | colar | PMREM joias |

Presets: [`presets/wearable-classes.json`](../public/ar/presets/wearable-classes.json) (cópia; fonte no worker).

## Env worker

| Variável | Descrição |
|----------|-----------|
| `FAL_API_KEY` | Chave fal.ai |
| `AR_3D_PROVIDER` | `rodin` (default), `tripo`, `triposr` |
| `WORKER_STUB=1` | GLB placeholder + recipe |

## SQL Supabase

Executar no projeto omafit: `supabase_add_ar_mesh_generation_fields.sql`.

## Validação local

```bash
npm run ar:ingest-validate -- ./model.glb ./ar-manifest.json
```

## Widget

- Manifest URL: metafield `omafit.ar_manifest_url` na publicação.
- `materialProfile.renderMode`: `lite` mantém strip de transmission; `pmrem` activa `upgradeFaceArEyewearRendering`.

## Custos

Limitar `Gen-2.5-High` / multiview a `glasses_premium`. Demais classes usam `Gen-2.5-Medium`.
