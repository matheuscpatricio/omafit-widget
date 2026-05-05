import type { SidebarShellStep } from './sidebarShellTypes';

/** Fluxo calçados: alinhado a `Step` em ShoeARWidget.tsx */
export const SHOE_SIDEBAR_STEPS: SidebarShellStep[] = [
  { key: 'info', progress: 25, labelPt: 'Boas-vindas', labelEs: 'Bienvenida', labelEn: 'Welcome' },
  { key: 'measure-capture', progress: 50, labelPt: 'Foto do pé', labelEs: 'Foto del pie', labelEn: 'Foot photo' },
  { key: 'processing', progress: null, labelPt: 'A analisar', labelEs: 'Analizando', labelEn: 'Analyzing' },
  { key: 'measure-result', progress: 100, labelPt: 'Resultado', labelEs: 'Resultado', labelEn: 'Result' },
];
