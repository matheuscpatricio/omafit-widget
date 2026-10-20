import type { StylistChatMessage, StylistLanguage, SuggestedProductCard } from './messages';

export type StylistProductRef = {
  handle: string;
  title?: string;
  variant_id?: string;
  description?: string;
  collection_type?: string;
};

export type StylistStylePreferences = {
  keywords: string[];
  sort_price_asc: boolean;
  occasion?: string;
  gift_recipient?: string;
};

/**
 * Consentimentos pertinentes — sem persistir fotos/áudios sem necessidade.
 * Voice é futuro; default false até o utilizador optar.
 */
export type StylistConsents = {
  /** Processamento de foto para try-on / sizing (já implícito no fluxo). */
  photo_processing: boolean;
  /** Telemetria de sugestões (impression/click/atc). */
  analytics: boolean;
  /** Gravação/streaming de voz (ElevenLabs futuro) — never default true. */
  voice_recording: boolean;
};

/**
 * Modelo de sessão do Stylist — independente da modalidade de entrada.
 * session_id local pode diferir de analyticsSessionId (UUID tryon_sessions).
 */
export type StylistSession = {
  session_id: string;
  shop_domain: string;
  current_product: StylistProductRef | null;
  messages: StylistChatMessage[];
  style_preferences: StylistStylePreferences;
  recommended_size: string | null;
  recommended_products: SuggestedProductCard[];
  language: StylistLanguage;
  consents: StylistConsents;
  interaction_count: number;
  /** Espelha stylistOpeningExtrasConsumedRef: lead de tamanho + cards só na abertura. */
  opening_extras_consumed: boolean;
  /** UUID analytics (track-footwear-tryon), quando disponível. */
  analytics_session_id: string | null;
  updated_at: number;
};

export type CreateStylistSessionInput = {
  session_id?: string;
  shop_domain?: string;
  current_product?: StylistProductRef | null;
  language?: StylistLanguage;
  recommended_size?: string | null;
  consents?: Partial<StylistConsents>;
  analytics_session_id?: string | null;
};
