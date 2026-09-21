/** Mesmo projecto/anon key já expostos em `public/omafit-widget.js` e `src/lib/supabase.ts`. */
const OMAFIT_SUPABASE_URL_FALLBACK = 'https://lhkgnirolvbmomeduoaj.supabase.co';
const OMAFIT_SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa2duaXJvbHZibW9tZWR1b2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NjE2NDYsImV4cCI6MjA2MzMzNzY0Nn0.aSBMJMT8TiAqvdO_Z9D_oINLaQrFMZIK5IEQJG6KaOI';

export function getSupabaseProjectUrl(): string {
  return String(import.meta.env.VITE_SUPABASE_URL || '').trim() || OMAFIT_SUPABASE_URL_FALLBACK;
}

export function getSupabaseAnonKey(): string {
  return String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim() || OMAFIT_SUPABASE_ANON_KEY_FALLBACK;
}

/** `tryon-status` lê o id no último segmento do path. */
export function getSupabaseFunctionUrl(name: string, pathSuffix?: string): string {
  const base = getSupabaseProjectUrl().replace(/\/$/, '');
  const fn = String(name || '').replace(/^\/+|\/+$/g, '');
  const suffix = pathSuffix ? `/${encodeURIComponent(String(pathSuffix))}` : '';
  return `${base}/functions/v1/${fn}${suffix}`;
}

export function getSupabaseFunctionHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  const key = getSupabaseAnonKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(extra || {}),
  };
}
