import type {
  StylistChatMessage,
  StylistInputEvent,
  StylistLanguage,
  StylistSession,
  StylistStructuredAction,
  StylistVoiceOutputEvent,
  SuggestedProductCard,
} from '../types';
import { inputEventToProcessableText } from '../types';
import { buildChatHistoryForValidateSize, type ValidateSizeChatTurn } from './chatHistory';
import { buildAssistantFallbackMessage } from './fallbackMessages';
import { buildAssistantMessageFromActions } from './structuredResponse';

/**
 * Contexto de produto/loja injetado pelo host (TryOnWidget) — o motor não conhece React.
 * Autorização de plano Growth+ deve ser validada no backend (validate-size / omafit),
 * nunca só via stylistModeEnabled no frontend.
 */
export type StylistEngineHostContext = {
  shop_domain: string;
  public_id?: string;
  stylist_plan_authorized: boolean;
  product_handle?: string;
  product_name?: string;
  product_description?: string;
  recommended_size?: string | null;
  size_payload?: Record<string, unknown>;
  candidate_products?: SuggestedProductCard[];
};

export type StylistEngineTurnRequest = {
  session: StylistSession;
  input: StylistInputEvent;
  host: StylistEngineHostContext;
};

export type StylistEngineTurnResult = {
  session: StylistSession;
  assistant_message: StylistChatMessage;
  actions: StylistStructuredAction[];
  /** Payload pronto para validate-size (parcial) — host completa medidas/catálogo. */
  validate_size_chat_history: ValidateSizeChatTurn[];
  /** Eventos de voz futuros; vazio no path texto. */
  voice_output: StylistVoiceOutputEvent[];
  used_fallback: boolean;
};

/**
 * Interface do motor multimodal: mesma API para texto e voz.
 * Implementação completa (chamada validate-size + catalog) fica para etapas seguintes;
 * esta etapa define o contrato e um processador local (clarification/fallback-ready).
 */
export interface StylistEngine {
  processTurn(request: StylistEngineTurnRequest): Promise<StylistEngineTurnResult>;
}

export type StylistEngineDeps = {
  /**
   * Chamada remota (validate-size). Se falhar, o motor usa fallback textual.
   * O host/widget continua responsável pelo wiring atual em callGPTAssistant.
   */
  completeTurn?: (args: {
    session: StylistSession;
    userText: string;
    intention: 'custom' | 'add_to_cart' | 'complementary';
    host: StylistEngineHostContext;
    chat_history: ValidateSizeChatTurn[];
  }) => Promise<{
    text: string;
    actions?: StylistStructuredAction[];
    interaction_count?: number;
    recommended_size?: string | null;
    recommended_products?: SuggestedProductCard[];
  }>;
  now?: () => number;
};

/**
 * Motor mínimo: normaliza input (texto|voz), monta histórico, delega ou faz fallback.
 * Não integra ElevenLabs; voz parcial é ignorada.
 */
export function createStylistEngine(deps: StylistEngineDeps = {}): StylistEngine {
  const now = deps.now || (() => Date.now());

  return {
    async processTurn(request) {
      const processable = inputEventToProcessableText(request.input);
      const language: StylistLanguage = request.session.language;

      if (!processable) {
        const actions: StylistStructuredAction[] = [
          {
            type: 'text',
            content:
              language === 'en'
                ? 'Still listening…'
                : language === 'es'
                  ? 'Sigo escuchando…'
                  : 'Ainda a ouvir…',
          },
        ];
        const assistant_message = buildAssistantMessageFromActions(actions, now());
        return {
          session: request.session,
          assistant_message,
          actions,
          validate_size_chat_history: buildChatHistoryForValidateSize(request.session.messages),
          voice_output: [{ kind: 'voice_unavailable', reason: 'partial_or_empty_input' }],
          used_fallback: false,
        };
      }

      const userMessage: StylistChatMessage = {
        role: 'user',
        content: processable.text,
        timestamp: now(),
      };
      const messagesWithUser = [...request.session.messages, userMessage];
      const chat_history = buildChatHistoryForValidateSize(messagesWithUser, {
        currentUserUtterance: processable.text,
      });

      let used_fallback = false;
      let text: string;
      let actions: StylistStructuredAction[] = [];
      let interaction_count = request.session.interaction_count + 1;
      let recommended_size = request.session.recommended_size;
      let recommended_products = request.session.recommended_products;

      try {
        if (deps.completeTurn) {
          const remote = await deps.completeTurn({
            session: { ...request.session, messages: messagesWithUser },
            userText: processable.text,
            intention: processable.intention,
            host: request.host,
            chat_history,
          });
          text = String(remote.text || '').trim();
          actions = remote.actions || [];
          if (typeof remote.interaction_count === 'number') {
            interaction_count = remote.interaction_count;
          }
          if (remote.recommended_size !== undefined) {
            recommended_size = remote.recommended_size;
          }
          if (remote.recommended_products) {
            recommended_products = remote.recommended_products;
          }
        } else {
          throw new Error('no_complete_turn');
        }
        if (!text && !actions.length) {
          throw new Error('empty_assistant_response');
        }
      } catch {
        used_fallback = true;
        text = buildAssistantFallbackMessage({
          language,
          productName: request.host.product_name || request.session.current_product?.title,
          recommendedSize:
            request.host.recommended_size ?? request.session.recommended_size,
          allowOpeningExtras: !request.session.opening_extras_consumed,
        });
        actions = [{ type: 'text', content: text }];
      }

      if (!actions.some((a) => a.type === 'text') && text) {
        actions = [{ type: 'text', content: text }, ...actions];
      }

      const assistant_message = buildAssistantMessageFromActions(actions, now());
      if (!assistant_message.content && text) {
        assistant_message.content = text;
      }

      const session: StylistSession = {
        ...request.session,
        messages: [...messagesWithUser, assistant_message],
        interaction_count,
        recommended_size,
        recommended_products,
        opening_extras_consumed: true,
        updated_at: now(),
      };

      const voice_output: StylistVoiceOutputEvent[] =
        request.input.modality === 'voice' && assistant_message.content
          ? [{ kind: 'speak_text', text: assistant_message.content, language }]
          : [];

      return {
        session,
        assistant_message,
        actions,
        validate_size_chat_history: chat_history,
        voice_output,
        used_fallback,
      };
    },
  };
}
