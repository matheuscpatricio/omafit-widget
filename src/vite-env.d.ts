/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OMAFIT_APP_URL?: string;
  /** Mesmo valor que WIDGET_CATALOG_HMAC_SECRET na app Omafit (Railway). */
  readonly VITE_OMAFIT_WIDGET_HMAC_SECRET?: string;
  /** Alias opcional do segredo acima (nome alinhado ao servidor). */
  readonly VITE_WIDGET_CATALOG_HMAC_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __omafitArStart?: () => void;
}
