/**
 * Identidade da loja no Omafit.
 *
 * O try-on (`supabase/functions/tryon/index.ts`) e `normalizeShopDomain`
 * descartam tudo depois da primeira barra. `vtex/{conta}` viraria só `vtex`
 * e misturaria todas as contas. O host `{conta}.myvtex.com` passa inteiro
 * e é estável (workspace e domínio próprio não entram na chave).
 */
export function buildShopDomain(account: string | undefined | null): string {
  const normalized = String(account || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  if (!normalized) return ''
  return `${normalized}.myvtex.com`
}

/** Mesma normalização do edge function de try-on: corta path. */
export function backendShopDomain(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}
