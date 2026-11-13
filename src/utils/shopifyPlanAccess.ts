/** Planos Shopify com consultor stylist (chat pós provador) e layout hero. */
export const GROWTH_PLUS_PLANS = new Set([
  'growth',
  'pro',
  'professional',
  'enterprise',
]);

export function hasGrowthPlusPlan(plan: string | null | undefined): boolean {
  return GROWTH_PLUS_PLANS.has(String(plan || '').trim().toLowerCase());
}

/** Alias semântico: consultor de outfit no chat do provador. */
export const hasStylistConsultantAccess = hasGrowthPlusPlan;

/**
 * Voz do Stylist: Growth (menos minutos) e Enterprise. Só decide se o botão
 * aparece — a autorização e a quota reais são impostas no mint do omafit.
 */
export function hasStylistVoiceAccess(plan: string | null | undefined): boolean {
  return hasGrowthPlusPlan(plan);
}
