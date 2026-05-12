/**
 * Configuração do catálogo Omafit no widget (alinhada com Railway + Supabase).
 *
 * Segredo HMAC: use `VITE_OMAFIT_WIDGET_HMAC_SECRET` ou o alias `VITE_WIDGET_CATALOG_HMAC_SECRET`
 * (mesmo valor que `WIDGET_CATALOG_HMAC_SECRET` / `OMAFIT_WIDGET_HMAC_SECRET` na app Omafit).
 */
export function getOmafitCatalogRuntimeConfig(): {
  baseUrl: string;
  secret: string;
  isReady: boolean;
} {
  const baseUrl = String(import.meta.env.VITE_OMAFIT_APP_URL || '')
    .trim()
    .replace(/\/$/, '');
  const secret = String(
    import.meta.env.VITE_OMAFIT_WIDGET_HMAC_SECRET ||
      import.meta.env.VITE_WIDGET_CATALOG_HMAC_SECRET ||
      ''
  ).trim();

  return {
    baseUrl,
    secret,
    isReady: Boolean(baseUrl && secret),
  };
}
