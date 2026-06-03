import type { RetailOccasion, RetailOccasionId } from './retailCalendar';

export type StoreAudience = 'male' | 'female' | 'mixed' | 'unknown';

export type GiftRecipient = 'male' | 'female' | 'unisex' | 'unknown';

export type GarmentConstraints = {
  effectiveSearchGender: 'male' | 'female' | 'unisex';
  forbiddenTitlePatterns: RegExp[];
  searchTermsBoost: string[];
  rationaleTags: string[];
};

const FEMALE_ONLY =
  /\b(saia|skirt|vestido|dress|maxi dress|midi skirt|falda|vestid)\b/i;
const MALE_ONLY =
  /\b(gravata|gravatas|tie\b|smoking|terno masculino|cueca masculina)\b/i;

export function normalizeStoreAudience(
  input?: string,
  chartGenderScope?: string
): StoreAudience {
  const s = String(input || '').trim().toLowerCase();
  if (s === 'male' || s === 'masculino' || s === 'homem') return 'male';
  if (s === 'female' || s === 'feminino' || s === 'mulher') return 'female';
  if (s === 'mixed' || s === 'ambos' || s === 'both') return 'mixed';
  const scope = String(chartGenderScope || '').trim().toLowerCase();
  if (scope === 'male') return 'male';
  if (scope === 'female') return 'female';
  if (scope === 'both') return 'mixed';
  return 'unknown';
}

export function parseGiftRecipientFromMessage(message: string): GiftRecipient {
  const m = String(message || '').toLowerCase();
  if (
    /\b(para\s+)?(meu|minha|o|a)\s+(pai|papai|padrasto|sogro|marido|namorado|ele)\b/.test(m) ||
    /\b(dia\s+dos?\s+pai|presente\s+.*\s+pai)\b/.test(m)
  ) {
    return 'male';
  }
  if (
    /\b(para\s+)?(minha|a)\s+(m[ãa]e|mam[ãa]e|sogra|esposa|namorada|ela)\b/.test(m) ||
    /\b(dia\s+das?\s+m[ãa]es|presente\s+.*\s+m[ãa]e)\b/.test(m)
  ) {
    return 'female';
  }
  return 'unknown';
}

function occasionDefaultRecipient(id: RetailOccasionId): GiftRecipient {
  if (id === 'fathers_day') return 'male';
  if (id === 'mothers_day') return 'female';
  return 'unknown';
}

export function resolveGiftRecipient(
  userMessage: string,
  activeOccasions: RetailOccasion[]
): GiftRecipient {
  const fromMsg = parseGiftRecipientFromMessage(userMessage);
  if (fromMsg !== 'unknown') return fromMsg;
  for (const o of activeOccasions) {
    const d = occasionDefaultRecipient(o.id);
    if (d !== 'unknown') return d;
  }
  return 'unknown';
}

export function buildGarmentConstraints(options: {
  storeAudience: StoreAudience;
  shopperGender?: string;
  giftRecipient: GiftRecipient;
  activeOccasions: RetailOccasion[];
}): GarmentConstraints {
  const shopper = String(options.shopperGender || '').toLowerCase();
  let effective: 'male' | 'female' | 'unisex' = 'unisex';
  if (options.giftRecipient === 'male') effective = 'male';
  else if (options.giftRecipient === 'female') effective = 'female';
  else if (shopper === 'male' || shopper === 'female') effective = shopper;
  else if (options.storeAudience === 'male') effective = 'male';
  else if (options.storeAudience === 'female') effective = 'female';

  const forbidden: RegExp[] = [];
  const boost: string[] = [];
  const tags: string[] = [];

  if (effective === 'male' || options.storeAudience === 'male') {
    forbidden.push(FEMALE_ONLY);
    tags.push('perfil_masculino');
  }
  if (effective === 'female' || options.storeAudience === 'female') {
    forbidden.push(MALE_ONLY);
    tags.push('perfil_feminino');
  }

  for (const o of options.activeOccasions) {
    tags.push(o.id);
    if (o.id === 'christmas' || o.id === 'new_year') {
      boost.push('festa', 'natal', 'ano novo', 'party');
    }
    if (o.id === 'fathers_day') {
      boost.push('presente', 'pai', 'masculino');
      forbidden.push(FEMALE_ONLY);
    }
    if (o.id === 'mothers_day') {
      boost.push('presente', 'mãe', 'feminino');
    }
    if (o.id === 'valentines_br') {
      boost.push('romântico', 'namorados');
    }
  }

  return {
    effectiveSearchGender: effective,
    forbiddenTitlePatterns: forbidden,
    searchTermsBoost: [...new Set(boost)],
    rationaleTags: tags,
  };
}

export function candidateTitleViolatesConstraints(
  title: string,
  constraints: GarmentConstraints
): boolean {
  const t = String(title || '');
  return constraints.forbiddenTitlePatterns.some((re) => re.test(t));
}
