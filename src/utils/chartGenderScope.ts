export type ChartGenderScope = 'both' | 'male' | 'female';

export type SizeChartGenderRow = {
  gender?: string | null;
  gender_scope?: string | null;
};

export function normalizeChartGenderScope(raw: unknown): ChartGenderScope {
  const v = String(raw || '').trim().toLowerCase();
  return v === 'male' || v === 'female' ? v : 'both';
}

export function normalizeSizeChartGender(raw: unknown): 'male' | 'female' | 'unisex' | null {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'male' || v === 'm' || v === 'masculino' || v === 'homem' || v === 'men') return 'male';
  if (v === 'female' || v === 'f' || v === 'feminino' || v === 'mulher' || v === 'women') return 'female';
  if (v === 'unisex' || v === 'neutro') return 'unisex';
  return null;
}

/**
 * Deduz se o utilizador deve escolher gênero na calculadora (both) ou não (male/female).
 * Prioridade: gender_scope explícito male/female → só tabelas masculinas/femininas → unissex/misto.
 */
export function inferChartGenderScopeFromRows(rows: SizeChartGenderRow[]): ChartGenderScope | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  for (const row of rows) {
    const scope = normalizeChartGenderScope(row?.gender_scope);
    if (scope === 'male' || scope === 'female') return scope;
  }

  const genders = new Set<'male' | 'female' | 'unisex'>();
  for (const row of rows) {
    const g = normalizeSizeChartGender(row?.gender);
    if (g) genders.add(g);
  }

  if (genders.size === 0) return null;
  if (genders.has('male') && !genders.has('female') && !genders.has('unisex')) return 'male';
  if (genders.has('female') && !genders.has('male') && !genders.has('unisex')) return 'female';
  return 'both';
}

/** Gênero fixo na calculadora: tabela/coleção masculina ou feminina; null = mostrar escolha (unissex). */
export function resolveForcedCalculatorGender(
  chartGenderScope: ChartGenderScope,
  defaultGender?: string | null
): 'male' | 'female' | null {
  if (chartGenderScope === 'male' || chartGenderScope === 'female') return chartGenderScope;
  const dg = normalizeSizeChartGender(defaultGender);
  if (dg === 'male' || dg === 'female') return dg;
  return null;
}
