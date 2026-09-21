import { readHttpJsonResponse } from './readHttpJsonResponse';
import { getSupabaseFunctionHeaders, getSupabaseFunctionUrl } from './supabaseFunctions';

const SHOPPER_DEVICE_KEY = 'omafit_device_id_v1';

export type ShopperMeasurements = {
  gender: 'male' | 'female';
  height: number;
  weight: number;
  bodyType: number;
  fit: number;
  bodyTypeIndex?: number;
  fitIndex?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  shoulder?: number;
  legLength?: number;
  torsoLength?: number;
  measurement_method?: string;
};

export type ShopperProfile = {
  id: string;
  email: string | null;
  updated_at: string;
  measurements: ShopperMeasurements;
  consent_active: boolean;
  marketing_whatsapp_active: boolean;
};

export type ShopperProfileConfig = {
  shopDomain: string;
  publicId: string;
};

export type ShopperProfileEvent =
  | 'profile_offered'
  | 'profile_accepted'
  | 'profile_skipped_calculator'
  | 'profile_saved';

export type TryonHistoryEntry = {
  productHandle?: string | null;
  recommendedSize?: string | null;
  resultImageUrl?: string | null;
  tryonSessionId?: string | null;
  modelImageUrl?: string | null;
};

type ShopperResponse = {
  profile?: ShopperProfile | null;
  error?: string;
  message?: string;
};

export function normalizeShopDomain(value: string | null | undefined): string {
  let raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  raw = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  raw = raw.split('/')[0]?.split('?')[0]?.split('#')[0] || '';
  if (raw.startsWith('www.')) raw = raw.slice(4);
  return raw.replace(/\.$/, '');
}

export function isValidShopperMeasurements(value: unknown): value is ShopperMeasurements {
  if (!value || typeof value !== 'object') return false;
  const measurements = value as Partial<ShopperMeasurements>;
  if (measurements.gender !== 'male' && measurements.gender !== 'female') return false;
  const height = Number(measurements.height);
  const weight = Number(measurements.weight);
  return Number.isFinite(height) && height > 0 && Number.isFinite(weight) && weight > 0;
}

export function applyForcedGenderToMeasurements<T extends { gender?: string }>(
  measurements: T,
  forcedGender: 'male' | 'female' | null | undefined
): T {
  if (forcedGender !== 'male' && forcedGender !== 'female') return measurements;
  if (measurements.gender === forcedGender) return measurements;
  return { ...measurements, gender: forcedGender };
}

function measurementSignature(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const measurements = value as Partial<ShopperMeasurements>;
  return [
    measurements.gender || '',
    Number(measurements.height) || 0,
    Number(measurements.weight) || 0,
    Number(measurements.bodyType) || 0,
    Number(measurements.fit) || 0,
    measurements.bodyTypeIndex ?? '',
    measurements.fitIndex ?? '',
  ].join('|');
}

export function shopperMeasurementsEqual(left: unknown, right: unknown): boolean {
  if (!isValidShopperMeasurements(left) || !isValidShopperMeasurements(right)) return false;
  return measurementSignature(left) === measurementSignature(right);
}

export function hasActiveShopperConsent(profile: ShopperProfile | null | undefined): boolean {
  return Boolean(profile?.consent_active);
}

export function hasActiveMarketingWhatsappConsent(
  profile: ShopperProfile | null | undefined
): boolean {
  return Boolean(profile?.marketing_whatsapp_active);
}

export function getShopperDeviceId(): string {
  if (typeof window === 'undefined') return '';
  try {
    return String(window.localStorage.getItem(SHOPPER_DEVICE_KEY) || '').trim();
  } catch {
    return '';
  }
}

/** Grava o id vindo da loja. `true` só quando o valor mudou. */
export function setShopperDeviceIdFromParent(deviceId: string): boolean {
  const next = String(deviceId || '').trim();
  if (!next || typeof window === 'undefined') return false;
  if (getShopperDeviceId() === next) return false;
  try {
    window.localStorage.setItem(SHOPPER_DEVICE_KEY, next);
    return true;
  } catch {
    return false;
  }
}

async function postShopperProfile(
  action: string,
  config: ShopperProfileConfig,
  extra?: Record<string, unknown>,
  options?: { allowEmpty?: boolean }
): Promise<ShopperProfile | null> {
  const response = await fetch(getSupabaseFunctionUrl('shopper-profile'), {
    method: 'POST',
    headers: getSupabaseFunctionHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      action,
      shop_domain: config.shopDomain,
      public_id: config.publicId,
      device_id: getShopperDeviceId() || null,
      ...(extra || {}),
    }),
  });

  if (response.status === 404 && options?.allowEmpty) return null;

  const parsed = await readHttpJsonResponse<ShopperResponse>(response);
  if (!parsed.ok) {
    throw new Error(parsed.error || `HTTP ${parsed.status}`);
  }
  return parsed.data?.profile ?? null;
}

export function fetchShopperProfile(config: ShopperProfileConfig): Promise<ShopperProfile | null> {
  return postShopperProfile('fetch', config, undefined, { allowEmpty: true });
}

export function saveShopperProfile(
  config: ShopperProfileConfig,
  measurements: ShopperMeasurements,
  options?: { email?: string; event?: ShopperProfileEvent }
): Promise<ShopperProfile | null> {
  return postShopperProfile('save', config, {
    measurements,
    email: String(options?.email || '').trim() || null,
    event: options?.event || 'profile_saved',
    consent_active: true,
  });
}

export async function deleteShopperProfile(config: ShopperProfileConfig): Promise<void> {
  await postShopperProfile('delete', config);
}

export async function recordShopperProfileEvent(
  config: ShopperProfileConfig,
  event: ShopperProfileEvent
): Promise<void> {
  try {
    await postShopperProfile('event', config, { event });
  } catch (err) {
    console.warn('[shopperProfile] event error:', event, err);
  }
}

export function saveShopperMarketingWhatsapp(
  config: ShopperProfileConfig,
  phone: string,
  options?: { modelImageUrl?: string | null; marketingPhotoConsent?: boolean }
): Promise<ShopperProfile | null> {
  return postShopperProfile('save_whatsapp', config, {
    phone: String(phone || '').trim(),
    model_image_url: options?.modelImageUrl || null,
    marketing_photo_consent: Boolean(options?.marketingPhotoConsent),
  });
}

export function revokeShopperMarketingWhatsapp(
  config: ShopperProfileConfig
): Promise<ShopperProfile | null> {
  return postShopperProfile('revoke_whatsapp', config);
}

export function appendTryonHistory(
  config: ShopperProfileConfig,
  entry: TryonHistoryEntry
): Promise<ShopperProfile | null> {
  return postShopperProfile('append_tryon_history', config, {
    product_handle: entry.productHandle || null,
    recommended_size: entry.recommendedSize || null,
    result_image_url: entry.resultImageUrl || null,
    tryon_session_id: entry.tryonSessionId || null,
    model_image_url: entry.modelImageUrl || null,
  });
}
