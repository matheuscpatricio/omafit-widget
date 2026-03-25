import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ordena handles do mais específico ao menos (mesma regra de pickPreferredCollectionHandle).
 */
export function sortHandlesBySpecificityDesc(handles: string[]): string[] {
  const all = (handles || [])
    .map((h) => String(h || '').trim())
    .filter(Boolean);
  if (all.length === 0) return [];

  const unique: string[] = [];
  for (const h of all) {
    if (!unique.includes(h)) unique.push(h);
  }

  const lower = (s: string) => s.toLowerCase();

  const isRefinementOf = (maybeRefined: string, base: string): boolean => {
    const x = lower(maybeRefined);
    const b = lower(base);
    if (!b.length || b === x) return false;
    return x.startsWith(b + '-') || x.startsWith(b + '_');
  };

  const filtered = unique.filter((h) => {
    for (const other of unique) {
      if (other === h) continue;
      if (isRefinementOf(other, h)) return false;
    }
    return true;
  });

  const candidates = filtered.length > 0 ? filtered : unique;

  const scored = candidates.map((h, idx) => {
    const normalized = lower(h);
    const tokenCount = normalized.split(/[-_]+/).filter(Boolean).length;
    const isComposed = tokenCount > 1 ? 1 : 0;
    return { handle: h, idx, scoreA: isComposed, scoreB: tokenCount, scoreC: normalized.length };
  });

  scored.sort((a, b) => {
    if (b.scoreA !== a.scoreA) return b.scoreA - a.scoreA;
    if (b.scoreB !== a.scoreB) return b.scoreB - a.scoreB;
    if (b.scoreC !== a.scoreC) return b.scoreC - a.scoreC;
    return a.idx - b.idx;
  });

  return scored.map((s) => s.handle);
}

/**
 * Entre os handles do produto (ordenados do mais específico), escolhe o primeiro que
 * tenha size_chart salva no Supabase para a loja (e gênero: tenta o pedido, depois unisex).
 * Se `searchGender` for omitido/vazio, aceita qualquer linha com esse collection_handle.
 */
export async function resolveCollectionHandleWithSavedSizeChart(
  supabase: SupabaseClient,
  shopDomain: string,
  handlesOrderedMostSpecificFirst: string[],
  searchGender?: string | null
): Promise<string | null> {
  const ordered = handlesOrderedMostSpecificFirst
    .map((h) => String(h || '').trim())
    .filter(Boolean);
  if (!shopDomain?.trim() || ordered.length === 0) return null;

  const pickFirstPresent = (rows: { collection_handle: string | null }[] | null): string | null => {
    if (!rows?.length) return null;
    const found = new Set(
      rows
        .map((r) => r.collection_handle)
        .filter((h): h is string => typeof h === 'string' && h.trim() !== '')
    );
    for (const h of ordered) {
      if (found.has(h)) return h;
    }
    return null;
  };

  if (searchGender == null || String(searchGender).trim() === '') {
    const { data, error } = await supabase
      .from('size_charts')
      .select('collection_handle')
      .eq('shop_domain', shopDomain.trim())
      .in('collection_handle', ordered);

    if (error) {
      console.warn('resolveCollectionHandleWithSavedSizeChart (sem gênero):', error.message);
      return null;
    }
    return pickFirstPresent(data);
  }

  const gendersToTry =
    searchGender === 'unisex' ? ['unisex'] : [searchGender, 'unisex'];

  for (const g of gendersToTry) {
    const { data, error } = await supabase
      .from('size_charts')
      .select('collection_handle')
      .eq('shop_domain', shopDomain.trim())
      .in('collection_handle', ordered)
      .eq('gender', g);

    if (error) {
      console.warn('resolveCollectionHandleWithSavedSizeChart:', error.message);
      continue;
    }
    const chosen = pickFirstPresent(data);
    if (chosen) return chosen;
  }

  return null;
}

/**
 * Escolhe o handle de coleção mais específico para tabela de medidas:
 * - remove prefixos quando existe refinamento (ex.: "cuecas" se existe "cuecas-slips");
 * - entre handles restantes, prioriza mais segmentos (-/_), depois comprimento.
 */
export function pickPreferredCollectionHandle(
  handles: string[],
  fallbackHandle?: string | null
): string {
  const all = (handles || [])
    .map((h) => String(h || '').trim())
    .filter(Boolean)
    .concat(fallbackHandle ? [String(fallbackHandle).trim()].filter(Boolean) : []);

  if (all.length === 0) return '';

  const unique: string[] = [];
  for (const h of all) {
    if (!unique.includes(h)) unique.push(h);
  }

  const lower = (s: string) => s.toLowerCase();

  const isRefinementOf = (maybeRefined: string, base: string): boolean => {
    const x = lower(maybeRefined);
    const b = lower(base);
    if (!b.length || b === x) return false;
    return x.startsWith(b + '-') || x.startsWith(b + '_');
  };

  const filtered = unique.filter((h) => {
    for (const other of unique) {
      if (other === h) continue;
      if (isRefinementOf(other, h)) return false;
    }
    return true;
  });

  const candidates = filtered.length > 0 ? filtered : unique;

  const scored = candidates.map((h, idx) => {
    const normalized = lower(h);
    const tokenCount = normalized.split(/[-_]+/).filter(Boolean).length;
    const isComposed = tokenCount > 1 ? 1 : 0;
    return { handle: h, idx, scoreA: isComposed, scoreB: tokenCount, scoreC: normalized.length };
  });

  scored.sort((a, b) => {
    if (b.scoreA !== a.scoreA) return b.scoreA - a.scoreA;
    if (b.scoreB !== a.scoreB) return b.scoreB - a.scoreB;
    if (b.scoreC !== a.scoreC) return b.scoreC - a.scoreC;
    return a.idx - b.idx;
  });

  return scored[0]?.handle || String(fallbackHandle || '').trim() || '';
}

export function parseCollectionHandlesFromMessage(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
