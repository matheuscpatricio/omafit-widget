import {
  getActiveRetailOccasions,
  getSeasonLabel,
  inferCountryFromShopDomain,
  seasonLabelPt,
  type CountryCode,
} from './retailCalendar';
import {
  buildGarmentConstraints,
  normalizeStoreAudience,
  resolveGiftRecipient,
  type GarmentConstraints,
  type StoreAudience,
} from './occasionGarmentRules';
import { parseStylistFeedback, type ParsedStylistFeedback } from './stylistFeedbackParser';
import {
  fallbackStoreProfile,
  type PriceBand,
  type StoreProfile,
} from './storeProfile';

export type StylistBrief = {
  country_code: CountryCode;
  season: string;
  season_label_pt: string;
  active_occasions: Array<{ id: string; label: string; tone: string }>;
  store_audience: StoreAudience;
  price_band: PriceBand;
  store_profile_source: string;
  gift_recipient: string;
  effective_search_gender: string;
  feedback: ParsedStylistFeedback;
  garment_constraints_tags: string[];
  search_terms_boost: string[];
  exclude_handles: string[];
  sort_price_asc: boolean;
};

const STYLE_SEARCH_BOOST: Record<string, string[]> = {
  formal: ['formal', 'alfaiataria', 'blazer', 'social', 'camisa social', 'terno'],
  casual: ['casual', 'jeans', 'moletom', 'dia a dia', 'basico'],
};

function expandStyleKeywordsForSearch(styleKeywords: string[]): string[] {
  const out: string[] = [];
  for (const kw of styleKeywords) {
    const key = String(kw || '').trim().toLowerCase();
    if (!key) continue;
    const mapped = STYLE_SEARCH_BOOST[key];
    if (mapped?.length) out.push(...mapped);
    else out.push(key);
  }
  return out;
}

export function buildStylistBrief(options: {
  shopDomain?: string;
  countryCode?: string;
  userMessage?: string;
  shopperGender?: string;
  chartGenderScope?: string;
  storeAudience?: string;
  storeProfile?: StoreProfile | null;
  excludeHandles?: string[];
}): StylistBrief {
  const country = (options.countryCode ||
    inferCountryFromShopDomain(options.shopDomain)) as CountryCode;
  const today = new Date();
  const occasions = getActiveRetailOccasions(today, country);
  const season = getSeasonLabel(today, country);
  const profile =
    options.storeProfile && options.storeProfile.source !== 'fallback'
      ? options.storeProfile
      : fallbackStoreProfile(options.chartGenderScope);
  const storeAudience =
    profile.audience !== 'mixed' && profile.audience !== 'unknown'
      ? profile.audience
      : normalizeStoreAudience(options.storeAudience, options.chartGenderScope);
  const giftRecipient = resolveGiftRecipient(
    options.userMessage || '',
    occasions
  );
  const feedback = parseStylistFeedback(options.userMessage || '');
  const styleSearchBoost = expandStyleKeywordsForSearch(feedback.styleKeywords);
  const constraints: GarmentConstraints = buildGarmentConstraints({
    storeAudience,
    shopperGender: options.shopperGender,
    giftRecipient,
    activeOccasions: occasions,
  });

  const exclude_handles = [
    ...new Set(
      (options.excludeHandles || [])
        .map((h) => String(h || '').trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  return {
    country_code: country,
    season,
    season_label_pt: seasonLabelPt(season),
    active_occasions: occasions.map((o) => ({
      id: o.id,
      label: o.label,
      tone: o.tone,
    })),
    store_audience: storeAudience,
    price_band: profile.price_band,
    store_profile_source: profile.source,
    gift_recipient: giftRecipient,
    effective_search_gender: constraints.effectiveSearchGender,
    feedback,
    garment_constraints_tags: constraints.rationaleTags,
    search_terms_boost: [...new Set([...constraints.searchTermsBoost, ...styleSearchBoost])],
    exclude_handles,
    sort_price_asc: feedback.sortPriceAsc,
  };
}

export function formatCatalogPrice(
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: 'pt' | 'es' | 'en'
): string | null {
  if (amount == null || !Number.isFinite(Number(amount))) return null;
  const code = String(currency || '').trim().toUpperCase() || (locale === 'pt' ? 'BRL' : 'USD');
  const loc = locale === 'pt' ? 'pt-BR' : locale === 'es' ? 'es-ES' : 'en-US';
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: code }).format(Number(amount));
  } catch {
    return String(amount);
  }
}

export function briefToCatalogSearchParams(brief: StylistBrief): {
  country_code: string;
  occasion_ids: string;
  gift_recipient: string;
  store_audience: string;
  effective_search_gender: string;
  exclude_handles: string;
  sort_price_asc: string;
  search_terms_boost: string;
  price_band: string;
  store_profile_source: string;
} {
  return {
    country_code: brief.country_code,
    occasion_ids: brief.active_occasions.map((o) => o.id).join(','),
    gift_recipient: brief.gift_recipient,
    store_audience: brief.store_audience,
    effective_search_gender: brief.effective_search_gender,
    exclude_handles: brief.exclude_handles.join(','),
    sort_price_asc: brief.sort_price_asc ? '1' : '0',
    search_terms_boost: brief.search_terms_boost.join(','),
    price_band: brief.price_band,
    store_profile_source: brief.store_profile_source,
  };
}
