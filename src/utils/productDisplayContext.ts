const GENERIC_PRODUCT_NAMES = new Set([
  'produto',
  'product',
  'producto',
  'item',
  'peça',
  'peca',
  'esta peça',
  'esta peca',
  'this item',
  'esta prenda',
  'produto da página',
  'produto da pagina',
]);

export function isGenericProductName(name: string | null | undefined): boolean {
  const n = String(name || '').trim();
  if (!n) return true;
  return GENERIC_PRODUCT_NAMES.has(n.toLowerCase());
}

/** Escolhe o primeiro nome de produto útil entre várias fontes. */
export function resolveDisplayProductName(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const n = String(c || '').trim();
    if (n && !isGenericProductName(n)) return n;
  }
  return '';
}

export function normalizeColorHex(hex: string | null | undefined): string {
  const raw = String(hex || '').trim().replace(/^#/, '').toLowerCase();
  if (!raw) return '';
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  if (raw.length === 6 && /^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  return '';
}

export function isColorHexValue(value: string | null | undefined): boolean {
  const n = normalizeColorHex(value);
  return Boolean(n);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeColorHex(hex);
  if (!n) return null;
  const h = n.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

const NAMED_PALETTE: Array<{ hex: string; pt: string; es: string; en: string }> = [
  { hex: '#000000', pt: 'preto', es: 'negro', en: 'black' },
  { hex: '#ffffff', pt: 'branco', es: 'blanco', en: 'white' },
  { hex: '#808080', pt: 'cinza', es: 'gris', en: 'gray' },
  { hex: '#c0c0c0', pt: 'cinza claro', es: 'gris claro', en: 'light gray' },
  { hex: '#800000', pt: 'marrom', es: 'marrón', en: 'brown' },
  { hex: '#a52a2a', pt: 'marrom', es: 'marrón', en: 'brown' },
  { hex: '#8b4513', pt: 'marrom', es: 'marrón', en: 'brown' },
  { hex: '#ff0000', pt: 'vermelho', es: 'rojo', en: 'red' },
  { hex: '#ffa500', pt: 'laranja', es: 'naranja', en: 'orange' },
  { hex: '#ffd700', pt: 'dourado', es: 'dorado', en: 'gold' },
  { hex: '#ffff00', pt: 'amarelo', es: 'amarillo', en: 'yellow' },
  { hex: '#008000', pt: 'verde', es: 'verde', en: 'green' },
  { hex: '#0000ff', pt: 'azul', es: 'azul', en: 'blue' },
  { hex: '#000080', pt: 'azul marinho', es: 'azul marino', en: 'navy' },
  { hex: '#ffc0cb', pt: 'rosa', es: 'rosa', en: 'pink' },
  { hex: '#f5f5dc', pt: 'bege', es: 'beige', en: 'beige' },
  { hex: '#deb887', pt: 'bege', es: 'beige', en: 'beige' },
  { hex: '#c4bcae', pt: 'bege', es: 'beige', en: 'beige' },
  { hex: '#d2b48c', pt: 'bege', es: 'beige', en: 'beige' },
  { hex: '#e8dcc8', pt: 'bege claro', es: 'beige claro', en: 'light beige' },
  { hex: '#bc8f8f', pt: 'rosé', es: 'rosado', en: 'dusty rose' },
  { hex: '#708090', pt: 'cinza azulado', es: 'gris azulado', en: 'slate gray' },
  { hex: '#2f4f4f', pt: 'verde escuro', es: 'verde oscuro', en: 'dark green' },
  { hex: '#fffdd0', pt: 'creme', es: 'crema', en: 'cream' },
  { hex: '#faf0e6', pt: 'off-white', es: 'off-white', en: 'off-white' },
];

export function hexToApproxColorLabel(
  hex: string | null | undefined,
  language: 'pt' | 'es' | 'en' = 'pt'
): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  let best = NAMED_PALETTE[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const entry of NAMED_PALETTE) {
    const entryRgb = hexToRgb(entry.hex);
    if (!entryRgb) continue;
    const dist = colorDistance(rgb, entryRgb);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  if (language === 'es') return best.es;
  if (language === 'en') return best.en;
  return best.pt;
}

export function colorLabelFromVariantOptions(
  variantOptions: Record<string, string> | null | undefined
): string {
  if (!variantOptions || typeof variantOptions !== 'object') return '';
  for (const [key, value] of Object.entries(variantOptions)) {
    const k = String(key || '').toLowerCase();
    const v = String(value || '').trim();
    if (!v || isColorHexValue(v)) continue;
    if (/color|cor|colour|couleur|farbe/.test(k)) return v;
  }
  for (const value of Object.values(variantOptions)) {
    const v = String(value || '').trim();
    if (!v || isColorHexValue(v)) continue;
    if (/^#?[0-9a-f]{3,8}$/i.test(v)) continue;
    if (/\b(preto|branco|bege|azul|verde|vermelho|rosa|cinza|marrom|nude|off|black|white|beige|navy|grey|gray)\b/i.test(v)) {
      return v;
    }
  }
  return '';
}

export function resolveSelectedColorLabel(params: {
  hex?: string | null;
  catalogColors?: string[];
  variantOptions?: Record<string, string>;
  language?: 'pt' | 'es' | 'en';
  explicitLabel?: string | null;
}): string {
  const lang = params.language || 'pt';
  const explicit = String(params.explicitLabel || '').trim();
  if (explicit && !isColorHexValue(explicit)) return explicit;

  const fromVariant = colorLabelFromVariantOptions(params.variantOptions);
  if (fromVariant) return fromVariant;

  const catalog = (params.catalogColors || []).map((c) => String(c || '').trim()).filter(Boolean);
  const nonHexCatalog = catalog.filter((c) => !isColorHexValue(c));
  if (nonHexCatalog.length === 1) return nonHexCatalog[0];

  const hexLabel = hexToApproxColorLabel(params.hex, lang);
  if (hexLabel) return hexLabel;

  if (nonHexCatalog.length > 0) return nonHexCatalog[0];
  return '';
}
