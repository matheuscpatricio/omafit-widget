/**
 * Manequins (Supabase Storage público). Ordem: mais magro → mais amplo.
 * Fonte única para URLs + pré-carga (evita drift com SizeCalculator).
 */
export const MANNEQUIN_STORAGE_ORIGIN = 'https://lhkgnirolvbmomeduoaj.supabase.co';

export const MANNEQUIN_URLS_MALE = [
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/Manequim%20Levemente%20Magro.jpg',
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasatletico.jpg',
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasgordinho.jpg',
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasforte.jpg',
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimmasgordo.jpg',
] as const;

export const MANNEQUIN_URLS_FEMALE = [
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemmagra.jpg',
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemombrolargo.jpg',
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemquadrillargo.jpg',
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfemcinturalarga.jpg',
  'https://lhkgnirolvbmomeduoaj.supabase.co/storage/v1/object/public/Manequins/manequimfembustolargo.jpg',
] as const;

const ALL_URLS: readonly string[] = [...MANNEQUIN_URLS_MALE, ...MANNEQUIN_URLS_FEMALE];

let preconnectInjected = false;
const preloadedUrls = new Set<string>();

export function ensureMannequinPreconnect(): void {
  if (typeof document === 'undefined' || preconnectInjected) return;
  preconnectInjected = true;
  const origin = MANNEQUIN_STORAGE_ORIGIN;
  const specs: Array<{ rel: string; crossOrigin?: string }> = [
    { rel: 'dns-prefetch' },
    { rel: 'preconnect', crossOrigin: 'anonymous' },
  ];
  for (const { rel, crossOrigin } of specs) {
    const id = `omafit-mannequin-${rel}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement('link');
    link.id = id;
    link.rel = rel;
    link.href = origin;
    if (crossOrigin) link.crossOrigin = crossOrigin;
    document.head.appendChild(link);
  }
}

/** Dispara fetch dos bytes; reutiliza cache HTTP do browser entre visitas. */
export function preloadMannequinUrls(urls: readonly string[]): void {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    if (preloadedUrls.has(url)) continue;
    preloadedUrls.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    const d = img.decode?.();
    if (d) void d.catch(() => {});
  }
}

export function preloadMannequinsForGender(gender: 'male' | 'female'): void {
  ensureMannequinPreconnect();
  preloadMannequinUrls(gender === 'male' ? MANNEQUIN_URLS_MALE : MANNEQUIN_URLS_FEMALE);
}

export function preloadAllMannequinSilhouettes(): void {
  ensureMannequinPreconnect();
  preloadMannequinUrls(ALL_URLS);
}
