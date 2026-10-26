import type { VoiceTransportEvent } from './types';

/**
 * Adapter do SDK `@elevenlabs/client` → `VoiceTransportEvent`.
 * O SDK é carregado sob demanda (import dinâmico) para não pesar o bundle
 * de quem nunca toca no microfone.
 */

export type VoiceClientToolHandler = (
  parameters: Record<string, unknown>
) => Promise<string | void> | string | void;

export type VoiceTransportStartOptions = {
  conversationToken: string;
  language: string;
  dynamicVariables: Record<string, string | number | boolean>;
  clientTools: Record<string, VoiceClientToolHandler>;
  onEvent: (event: VoiceTransportEvent) => void;
};

export type VoiceTransportHandle = {
  conversationId: string | null;
  end: () => Promise<void>;
  sendContextualUpdate: (text: string) => void;
  sendUserMessage: (text: string) => void;
  setMicMuted: (muted: boolean) => void;
};

export type VoiceTransport = {
  start: (opts: VoiceTransportStartOptions) => Promise<VoiceTransportHandle>;
};

type SdkConversation = {
  getId: () => string;
  endSession: () => Promise<void>;
  sendContextualUpdate: (text: string) => void;
  sendUserMessage: (text: string) => void;
  setMicMuted?: (muted: boolean) => void;
};

type SdkModule = {
  Conversation: { startSession: (opts: Record<string, unknown>) => Promise<SdkConversation> };
};

export type SdkLoader = () => Promise<SdkModule>;

const defaultLoader: SdkLoader = () => import('@elevenlabs/client') as unknown as Promise<SdkModule>;

export function createElevenLabsTransport(loadSdk: SdkLoader = defaultLoader): VoiceTransport {
  return {
    async start(opts) {
      const { Conversation } = await loadSdk();
      const emit = (e: VoiceTransportEvent) => {
        try {
          opts.onEvent(e);
        } catch (err) {
          console.warn('[stylist-voice] event handler failed', err);
        }
      };
      const now = () => Date.now();

      const clientTools: Record<string, (p: Record<string, unknown>) => Promise<string>> = {};
      for (const [name, handler] of Object.entries(opts.clientTools)) {
        clientTools[name] = async (parameters) => {
          const params = parameters && typeof parameters === 'object' ? parameters : {};
          emit({
            type: 'client_tool_call',
            tool_call_id: `${name}-${now()}`,
            tool_name: name,
            parameters: params,
            at: now(),
          });
          try {
            const out = await handler(params);
            return typeof out === 'string' ? out : 'ok';
          } catch (err) {
            emit({ type: 'error', message: `client_tool_failed:${name}`, at: now() });
            return `error: ${err instanceof Error ? err.message : 'failed'}`;
          }
        };
      }

      const conversation = await Conversation.startSession({
        conversationToken: opts.conversationToken,
        connectionType: 'webrtc',
        dynamicVariables: opts.dynamicVariables,
        overrides: { agent: { language: opts.language } },
        clientTools,
        onConnect: ({ conversationId }: { conversationId: string }) =>
          emit({ type: 'session_started', conversation_id: conversationId, at: now() }),
        onDisconnect: (details: { reason?: string }) =>
          emit({ type: 'session_ended', reason: String(details?.reason || 'disconnected'), at: now() }),
        onError: (message: string) => emit({ type: 'error', message: String(message), at: now() }),
        onStatusChange: ({ status }: { status: string }) => {
          if (status === 'connecting' || status === 'connected' || status === 'disconnected') {
            emit({ type: 'status', status, at: now() });
          }
        },
        onModeChange: ({ mode }: { mode: string }) =>
          emit({ type: 'mode', mode: mode === 'speaking' ? 'speaking' : 'listening', at: now() }),
        onMessage: (m: { message: string; role?: string; source?: string; response_id?: string }) => {
          const isUser = m.role === 'user' || m.source === 'user';
          if (isUser) {
            emit({ type: 'user_transcript', text: m.message, is_final: true, at: now() });
          } else {
            emit({ type: 'agent_response', text: m.message, response_id: String(m.response_id || ''), at: now() });
          }
        },
        onAgentChatResponsePart: (p: { text?: string; type?: string; response_id?: string }) =>
          emit({
            type: 'agent_response_part',
            text: String(p?.text || ''),
            response_id: String(p?.response_id || ''),
            phase: p?.type === 'start' || p?.type === 'stop' ? p.type : 'delta',
            at: now(),
          }),
        onAgentResponseCorrection: (c: { original_agent_response?: string; corrected_agent_response?: string }) =>
          emit({
            type: 'agent_response_correction',
            original: String(c?.original_agent_response || ''),
            corrected: String(c?.corrected_agent_response || ''),
            at: now(),
          }),
        onInterruption: () => emit({ type: 'interruption', at: now() }),
      });

      let conversationId: string | null = null;
      try {
        conversationId = conversation.getId();
      } catch {
        conversationId = null;
      }

      return {
        conversationId,
        end: async () => {
          try {
            await conversation.endSession();
          } catch {
            /* já encerrada */
          }
        },
        sendContextualUpdate: (text) => {
          if (text.trim()) conversation.sendContextualUpdate(text);
        },
        sendUserMessage: (text) => {
          if (text.trim()) conversation.sendUserMessage(text);
        },
        setMicMuted: (muted) => conversation.setMicMuted?.(muted),
      };
    },
  };
}
