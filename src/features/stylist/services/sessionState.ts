import type {
  CreateStylistSessionInput,
  StylistChatMessage,
  StylistConsents,
  StylistLanguage,
  StylistProductRef,
  StylistSession,
  StylistStylePreferences,
  SuggestedProductCard,
} from '../types';

const DEFAULT_CONSENTS: StylistConsents = {
  photo_processing: false,
  analytics: true,
  voice_recording: false,
};

const DEFAULT_PREFERENCES: StylistStylePreferences = {
  keywords: [],
  sort_price_asc: false,
};

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11);
}

export function createStylistSession(input: CreateStylistSessionInput = {}): StylistSession {
  const now = Date.now();
  return {
    session_id: String(input.session_id || newSessionId()).trim() || newSessionId(),
    shop_domain: String(input.shop_domain || '').trim(),
    current_product: input.current_product ?? null,
    messages: [],
    style_preferences: { ...DEFAULT_PREFERENCES },
    recommended_size: input.recommended_size ?? null,
    recommended_products: [],
    language: input.language || 'pt',
    consents: { ...DEFAULT_CONSENTS, ...(input.consents || {}) },
    interaction_count: 0,
    opening_extras_consumed: false,
    analytics_session_id: input.analytics_session_id ?? null,
    updated_at: now,
  };
}

/**
 * Retoma uma sessão serializada (ex.: memória do parent / sessionStorage futuro).
 * Não rehidrata fotos nem áudio — apenas metadados e histórico textual.
 */
export function resumeStylistSession(
  snapshot: Partial<StylistSession> & { session_id: string },
  overrides: Partial<CreateStylistSessionInput> = {}
): StylistSession {
  const base = createStylistSession({
    session_id: snapshot.session_id,
    shop_domain: overrides.shop_domain ?? snapshot.shop_domain,
    current_product: overrides.current_product ?? snapshot.current_product ?? null,
    language: overrides.language ?? snapshot.language,
    recommended_size: overrides.recommended_size ?? snapshot.recommended_size ?? null,
    consents: { ...snapshot.consents, ...overrides.consents },
    analytics_session_id:
      overrides.analytics_session_id !== undefined
        ? overrides.analytics_session_id
        : snapshot.analytics_session_id ?? null,
  });

  return {
    ...base,
    messages: Array.isArray(snapshot.messages) ? [...snapshot.messages] : [],
    style_preferences: {
      ...DEFAULT_PREFERENCES,
      ...(snapshot.style_preferences || {}),
    },
    recommended_products: Array.isArray(snapshot.recommended_products)
      ? [...snapshot.recommended_products]
      : [],
    interaction_count:
      typeof snapshot.interaction_count === 'number' ? snapshot.interaction_count : 0,
    opening_extras_consumed: Boolean(snapshot.opening_extras_consumed),
    updated_at: Date.now(),
  };
}

export type StylistSessionAction =
  | { type: 'append_message'; message: StylistChatMessage }
  | { type: 'set_language'; language: StylistLanguage }
  | { type: 'set_product'; product: StylistProductRef | null }
  | { type: 'select_recommended_product'; handle: string }
  | { type: 'set_recommended_products'; products: SuggestedProductCard[] }
  | { type: 'set_recommended_size'; size: string | null }
  | { type: 'set_style_preferences'; preferences: Partial<StylistStylePreferences> }
  | { type: 'set_consents'; consents: Partial<StylistConsents> }
  | { type: 'set_interaction_count'; count: number }
  | { type: 'mark_opening_extras_consumed' }
  | { type: 'set_analytics_session_id'; id: string | null }
  | { type: 'set_shop_domain'; shop_domain: string }
  | { type: 'clear_messages' };

export function reduceStylistSession(
  session: StylistSession,
  action: StylistSessionAction
): StylistSession {
  const touch = (next: Partial<StylistSession>): StylistSession => ({
    ...session,
    ...next,
    updated_at: Date.now(),
  });

  switch (action.type) {
    case 'append_message':
      return touch({ messages: [...session.messages, action.message] });
    case 'set_language':
      return touch({ language: action.language });
    case 'set_product':
      return touch({ current_product: action.product });
    case 'select_recommended_product': {
      const handle = String(action.handle || '').trim().toLowerCase();
      const found = session.recommended_products.find(
        (p) => p.handle.trim().toLowerCase() === handle
      );
      if (!found) return session;
      return touch({
        current_product: {
          handle: found.handle,
          title: found.title,
          description: found.rationale,
        },
      });
    }
    case 'set_recommended_products':
      return touch({ recommended_products: [...action.products] });
    case 'set_recommended_size':
      return touch({ recommended_size: action.size });
    case 'set_style_preferences':
      return touch({
        style_preferences: { ...session.style_preferences, ...action.preferences },
      });
    case 'set_consents':
      return touch({ consents: { ...session.consents, ...action.consents } });
    case 'set_interaction_count':
      return touch({ interaction_count: Math.max(0, action.count) });
    case 'mark_opening_extras_consumed':
      return touch({ opening_extras_consumed: true });
    case 'set_analytics_session_id':
      return touch({ analytics_session_id: action.id });
    case 'set_shop_domain':
      return touch({ shop_domain: String(action.shop_domain || '').trim() });
    case 'clear_messages':
      return touch({
        messages: [],
        recommended_products: [],
        interaction_count: 0,
        opening_extras_consumed: false,
      });
    default:
      return session;
  }
}

/** Serialização segura para retoma — sem blobs de foto/áudio. */
export function serializeStylistSession(session: StylistSession): StylistSession {
  return {
    ...session,
    messages: session.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      ...(m.suggestedProducts ? { suggestedProducts: m.suggestedProducts } : {}),
      ...(m.stylistImpressionId ? { stylistImpressionId: m.stylistImpressionId } : {}),
      ...(m.stylistAnchorHandle ? { stylistAnchorHandle: m.stylistAnchorHandle } : {}),
      ...(m.structuredActions ? { structuredActions: m.structuredActions } : {}),
      // tryOnImageUrl omitido de propósito — não persistir imagens de pessoa
    })),
  };
}
