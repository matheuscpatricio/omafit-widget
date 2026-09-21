import { normalizeShopDomain } from './shopperProfile';

function pilotAllowlist(): string[] {
  return String(import.meta.env.VITE_WHATSAPP_PILOT_SHOPS || '')
    .split(',')
    .map((shop) => normalizeShopDomain(shop))
    .filter(Boolean);
}

/**
 * WhatsApp de marketing só entra no provador para lojas do piloto
 * e quando o consultor (plano Growth+) está ativo.
 * `VITE_WHATSAPP_MARKETING_ENABLED=true` abre para qualquer loja com consultor.
 */
export function isWhatsappMarketingEnabledForShop(
  shopDomain: string | null | undefined,
  stylistEnabled: boolean
): boolean {
  if (!stylistEnabled) return false;
  const flag = String(import.meta.env.VITE_WHATSAPP_MARKETING_ENABLED || '').trim().toLowerCase();
  if (flag === '1' || flag === 'true' || flag === 'all') return true;
  const shop = normalizeShopDomain(shopDomain);
  if (!shop) return false;
  return pilotAllowlist().includes(shop);
}
