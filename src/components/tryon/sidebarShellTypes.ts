/** Passos genéricos para `TryOnLayoutShellSidebar` (try-on roupa, calçados, etc.). */
export type SidebarShellStep = {
  key: string;
  progress: number | null;
  labelPt: string;
  labelEs: string;
  labelEn: string;
};

export function sidebarShellLabelForStep(
  stepKey: string,
  lang: 'pt' | 'es' | 'en',
  steps: SidebarShellStep[],
): string {
  const row = steps.find((s) => s.key === stepKey);
  if (!row) return '';
  if (lang === 'es') return row.labelEs;
  if (lang === 'en') return row.labelEn;
  return row.labelPt;
}

export function sidebarShellProgressForStep(
  stepKey: string,
  steps: SidebarShellStep[],
): number | null {
  const row = steps.find((s) => s.key === stepKey);
  return row ? row.progress : null;
}
