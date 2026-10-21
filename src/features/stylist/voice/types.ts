import type { StylistStructuredAction, SuggestedProductCard } from '../types';

/**
 * Estados de UI da sessão de voz (ChatGPT-like continuous conversation).
 * Não acoplados ao SDK ElevenLabs — o bridge mapeia eventos do provedor para estes estados.
 */
export type VoiceUiState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'disconnected'
  | 'error';

export type VoiceTransportEvent =
  | { type: 'session_started'; conversation_id: string; at: number }
  | { type: 'session_ended'; reason: string; at: number }
  | { type: 'status'; status: 'connecting' | 'connected' | 'disconnected'; at: number }
  | { type: 'mode'; mode: 'listening' | 'speaking'; at: number }
  | { type: 'user_transcript'; text: string; is_final: boolean; at: number }
  | { type: 'agent_response_part'; text: string; response_id: string; phase: 'start' | 'delta' | 'stop'; at: number }
  | { type: 'agent_response'; text: string; response_id: string; at: number }
  | {
      type: 'agent_response_correction';
      original: string;
      corrected: string;
      at: number;
    }
  | {
      type: 'audio_chunk';
      response_id: string;
      chunk_index: number;
      /** Duração simulada / real do chunk (ms). */
      duration_ms: number;
      /** Alinhamento caractere↔áudio (sync texto/UI). */
      alignment?: { chars: string[]; char_start_times_ms: number[] };
      at: number;
    }
  | {
      type: 'client_tool_call';
      tool_call_id: string;
      tool_name: string;
      parameters: Record<string, unknown>;
      at: number;
    }
  | {
      type: 'interruption';
      at: number;
    }
  | {
      type: 'error';
      message: string;
      at: number;
    };

export type VoiceStructuredUiEvent = {
  at: number;
  actions: StylistStructuredAction[];
  products?: SuggestedProductCard[];
  source_tool_call_id?: string;
};

export type VoiceSessionMetrics = {
  conversation_id: string | null;
  /** Tempo até primeiro chunk de áudio após utterance final do user (ms). */
  time_to_first_audio_ms: number | null;
  /** Tempo até evento estruturado de produtos após tool call (ms). */
  time_to_products_ui_ms: number | null;
  /** Latência média entre chunks de áudio (ms). */
  avg_audio_chunk_gap_ms: number | null;
  interruption_count: number;
  tool_call_count: number;
  error_count: number;
  /** Duração total da sessão (ms). */
  session_duration_ms: number | null;
  /** Sync: % de chars do agent_response cobertos por alignment. */
  text_audio_alignment_coverage: number | null;
  used_text_fallback: boolean;
};

export type VoiceProofScenarioResult = {
  name: string;
  passed: boolean;
  details: string;
  metrics: Partial<VoiceSessionMetrics>;
  timings_ms: Record<string, number>;
};
