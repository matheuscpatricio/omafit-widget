export type OmafitCatalogCandidate = {
  handle: string;
  title: string;
  url: string;
  image_url: string;
};

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
}): Promise<{ candidates: OmafitCatalogCandidate[]; error: string | null }> {
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

  const json = (await res.json().catch(() => ({}))) as {
    candidates?: OmafitCatalogCandidate[];
    error?: string | null;
  };

  if (!res.ok) {
    return { candidates: [], error: json.error || `http_${res.status}` };
  }

  return {
    candidates: Array.isArray(json.candidates) ? json.candidates : [],
    error: json.error ?? null,
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
