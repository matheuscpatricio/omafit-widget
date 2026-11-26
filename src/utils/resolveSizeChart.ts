import type { SupabaseClient } from '@supabase/supabase-js';

export type SizeChartRecord = {
  id: string;
  user_id?: string | null;
  shop_domain?: string | null;
  collection_id?: string | null;
  collection_handle?: string | null;
  product_handle?: string | null;
  gender?: string | null;
  sizes?: unknown;
  measurement_refs?: unknown;
  collection_type?: string | null;
  collection_elasticity?: string | null;
};

const CHART_SELECT =
  'id, user_id, collection_id, collection_handle, product_handle, gender, shop_domain, sizes, measurement_refs, collection_type, collection_elasticity';

export function isBlankChartText(value: string | null | undefined): boolean {
  return !String(value || '').trim();
}

function gendersToTry(gender: string): Array<string | null> {
  if (!gender) return [null];
  if (gender === 'unisex') return ['unisex'];
  return [gender, 'unisex'];
}

export function chartVisibleForStore(
  row: SizeChartRecord,
  shopDomain: string,
  ownerUserId?: string | null
): boolean {
  const domain = String(row.shop_domain || '').trim();
  if (domain && domain === shopDomain) return true;
  if (!ownerUserId || row.user_id !== ownerUserId) return false;
  return !domain || domain === shopDomain;
}

/**
 * Entre as linhas já filtradas por loja ou dono, escolhe produto, coleção e
 * tabela padrão. Handle vazio e NULL contam como “sem handle”: o dashboard
 * grava NULL, e o filtro antigo `eq ''` não encontrava essa linha.
 */
export function pickSizeChart(
  rows: SizeChartRecord[],
  opts: {
    shopDomain: string;
    ownerUserId?: string | null;
    gender?: string | null;
    productHandle?: string | null;
    collectionHandle?: string | null;
    collectionId?: string | null;
  }
): SizeChartRecord | null {
  const shop = String(opts.shopDomain || '').trim();
  const product = String(opts.productHandle || '').trim();
  const collection = String(opts.collectionHandle || '').trim();
  const collectionId = String(opts.collectionId || '').trim();
  const visible = rows.filter((row) => chartVisibleForStore(row, shop, opts.ownerUserId));

  for (const gender of gendersToTry(String(opts.gender || '').trim())) {
    const pool = gender ? visible.filter((row) => row.gender === gender) : visible;
    if (product) {
      const byProduct = pool.find((row) => String(row.product_handle || '').trim() === product);
      if (byProduct) return byProduct;
    }
    if (collection) {
      const byCollection = pool.find(
        (row) =>
          String(row.collection_handle || '').trim() === collection && isBlankChartText(row.product_handle)
      );
      if (byCollection) return byCollection;
    } else if (collectionId) {
      const byId = pool.find((row) => String(row.collection_id || '') === collectionId);
      if (byId) return byId;
    }
    const fallback = pool.find(
      (row) =>
        isBlankChartText(row.collection_handle) &&
        isBlankChartText(row.product_handle) &&
        !row.collection_id
    );
    if (fallback) return fallback;
  }
  return null;
}

/**
 * Resolve a linha de size_charts na ordem:
 * 1) product_handle
 * 2) collection_handle (só linhas sem product_handle)
 * 3) padrão da loja (ambos vazios)
 * Depois tenta o mesmo cascade com gender=unisex (se o pedido não for unisex).
 * Se `gender` for vazio, não filtra gênero (útil para calçados).
 */
export async function lookupWidgetOwnerId(
  supabase: SupabaseClient,
  publicId: string | null | undefined
): Promise<string | null> {
  const pub = String(publicId || '').trim();
  if (!pub) return null;
  const { data, error } = await supabase.rpc('widget_owner_id', { p_public_id: pub });
  if (error || !data) return null;
  return String(data);
}

export async function resolveSizeChartRecord(
  supabase: SupabaseClient,
  opts: {
    shopDomain: string;
    ownerUserId?: string | null;
    publicId?: string | null;
    gender?: string | null;
    productHandle?: string | null;
    collectionHandle?: string | null;
    collectionId?: string | null;
  }
): Promise<{ record: SizeChartRecord | null; error: unknown }> {
  const shop = String(opts.shopDomain || '').trim();
  if (!shop) return { record: null, error: null };

  let ownerUserId = opts.ownerUserId || null;
  if (!ownerUserId && opts.publicId) {
    ownerUserId = await lookupWidgetOwnerId(supabase, opts.publicId);
  }

  let query = supabase.from('size_charts').select(CHART_SELECT);
  if (ownerUserId) {
    query = query.or(`shop_domain.eq.${shop},user_id.eq.${ownerUserId}`);
  } else {
    query = query.eq('shop_domain', shop);
  }
  const { data, error } = await query.limit(80);
  if (error) return { record: null, error };
  return {
    record: pickSizeChart((data || []) as SizeChartRecord[], { ...opts, shopDomain: shop, ownerUserId }),
    error: null,
  };
}

/** Converte a coluna JSONB `sizes` (admin) para o formato do SizeCalculator. */
export function mapSizeChartSizesToEntries(
  sizes: unknown
): Array<Record<string, string | undefined>> {
  if (!Array.isArray(sizes) || sizes.length === 0) return [];

  return sizes
    .map((entry: any) => {
      const resolvedSize =
        entry?.size ?? entry?.size_name ?? entry?.name ?? entry?.label ?? '';
      const peito =
        entry?.peito?.toString() ||
        entry?.bust?.toString() ||
        entry?.chest?.toString() ||
        undefined;
      const cintura = entry?.cintura?.toString() || entry?.waist?.toString() || undefined;
      const quadril =
        entry?.quadril?.toString() ||
        entry?.hips?.toString() ||
        entry?.hip?.toString() ||
        undefined;
      const comprimento =
        entry?.comprimento?.toString() || entry?.length?.toString() || undefined;
      const mapped: Record<string, string | undefined> = {
        size: String(resolvedSize),
        peito,
        chest: peito,
        cintura,
        waist: cintura,
        quadril,
        hip: quadril,
        comprimento,
        length: comprimento,
      };
      if (entry && typeof entry === 'object') {
        Object.keys(entry).forEach((key) => {
          if (['size', 'size_name', 'name', 'label', 'id'].includes(key)) return;
          if (mapped[key] != null && mapped[key] !== '') return;
          const val = entry[key];
          if (val == null || val === '') return;
          mapped[key] = String(val);
        });
      }
      return mapped;
    })
    .filter((row) => String(row.size || '').trim() !== '');
}
