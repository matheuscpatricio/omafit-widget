/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OMAFIT_APP_URL?: string;
  /** Mesmo valor que WIDGET_CATALOG_HMAC_SECRET na app Omafit (Railway). */
  readonly VITE_OMAFIT_WIDGET_HMAC_SECRET?: string;
  /** Alias opcional do segredo acima (nome alinhado ao servidor). */
  readonly VITE_WIDGET_CATALOG_HMAC_SECRET?: string;
  /** `true` mostra o opt-in de e-mail em qualquer loja com consultor. */
  readonly VITE_EMAIL_MARKETING_ENABLED?: string;
  /** Lista de lojas (domínios) que podem coletar e-mail de marketing. */
  readonly VITE_EMAIL_MARKETING_SHOPS?: string;
  /** Alias legado de `VITE_EMAIL_MARKETING_ENABLED`. */
  readonly VITE_WHATSAPP_MARKETING_ENABLED?: string;
  /** Alias legado de `VITE_EMAIL_MARKETING_SHOPS`. */
  readonly VITE_WHATSAPP_PILOT_SHOPS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __omafitArStart?: () => void;
}
