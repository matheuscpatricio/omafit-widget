import type { SidebarShellStep } from './sidebarShellTypes';

/** Fluxo calçados: alinhado a `Step` em ShoeARWidget.tsx */
export const SHOE_SIDEBAR_STEPS: SidebarShellStep[] = [
  { key: 'info', progress: 17, labelPt: 'Boas-vindas', labelEs: 'Bienvenida', labelEn: 'Welcome' },
  { key: 'measure-capture', progress: 33, labelPt: 'Foto do pé', labelEs: 'Foto del pie', labelEn: 'Foot photo' },
  { key: 'processing', progress: null, labelPt: 'A analisar', labelEs: 'Analizando', labelEn: 'Analyzing' },
  { key: 'measure-result', progress: 67, labelPt: 'Resultado', labelEs: 'Resultado', labelEn: 'Result' },
  { key: 'ar-info', progress: 83, labelPt: 'Antes do AR', labelEs: 'Antes del AR', labelEn: 'Before AR' },
  { key: 'ar-viewer', progress: 100, labelPt: 'Provador AR', labelEs: 'Probador AR', labelEn: 'AR try-on' },
];
