import type { SidebarShellStep } from './sidebarShellTypes';

export type TryOnFlowStep = 'info' | 'calculator' | 'photo' | 'confirm' | 'processing' | 'result';

export type TryOnSidebarStepDef = {
  key: TryOnFlowStep;
  /** 0–100 para barra determinada; null = indeterminado (processing) */
  progress: number | null;
  labelPt: string;
  labelEs: string;
  labelEn: string;
};

const STEPS: TryOnSidebarStepDef[] = [
  { key: 'info', progress: 20, labelPt: 'Boas-vindas', labelEs: 'Bienvenida', labelEn: 'Welcome' },
  { key: 'calculator', progress: 40, labelPt: 'Medidas', labelEs: 'Medidas', labelEn: 'Measurements' },
  { key: 'photo', progress: 60, labelPt: 'Foto', labelEs: 'Foto', labelEn: 'Photo' },
  { key: 'confirm', progress: 80, labelPt: 'Confirmar', labelEs: 'Confirmar', labelEn: 'Confirm' },
  { key: 'processing', progress: null, labelPt: 'A processar', labelEs: 'Procesando', labelEn: 'Processing' },
  { key: 'result', progress: 100, labelPt: 'Resultado', labelEs: 'Resultado', labelEn: 'Result' },
];

const STEPS = TRYON_CLOTHING_SIDEBAR_STEPS as TryOnSidebarStepDef[];

export function getTryonSidebarSteps(): TryOnSidebarStepDef[] {
  return STEPS;
}

export function tryonSidebarProgressForStep(step: TryOnFlowStep): number | null {
  const row = STEPS.find((s) => s.key === step);
  return row ? row.progress : 0;
}

export function tryonSidebarLabelForStep(
  step: TryOnFlowStep,
  lang: 'pt' | 'es' | 'en',
): string {
  const row = STEPS.find((s) => s.key === step);
  if (!row) return '';
  if (lang === 'es') return row.labelEs;
  if (lang === 'en') return row.labelEn;
  return row.labelPt;
}
