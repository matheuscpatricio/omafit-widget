export type OmafitCatalogCandidate = {
  handle: string;
  title: string;
  url: string;
  image_url: string;
};

export type OmafitCatalogSearchResult = {
  candidates: OmafitCatalogCandidate[];
  error: string | null;
  /** HTTP status da última resposta (útil em diagnóstico). */
  httpStatus: number;
  /** Resumo para logs (chaves JSON, mensagem de erro do servidor, etc.). */
  diagnostic?: string;
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
  return { handle, title, url: url || '#', image_url: image_url || '' };
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
}): Promise<OmafitCatalogSearchResult> {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const collection_type = String(params.collectionType || 'upper');
  const exclude_handle = String(params.excludeHandle || '');
  const product_name = String(params.productName || '');
  const public_id = String(params.publicId || '');
  const shop_domain = String(params.shopDomain || '');
  const user_message = String(params.userMessage || '');

  const canonical = [
    `collection_type=${collection_type}`,
    `exclude_handle=${exclude_handle}`,
    `product_name=${product_name}`,
    `public_id=${public_id}`,
    `shop_domain=${shop_domain}`,
    `timestamp=${timestamp}`,
    `user_message=${user_message}`,
  ].join('|');

  const signature = await hmacSha256Hex(params.secret, canonical);

  const body = new URLSearchParams({
    collection_type,
    exclude_handle,
    product_name,
    public_id,
    shop_domain,
    timestamp,
    user_message,
    signature,
  });

  const url = `${params.baseUrl.replace(/\/$/, '')}/api/widget/catalog-search`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

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

  if (!res.ok) {
    const err = serverError || `http_${res.status}`;
    return {
      candidates: [],
      error: err,
      httpStatus: res.status,
      diagnostic: buildCatalogSearchDiagnostic(res.status, json, err),
    };
  }

  return {
    candidates,
    error: serverError,
    httpStatus: res.status,
    diagnostic: buildCatalogSearchDiagnostic(res.status, json, serverError),
  };
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
    } | null;
    error?: string | null;
  };

  if (!res.ok) {
    return { product: null, error: json.error || `http_${res.status}` };
  }

  return { product: json.product ?? null, error: json.error ?? null };
}
