export function parseCollectionHandlesFromMessage(input: unknown): string[] {
  if (Array.isArray(input)) {
    return [...new Set(input.map((h) => String(h || '').trim()).filter(Boolean))];
  }
  const raw = String(input || '').trim();
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;|]/)
        .map((h) => h.trim())
        .filter(Boolean)
    ),
  ];
}

/** Une handles de coleção vindos do tema, URL, API e postMessage (sem duplicados). */
export function mergeShopifyCollectionHandles(
  ...groups: Array<string[] | string | null | undefined>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const list = Array.isArray(group)
      ? group
      : String(group || '')
          .split(/[,;|]/)
          .map((h) => h.trim())
          .filter(Boolean);
    for (const h of list) {
      const key = h.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(h);
      }
    }
  }
  return out.slice(0, 8);
}
