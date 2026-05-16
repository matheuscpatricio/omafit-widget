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
