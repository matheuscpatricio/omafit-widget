import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWhatsappMarketingEnabledForShop } from './whatsappPilotAccess';

describe('whatsapp pilot access', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stays off without the stylist plan', () => {
    vi.stubEnv('VITE_WHATSAPP_MARKETING_ENABLED', 'true');
    expect(isWhatsappMarketingEnabledForShop('loja.myshopify.com', false)).toBe(false);
  });

  it('allows an explicit pilot shop', () => {
    vi.stubEnv('VITE_WHATSAPP_PILOT_SHOPS', 'https://loja.myshopify.com, outra.myshopify.com');
    expect(isWhatsappMarketingEnabledForShop('loja.myshopify.com', true)).toBe(true);
    expect(isWhatsappMarketingEnabledForShop('terceira.myshopify.com', true)).toBe(false);
  });
});
