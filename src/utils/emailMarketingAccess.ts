import { normalizeShopDomain } from './shopperProfile';

function isEnabledFlag(value: string | undefined): boolean {
  const flag = String(value || '').trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'all';
}

function shopAllowlist(value: string | undefined): string[] {
  return String(value || '')
    .split(',')
    .map((shop) => normalizeShopDomain(shop))
    .filter(Boolean);
}

/**
 * Captura de e-mail de marketing no provador (destino previsto: Klaviyo).
 * Entra só com o consultor (plano Growth+) e loja liberada.
 * `VITE_EMAIL_MARKETING_ENABLED=true` abre para qualquer loja com consultor.
 * As variáveis `VITE_WHATSAPP_*` continuam como alias do piloto anterior.
 */
export function isEmailMarketingEnabledForShop(
  shopDomain: string | null | undefined,
  stylistEnabled: boolean
): boolean {
  if (!stylistEnabled) return false;
  if (
    isEnabledFlag(import.meta.env.VITE_EMAIL_MARKETING_ENABLED) ||
    isEnabledFlag(import.meta.env.VITE_WHATSAPP_MARKETING_ENABLED)
  ) {
    return true;
  }
  const shop = normalizeShopDomain(shopDomain);
  if (!shop) return false;
  const allowed = [
    ...shopAllowlist(import.meta.env.VITE_EMAIL_MARKETING_SHOPS),
    ...shopAllowlist(import.meta.env.VITE_WHATSAPP_PILOT_SHOPS),
  ];
  return allowed.includes(shop);
}
