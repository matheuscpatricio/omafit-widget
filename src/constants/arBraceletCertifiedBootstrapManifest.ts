/**
 * Manifest AR mínimo válido para o gate `template_certified` (pulseira).
 * Usado no iframe Netlify quando não há `arManifestJson` / `arManifestUrl`
 * na query nem no `config` — substituível pelo tema (data-ar-manifest-json).
 *
 * Valores de `fitProxy` são genéricos (≈62 mm); o ingest real deve sobrescrever.
 */
export const AR_BRACELET_CERTIFIED_BOOTSTRAP_MANIFEST_JSON = JSON.stringify({
  schemaVersion: 1,
  wearableClass: 'bracelet_bangle',
  certifiedTemplate: { id: 'bracelet_bangle_round_v1' },
  meshPolicy: {
    runtimeMode: 'template_certified',
    fittingMode: 'strict',
    deformationPolicy: 'rigid',
  },
  wearAnchor: { position: [0, 0, 0] },
  fitProxy: {
    innerDiameterMm: 62,
    ringHoleAxisLocal: [0, 1, 0],
    ringCenterLocal: [0, 0, 0],
  },
});
