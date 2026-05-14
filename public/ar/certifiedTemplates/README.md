# Templates certificados Omafit (pulseira — Fase 1)

GLBs em **metros**, pivô e eixo padronizados no ingest (Blender). Binários podem ficar fora do repo (`geometryGlbUrl` absoluto CDN) ou em `/ar/certifiedTemplates/*.glb`.

## IDs iniciais e `wearableClass`

| `certifiedTemplate.id`        | `wearableClass` (gate)   |
|------------------------------|---------------------------|
| `bracelet_bangle_round_v1`   | `bracelet_bangle`       |
| `bracelet_chain_soft_v1`     | `bracelet_chain`        |
| `bracelet_cuff_open_v1`      | `bracelet_cuff_open`    |

Novos IDs podem seguir a convenção `{{wearableClass}}_…_v1` (prefixo = classe).

## Manifest mínimo (`template_certified`)

- `meshPolicy.runtimeMode`: `"template_certified"`
- `meshPolicy.fittingMode`: recomendado `"strict"`
- `meshPolicy.deformationPolicy`: `"rigid"`
- `certifiedTemplate.id` + opcional `geometryGlbUrl` (se omitido, usa-se o GLB do produto)
- `wearableClass` coerente com o id (tabela acima)
- `wearAnchor.position` [x,y,z]
- `fitProxy`: `innerRadiusMm` | `innerDiameterMm` | `innerRadiusM`, `ringHoleAxisLocal`, `ringCenterLocal`

Com gate inválido o runtime faz **fallback** legacy e regista `[template-bypass]`.

## Ferramenta offline (Fase 1.5)

- `npm run ar:ingest-validate -- <ficheiro.glb>` — checagem básica do GLB.
- `npm run ar:certified-manifest-stub -- --id bracelet_bangle_round_v1 --inner-diameter-mm 62 --glb-url /ar/certifiedTemplates/bracelet_bangle_round_v1.glb` — JSON mínimo para colar em `data-ar-manifest-json` ou ficheiro; ajustar `wearAnchor` / `ringCenterLocal` após medidas no Blender.

## Fase 2 (fora do mínimo Fase 1)

Visual IA (malha Tripo só aparência sobre template) — não usar segundo GLB de geometria na Fase 1.
