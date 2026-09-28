# Assets gerados e cópias

Há duas fontes editáveis que não devem divergir: o tema no repositório `omafit` e os arquivos servidos por este widget. O comando de sync **copia** do tema para cá. Editar a cópia em `public/` e não o tema faz o próximo sync sobrescrever o trabalho, ou o contrário: a loja Shopify continua no tema e o iframe Netlify fica na cópia.

Não há segundo compilador dentro deste repo para esses JS. Eles não saem do `vite build`.

## Comando

```bash
npm run sync:theme-ar
```

Implementação: `scripts/sync-ar-assets-from-theme.mjs`.

Origem esperada (clone irmão):

```text
../omafit/extensions/omafit-theme/assets/
```

`predev`, `prebuild`, `prelint` e `prepreview` rodam esse sync. Se a pasta do tema não existir e os arquivos já estiverem em `public/`, o script termina com aviso e exit 0 (modo CI/deploy). Se a pasta não existir e faltar algum arquivo do bundle, o script falha.

## Mapa

| SOURCE (repo `omafit`, tema) | GENERATED / COPIED (este repo) | SYNC |
| --- | --- | --- |
| `extensions/omafit-theme/assets/omafit-widget.js` | `public/omafit-widget.js` | `npm run sync:theme-ar` |
| `extensions/omafit-theme/assets/omafit-ar-widget.js` | `public/ar/omafit-ar-widget.js` | mesmo comando |
| o mesmo `omafit-ar-widget.js` | `public/ar/omafit-ar-widget.<OMAFIT_AR_WIDGET_BUILD>.js` | o script lê a constante `OMAFIT_AR_WIDGET_BUILD` e grava a cópia versionada |
| `omafit-glasses-calibration.js` | `public/ar/omafit-glasses-calibration.js` | mesmo comando |
| `omafit-necklace-calibration.js` | `public/ar/omafit-necklace-calibration.js` | mesmo comando |
| `omafit-glasses-orient.js` | `public/ar/omafit-glasses-orient.js` | mesmo comando |
| `omafit-glb-bbox-center.js` | `public/ar/omafit-glb-bbox-center.js` | mesmo comando |
| `omafit-bracelet-wrist-placement.js` | `public/ar/omafit-bracelet-wrist-placement.js` | mesmo comando |
| `omafit-mindar-glasses-pivot-rig.js` | `public/ar/omafit-mindar-glasses-pivot-rig.js` | mesmo comando |

`WidgetPage.tsx` carrega `/ar/omafit-ar-widget.<build>.js` usando `OMAFIT_AR_MODULE_CACHE_BUST`. O browser resolve imports `./foo.js` relativos a essa URL, então os satélites precisam continuar em `public/ar/`.

Cache HTTP dessas URLs está em `netlify.toml` e `public/_headers`. Não alterar esses paths.

## Fonte única neste repo (não vêm do sync)

O comentário do script lista arquivos versionados só no widget:

- `public/ar/omafit-ar-manifest.js`
- `public/ar/omafit-ar-runtime-core.js`
- `public/ar/omafit-ar-resolve-frame.js`
- `public/ar/omafit-ar-certify.js`
- `public/ar/omafit-ar-fit-contract.js`
- `public/ar/omafit-ar-certified-template.js`
- `public/ar/ar-manifest.schema.json`
- `public/ar/ar-manifest.sample.json`

Também estão em `public/ar/` e **não** entram na lista `AR_BUNDLE` do sync (editar aqui é a fonte, até alguém passar a copiá-los do tema):

- `omafit-ar-meta-perf.js`
- `omafit-ar-scene-base.js`
- `presets/wearable-classes.json`
- `certifiedTemplates/README.md`

`src/types/omafit-ar-manifest-v1.ts` não é importado por nenhum módulo. Não é o runtime AR.

## Drift já visível (não corrigido)

Medido neste checkout, sem alterar os arquivos:

- `public/ar/omafit-ar-widget.js` declara `OMAFIT_AR_WIDGET_BUILD = "2026-06-10-glasses-ingest-admin-flat-v350"`.
- `src/components/WidgetPage.tsx` usa `OMAFIT_AR_MODULE_CACHE_BUST = '2026-06-10-glasses-ingest-admin-flat-v349'`.
- O arquivo versionado commitado é `public/ar/omafit-ar-widget.2026-06-10-glasses-ingest-admin-flat-v344.js`.

O sync só regrava a cópia versionada quando o tema irmão está presente. Alinhar esses três identificadores muda qual URL a CDN e o iframe carregam. Fica para uma mudança explícita de release AR.

## Outros artefatos

| Arquivo | Papel |
| --- | --- |
| `omafit-logo-landing.png` (raiz) | Saída de `node scripts/export-omafit-logo-landing-png.mjs`. O script grava nesse path. Não é o asset da landing em `public/brand/omafit-logo-landing.png` (tamanhos diferentes). |
| `public/brand/omafit-logo-landing.png` | Asset estático servido pelo Vite. |
| `dist/` | Saída de `npm run build`. Gitignored. |
| `public/models/pose_landmarker_lite.task` | Binário local sem referências no código. O hook e o worker carregam o modelo da URL pública do Google (`storage.googleapis.com/mediapipe-models/...`). Não removido. |

`src/` é a fonte do SPA. `vite build` não gera `public/omafit-widget.js`.
