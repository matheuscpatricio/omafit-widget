import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyForcedGenderToMeasurements,
  fetchShopperProfile,
  hasActiveMarketingEmailConsent,
  hasActiveShopperConsent,
  isValidMarketingEmail,
  isValidShopperMeasurements,
  normalizeShopDomain,
  saveShopperMarketingEmail,
  saveShopperProfile,
  setShopperDeviceIdFromParent,
  shopperMeasurementsEqual,
  type ShopperProfile,
} from './shopperProfile';

const measurements = {
  gender: 'female' as const,
  height: 168,
  weight: 62,
  bodyType: 1,
  fit: 1,
};

const profile: ShopperProfile = {
  id: 'sp_1',
  email: 'a@loja.com',
  updated_at: '2026-09-21T00:00:00.000Z',
  measurements,
  consent_active: true,
  marketing_email_active: false,
};

describe('shopper profile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes shop domains', () => {
    expect(normalizeShopDomain('HTTPS://www.Loja.myshopify.com/products/x')).toBe(
      'loja.myshopify.com'
    );
  });

  it('validates measurements and applies a forced gender', () => {
    expect(isValidShopperMeasurements(measurements)).toBe(true);
    expect(isValidShopperMeasurements({ ...measurements, height: 0 })).toBe(false);
    expect(applyForcedGenderToMeasurements(measurements, 'male').gender).toBe('male');
    expect(applyForcedGenderToMeasurements(measurements, null)).toBe(measurements);
  });

  it('compares calculator payloads and consent flags', () => {
    expect(shopperMeasurementsEqual(measurements, { ...measurements })).toBe(true);
    expect(shopperMeasurementsEqual(measurements, { ...measurements, weight: 70 })).toBe(false);
    expect(hasActiveShopperConsent(profile)).toBe(true);
    expect(hasActiveMarketingEmailConsent(profile)).toBe(false);
    expect(hasActiveMarketingEmailConsent({ ...profile, marketing_email_active: true })).toBe(true);
    expect(hasActiveShopperConsent(null)).toBe(false);
    expect(isValidMarketingEmail('Cliente@Loja.com')).toBe(true);
    expect(isValidMarketingEmail('sem-arroba')).toBe(false);
  });

  it('adopts a parent device id only when it changes', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    expect(setShopperDeviceIdFromParent('dev-1')).toBe(true);
    expect(setShopperDeviceIdFromParent('dev-1')).toBe(false);
    expect(setShopperDeviceIdFromParent('dev-2')).toBe(true);
  });

  it('loads and saves a profile through the shopper-profile function', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}')) as { action?: string };
      const payload = body.action === 'fetch' ? { profile } : { profile: { ...profile, email: 'b@loja.com' } };
      return new Response(JSON.stringify(payload), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchShopperProfile({ shopDomain: 'loja.myshopify.com', publicId: 'pub' })).resolves.toMatchObject({
      id: 'sp_1',
    });
    const saved = await saveShopperProfile(
      { shopDomain: 'loja.myshopify.com', publicId: 'pub' },
      measurements,
      { email: 'b@loja.com', event: 'profile_saved' }
    );
    expect(saved?.email).toBe('b@loja.com');
    const saveCall = fetchMock.mock.calls[1];
    expect(String(saveCall[0])).toContain('/functions/v1/shopper-profile');
    expect(JSON.parse(String(saveCall[1]?.body)).action).toBe('save');
  });

  it('saves a marketing email for the Klaviyo opt-in', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}')) as { action?: string; email?: string };
      if (!String(url).includes('shopper-profile') || body.action !== 'save_marketing_email') {
        return new Response(JSON.stringify({ error: 'unexpected' }), { status: 400 });
      }
      return new Response(
        JSON.stringify({
          profile: { ...profile, email: body.email, marketing_email_active: true },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const saved = await saveShopperMarketingEmail(
      { shopDomain: 'loja.myshopify.com', publicId: 'pub' },
      'Cliente@Loja.com'
    );
    expect(saved?.marketing_email_active).toBe(true);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      action?: string;
      email?: string;
      marketing_channel?: string;
    };
    expect(body.action).toBe('save_marketing_email');
    expect(body.email).toBe('cliente@loja.com');
    expect(body.marketing_channel).toBe('klaviyo');
    await expect(
      saveShopperMarketingEmail({ shopDomain: 'loja.myshopify.com', publicId: 'pub' }, 'invalido')
    ).rejects.toThrow('invalid_marketing_email');
  });
});
