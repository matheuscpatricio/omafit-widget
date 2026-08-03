import type { SupabaseClient } from '@supabase/supabase-js';

export type SizeChartRecord = {
  id: string;
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
  'id, collection_id, collection_handle, product_handle, gender, shop_domain, sizes, measurement_refs, collection_type, collection_elasticity';

/**
 * Resolve a linha de size_charts na ordem:
 * 1) product_handle
 * 2) collection_handle (só linhas sem product_handle)
 * 3) padrão da loja (ambos vazios)
 * Depois tenta o mesmo cascade com gender=unisex (se o pedido não for unisex).
 * Se `gender` for vazio, não filtra gênero (útil para calçados).
 */
export async function resolveSizeChartRecord(
  supabase: SupabaseClient,
  opts: {
    shopDomain: string;
    gender?: string | null;
    productHandle?: string | null;
    collectionHandle?: string | null;
    collectionId?: string | null;
  }
): Promise<{ record: SizeChartRecord | null; error: unknown }> {
  const shop = String(opts.shopDomain || '').trim();
  if (!shop) return { record: null, error: null };

  const product = String(opts.productHandle || '').trim();
  const collection = String(opts.collectionHandle || '').trim();
  const collectionId = String(opts.collectionId || '').trim();
  const gender = String(opts.gender || '').trim();
  const genders: Array<string | null> = !gender
    ? [null]
    : gender === 'unisex'
      ? ['unisex']
      : [gender, 'unisex'];

  let lastError: unknown = null;

  for (const g of genders) {
    if (product) {
      let q = supabase
        .from('size_charts')
        .select(CHART_SELECT)
        .eq('shop_domain', shop)
        .eq('product_handle', product)
        .limit(1);
      if (g) q = q.eq('gender', g);
      const { data, error } = await q.maybeSingle();
      if (error) lastError = error;
      else if (data) return { record: data as SizeChartRecord, error: null };
    }

    if (collection) {
      let q = supabase
        .from('size_charts')
        .select(CHART_SELECT)
        .eq('shop_domain', shop)
        .eq('collection_handle', collection)
        .eq('product_handle', '')
        .limit(1);
      if (g) q = q.eq('gender', g);
      const { data, error } = await q.maybeSingle();
      if (error) lastError = error;
      else if (data) return { record: data as SizeChartRecord, error: null };
    } else if (collectionId) {
      let q = supabase
        .from('size_charts')
        .select(CHART_SELECT)
        .eq('collection_id', collectionId)
        .limit(1);
      if (g) q = q.eq('gender', g);
      const { data, error } = await q.maybeSingle();
      if (error) lastError = error;
      else if (data) return { record: data as SizeChartRecord, error: null };
    }

    let q = supabase
      .from('size_charts')
      .select(CHART_SELECT)
      .eq('shop_domain', shop)
      .eq('collection_handle', '')
      .eq('product_handle', '')
      .limit(1);
    if (g) q = q.eq('gender', g);
    const { data, error } = await q.maybeSingle();
    if (error) lastError = error;
    else if (data) return { record: data as SizeChartRecord, error: null };
  }

  return { record: null, error: lastError };
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
