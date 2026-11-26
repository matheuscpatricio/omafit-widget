import { afterEach, describe, expect, it, vi } from 'vitest';
import { isEmailMarketingEnabledForShop } from './emailMarketingAccess';

describe('email marketing access', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('stays off without the stylist plan', () => {
    vi.stubEnv('VITE_EMAIL_MARKETING_ENABLED', 'true');
    expect(isEmailMarketingEnabledForShop('loja.myshopify.com', false)).toBe(false);
  });

  it('allows an explicit shop from the email allowlist', () => {
    vi.stubEnv('VITE_EMAIL_MARKETING_SHOPS', 'https://loja.myshopify.com, outra.myshopify.com');
    expect(isEmailMarketingEnabledForShop('loja.myshopify.com', true)).toBe(true);
    expect(isEmailMarketingEnabledForShop('terceira.myshopify.com', true)).toBe(false);
  });

  it('keeps stores already listed on the previous pilot allowlist', () => {
    vi.stubEnv('VITE_WHATSAPP_PILOT_SHOPS', 'loja.myshopify.com');
    expect(isEmailMarketingEnabledForShop('loja.myshopify.com', true)).toBe(true);
  });
});
