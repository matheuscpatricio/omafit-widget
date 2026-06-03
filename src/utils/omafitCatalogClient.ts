import { parseStoreProfileFromApi } from './storeProfile';

export type OmafitCatalogCandidate = {
  handle: string;
  title: string;
  url: string;
  image_url: string;
  product_type?: string;
  tags?: string[];
  price_amount?: number | null;
  currency_code?: string | null;
  in_stock?: boolean;
  score_reason_tags?: string[];
};

export type OmafitCatalogSearchResult = {
  candidates: OmafitCatalogCandidate[];
  store_profile?: import('./storeProfile').StoreProfile | null;
  error: string | null;
  /** HTTP status da última resposta (útil em diagnóstico). */
  httpStatus: number;
  /** Resumo para logs (chaves JSON, mensagem de erro do servidor, etc.). */
  diagnostic?: string;
  /** Preenchido pelo servidor quando candidates=[] (só diagnóstico). */
  debug?: Record<string, unknown>;
};

function pickString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function normalizeCandidateRow(row: unknown): OmafitCatalogCandidate | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  const handle = pickString(o.handle ?? o.product_handle ?? o.slug);
  const title = pickString(o.title ?? o.name ?? o.product_title) || handle;
  const url = pickString(o.url ?? o.product_url ?? o.link);
  const image_url = pickString(o.image_url ?? o.image ?? o.featured_image ?? o.thumbnail);
  if (!handle) return null;
  const priceRaw = o.price_amount ?? o.priceAmount;
  const price_amount =
    priceRaw != null && Number.isFinite(Number(priceRaw)) ? Number(priceRaw) : null;
  const tags = Array.isArray(o.tags) ? o.tags.map((t) => String(t)) : [];
  const inStockRaw = o.in_stock ?? o.inStock;
  const in_stock =
    inStockRaw === true || inStockRaw === 'true'
      ? true
      : inStockRaw === false || inStockRaw === 'false'
        ? false
        : undefined;
  const reasonTags = Array.isArray(o.score_reason_tags)
    ? o.score_reason_tags.map((t) => String(t)).filter(Boolean)
    : [];
  return {
    handle,
    title,
    url: url || '#',
    image_url: image_url || '',
    product_type: pickString(o.product_type ?? o.productType) || undefined,
    tags: tags.length ? tags : undefined,
    price_amount,
    currency_code: pickString(o.currency_code ?? o.currencyCode) || null,
    ...(in_stock !== undefined ? { in_stock } : {}),
    ...(reasonTags.length ? { score_reason_tags: reasonTags } : {}),
  };
}

function extractCandidatesFromJson(json: unknown): OmafitCatalogCandidate[] {
  if (!json || typeof json !== 'object') return [];
  const root = json as Record<string, unknown>;

  const tryArray = (arr: unknown): OmafitCatalogCandidate[] => {
    if (!Array.isArray(arr)) return [];
    const out: OmafitCatalogCandidate[] = [];
    for (const item of arr) {
      const c = normalizeCandidateRow(item);
      if (c) out.push(c);
    }
    return out;
  };

  let from = tryArray(root.candidates);
  if (from.length) return from;

  const data = root.data;
  if (data && typeof data === 'object') {
    from = tryArray((data as Record<string, unknown>).candidates);
    if (from.length) return from;
    from = tryArray((data as Record<string, unknown>).products);
    if (from.length) return from;
  }

  from = tryArray(root.results);
  if (from.length) return from;
  from = tryArray(root.products);
  if (from.length) return from;

  return [];
}

function buildCatalogSearchDiagnostic(
  httpStatus: number,
  json: unknown,
  error: string | null
): string {
  const keys = json && typeof json === 'object' ? Object.keys(json as object).join(', ') : '(parse falhou)';
  const root = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  const msg = pickString(root.message ?? root.detail ?? root.reason);
  const err =
    typeof root.error === 'string'
      ? pickString(root.error)
      : root.error != null
        ? String(root.error)
        : error || '';
  const parts = [`http=${httpStatus}`, `jsonKeys=[${keys}]`];
  if (err) parts.push(`error=${err}`);
  if (msg) parts.push(`message=${msg}`);
  return parts.join(' | ');
}

/**
 * Canonical HMAC para POST /api/widget/catalog-search.
 * Deve coincidir com `buildCatalogSearchCanonicalStrings` na app Omafit.
 */
export function buildCatalogSearchCanonical(params: {
  collection_handles: string;
  collection_type: string;
  exclude_handle: string;
  product_name: string;
  public_id: string;
  shop_domain: string;
  timestamp: string;
  user_message: string;
  shopper_gender: string;
  chart_gender_scope: string;
  country_code?: string;
  occasion_ids?: string;
  gift_recipient?: string;
  store_audience?: string;
  effective_search_gender?: string;
  exclude_handles?: string;
  sort_price_asc?: string;
  search_terms_boost?: string;
  price_band?: string;
  store_profile_source?: string;
}): string {
  const base = [
    `collection_handles=${params.collection_handles}`,
    `collection_type=${params.collection_type}`,
    `exclude_handle=${params.exclude_handle}`,
    `product_name=${params.product_name}`,
    `public_id=${params.public_id}`,
    `shop_domain=${params.shop_domain}`,
    `timestamp=${params.timestamp}`,
    `user_message=${params.user_message}`,
    `shopper_gender=${params.shopper_gender}`,
    `chart_gender_scope=${params.chart_gender_scope}`,
  ].join('|');
  const stylist = [
    `country_code=${params.country_code ?? ''}`,
    `occasion_ids=${params.occasion_ids ?? ''}`,
    `gift_recipient=${params.gift_recipient ?? ''}`,
    `store_audience=${params.store_audience ?? ''}`,
    `effective_search_gender=${params.effective_search_gender ?? ''}`,
    `exclude_handles=${params.exclude_handles ?? ''}`,
    `sort_price_asc=${params.sort_price_asc ?? '0'}`,
    `search_terms_boost=${params.search_terms_boost ?? ''}`,
    `price_band=${params.price_band ?? ''}`,
    `store_profile_source=${params.store_profile_source ?? ''}`,
  ].join('|');
  return `${base}|${stylist}`;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function fetchOmafitCatalogSearch(params: {
  baseUrl: string;
  secret: string;
  shopDomain: string;
  publicId: string;
  userMessage: string;
  excludeHandle: string;
  productName: string;
  collectionType: string;
  /** Perfil no provador: male | female | unisex */
  shopperGender?: string;
  /** Escopo da tabela de medidas do lojista: both | male | female */
  chartGenderScope?: string;
  /** Handles Shopify das coleções do produto em try-on (inclui produtos da mesma coleção). */
  collectionHandles?: string[];
  stylistBrief?: import('./stylistContext').StylistBrief;
}): Promise<OmafitCatalogSearchResult> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const collection_type = String(params.collectionType || 'upper');
  const exclude_handle = String(params.excludeHandle || '');
  const product_name = String(params.productName || '');
  const public_id = String(params.publicId || '');
  const shop_domain = String(params.shopDomain || '');
  const user_message = String(params.userMessage || '');
  const shopper_gender = String(params.shopperGender || '').trim();
  const chart_gender_scope = String(params.chartGenderScope || 'both').trim();
  const collection_handles = [
    ...new Set(
      (params.collectionHandles || [])
        .map((h) => String(h || '').trim())
        .filter(Boolean)
    ),
  ].join(',');

  const briefParams = params.stylistBrief
    ? {
        country_code: params.stylistBrief.country_code,
        occasion_ids: params.stylistBrief.active_occasions.map((o) => o.id).join(','),
        gift_recipient: params.stylistBrief.gift_recipient,
        store_audience: params.stylistBrief.store_audience,
        effective_search_gender: params.stylistBrief.effective_search_gender,
        exclude_handles: params.stylistBrief.exclude_handles.join(','),
        sort_price_asc: params.stylistBrief.sort_price_asc ? '1' : '0',
        search_terms_boost: params.stylistBrief.search_terms_boost.join(','),
        price_band: params.stylistBrief.price_band,
        store_profile_source: params.stylistBrief.store_profile_source,
      }
    : {};

  const canonical = buildCatalogSearchCanonical({
    collection_handles,
    collection_type,
    exclude_handle,
    product_name,
    public_id,
    shop_domain,
    timestamp,
    user_message,
    shopper_gender,
    chart_gender_scope,
    ...briefParams,
  });

  const signature = await hmacSha256Hex(params.secret, canonical);

  const body = new URLSearchParams({
    collection_handles,
    collection_type,
    exclude_handle,
    product_name,
    public_id,
    shop_domain,
    timestamp,
    user_message,
    shopper_gender,
    chart_gender_scope,
    country_code: briefParams.country_code ?? '',
    occasion_ids: briefParams.occasion_ids ?? '',
    gift_recipient: briefParams.gift_recipient ?? '',
    store_audience: briefParams.store_audience ?? '',
    effective_search_gender: briefParams.effective_search_gender ?? '',
    exclude_handles: briefParams.exclude_handles ?? '',
    sort_price_asc: briefParams.sort_price_asc ?? '0',
    search_terms_boost: briefParams.search_terms_boost ?? '',
    price_band: briefParams.price_band ?? '',
    store_profile_source: briefParams.store_profile_source ?? '',
    signature,
  });

  const url = `${params.baseUrl.replace(/\/$/, '')}/api/widget/catalog-search`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (networkErr) {
    const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    return {
      candidates: [],
      error: 'network_error',
      httpStatus: 0,
      diagnostic: `fetch failed: ${msg} | dica=verifique CORS na app Omafit (Railway) e VITE_OMAFIT_APP_URL no widget`,
    };
  }

  let json: unknown = {};
  try {
    const text = await res.text();
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  const root = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  const serverError = root.error != null ? String(root.error) : null;
  const candidates = extractCandidatesFromJson(json);
  const debug: Record<string, unknown> | undefined =
    root.debug && typeof root.debug === 'object'
      ? (root.debug as Record<string, unknown>)
      : undefined;

  if (!res.ok) {
    const err = serverError || `http_${res.status}`;
    let hint = '';
    if (err === 'plan_required') {
      hint =
        ' | dica=consultor stylist exige plano Growth ou superior na loja (shopify_shops no Supabase)';
    } else if (err === 'bad_signature') {
      hint =
        ' | dica=confirme VITE_OMAFIT_WIDGET_HMAC_SECRET igual a WIDGET_CATALOG_HMAC_SECRET no Railway e redeploy da app Omafit';
    } else if (err === 'no_session') {
      hint =
        ' | dica=abra o app Omafit no admin Shopify desta loja (produção Railway) para criar sessão offline; confira DATABASE_URL no Railway';
    }
    return {
      candidates: [],
      error: err,
      httpStatus: res.status,
      diagnostic: buildCatalogSearchDiagnostic(res.status, json, err) + hint,
    };
  }

  const diagnostic = buildCatalogSearchDiagnostic(res.status, json, serverError);
  const debugSuffix = debug ? ` | debug=${JSON.stringify(debug)}` : '';

  return {
    candidates,
    store_profile: parseStoreProfileFromApi(json),
    error: serverError,
    httpStatus: res.status,
    diagnostic: diagnostic + debugSuffix,
    debug,
  };
}

export type OmafitSuggestionEventType = 'impression' | 'stylist_click' | 'atc';

function buildSuggestionEventCanonical(params: {
  event: OmafitSuggestionEventType;
  shop_domain: string;
  public_id: string;
  timestamp: string;
  impression_id: string;
  anchor_handle: string;
  suggested_handles?: string;
  suggested_handle?: string;
}): string | null {
  const types: OmafitSuggestionEventType[] = ['impression', 'stylist_click', 'atc'];
  if (!types.includes(params.event)) return null;
  if (params.event === 'impression') {
    const suggested_handles = String(params.suggested_handles ?? '');
    return [
      'suggestion_event_v1',
      `event=${params.event}`,
      `anchor_handle=${params.anchor_handle}`,
      `impression_id=${params.impression_id}`,
      `public_id=${params.public_id}`,
      `shop_domain=${params.shop_domain}`,
      `suggested_handles=${suggested_handles}`,
      `timestamp=${params.timestamp}`,
    ].join('|');
  }
  const suggested_handle = String(params.suggested_handle ?? '');
  return [
    'suggestion_event_v1',
    `event=${params.event}`,
    `anchor_handle=${params.anchor_handle}`,
    `impression_id=${params.impression_id}`,
    `public_id=${params.public_id}`,
    `shop_domain=${params.shop_domain}`,
    `suggested_handle=${suggested_handle}`,
    `timestamp=${params.timestamp}`,
  ].join('|');
}

/**
 * Telemetria de sugestões estilista (app Omafit /api/widget/suggestion-events).
 */
export async function postOmafitSuggestionEvent(params: {
  baseUrl: string;
  secret: string;
  shopDomain: string;
  publicId: string;
  event: OmafitSuggestionEventType;
  impressionId: string;
  anchorHandle: string;
  /** Só para event=impression — handles normalizados e ordenados no corpo. */
  suggestedHandles?: string[];
  /** Só para stylist_click / atc */
  suggestedHandle?: string;
}): Promise<{ ok: boolean; httpStatus: number; error?: string }> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const shop_domain = String(params.shopDomain || '').trim();
  const public_id = String(params.publicId || '').trim();
  const impression_id = String(params.impressionId || '').trim();
  const anchor_handle = String(params.anchorHandle || '').trim();

  let suggested_handles: string | undefined;
  let suggested_handle: string | undefined;
  if (params.event === 'impression') {
    const sorted = [
      ...new Set(
        (params.suggestedHandles || [])
          .map((h) => String(h || '').trim().toLowerCase())
          .filter(Boolean)
      ),
    ].sort();
    suggested_handles = JSON.stringify(sorted);
  } else {
    suggested_handle = String(params.suggestedHandle || '').trim();
  }

  const canonical = buildSuggestionEventCanonical({
    event: params.event,
    shop_domain,
    public_id,
    timestamp,
    impression_id,
    anchor_handle,
    suggested_handles,
    suggested_handle,
  });
  if (!canonical) {
    return { ok: false, httpStatus: 0, error: 'bad_event' };
  }

  const signature = await hmacSha256Hex(params.secret, canonical);

  const body = new URLSearchParams({
    event: params.event,
    shop_domain,
    public_id,
    timestamp,
    impression_id,
    anchor_handle,
    signature,
  });
  if (params.event === 'impression') {
    body.set('suggested_handles', suggested_handles || '[]');
  } else {
    body.set('suggested_handle', suggested_handle || '');
  }

  const url = `${params.baseUrl.replace(/\/$/, '')}/api/widget/suggestion-events`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  let json: { ok?: boolean; error?: string } = {};
  try {
    json = (await res.json()) as { ok?: boolean; error?: string };
  } catch {
    json = {};
  }

  if (!res.ok || json.ok === false) {
    return {
      ok: false,
      httpStatus: res.status,
      error: json.error || `http_${res.status}`,
    };
  }
  return { ok: true, httpStatus: res.status };
}

export async function fetchOmafitProductByHandle(params: {
  baseUrl: string;
  secret: string;
  shopDomain: string;
  publicId: string;
  handle: string;
}): Promise<{
  product: {
    id: string;
    handle: string;
    title: string;
    product_type: string;
    url: string;
    images: string[];
    image_url: string;
    catalog: { sizes: string[]; colors: string[]; variants: any[] };
    collection_handles?: string[];
  } | null;
  error: string | null;
}> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const handle = String(params.handle || '').trim();
  const public_id = String(params.publicId || '');
  const shop_domain = String(params.shopDomain || '');

  const canonical = [
    `handle=${handle}`,
    `public_id=${public_id}`,
    `shop_domain=${shop_domain}`,
    `timestamp=${timestamp}`,
  ].join('|');

  const signature = await hmacSha256Hex(params.secret, canonical);

  const u = new URL(`${params.baseUrl.replace(/\/$/, '')}/api/widget/product-by-handle`);
  u.searchParams.set('shop_domain', shop_domain);
  u.searchParams.set('public_id', public_id);
  u.searchParams.set('handle', handle);
  u.searchParams.set('timestamp', timestamp);
  u.searchParams.set('signature', signature);

  const res = await fetch(u.toString(), { method: 'GET' });
  const json = (await res.json().catch(() => ({}))) as {
    product?: {
      id: string;
      handle: string;
      title: string;
      product_type: string;
      url: string;
      images: string[];
      image_url: string;
      catalog: { sizes: string[]; colors: string[]; variants: any[] };
      collection_handles?: string[];
    } | null;
    error?: string | null;
  };

  if (!res.ok) {
    return { product: null, error: json.error || `http_${res.status}` };
  }

  return { product: json.product ?? null, error: json.error ?? null };
}
