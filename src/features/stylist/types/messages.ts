/**
 * Tipos de mensagem do AI Stylist — compatíveis com o chat atual em TryOnWidget.
 * Campos novos (ex.: structuredActions) são opcionais para não quebrar o render existente.
 */

export type StylistLanguage = 'pt' | 'es' | 'en';

export type SuggestedProductCard = {
  handle: string;
  title: string;
  image_url?: string;
  rationale?: string;
  price_amount?: number | null;
  currency_code?: string | null;
  price_label?: string;
};

/** Alias histórico usado por chatTryOnIntent / try-on por texto. */
export type SuggestedChatProduct = Pick<
  SuggestedProductCard,
  'handle' | 'title' | 'image_url'
>;

/**
 * Ações estruturadas anexadas a uma resposta (texto + UI/ações).
 * O motor de conversa produz estas ações independentemente da modalidade (texto/voz).
 */
export type StylistStructuredAction =
  | {
      type: 'text';
      content: string;
    }
  | {
      type: 'products';
      products: SuggestedProductCard[];
      impressionId?: string;
      anchorHandle?: string;
    }
  | {
      type: 'selection_options';
      options: Array<{ label: string; message: string }>;
    }
  | {
      type: 'request_try_on';
      handle: string;
      autoSubmit?: boolean;
    }
  | {
      type: 'cart_action';
      handle?: string;
      source: 'omafit-widget' | 'omafit-widget-suggested';
      variantId?: string;
    }
  | {
      type: 'end_conversation';
      reason?: string;
    };

/** Mensagem do thread — shape estável para UI e validate-size chat_history. */
export type StylistChatMessage = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
  /** Imagem do provador quando o try-on veio de uma sugestão no chat. */
  tryOnImageUrl?: string;
  tryOnResultVariant?: 'primary' | 'suggested';
  stylistImpressionId?: string;
  stylistAnchorHandle?: string;
  suggestedProducts?: SuggestedProductCard[];
  /** Separação conteúdo conversacional ↔ ações (preparação multimodal). */
  structuredActions?: StylistStructuredAction[];
};

/** Alias usado pelo TryOnWidget (mesmo shape). */
export type ChatMessage = StylistChatMessage;
