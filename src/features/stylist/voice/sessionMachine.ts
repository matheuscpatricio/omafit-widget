import type { VoiceSessionMetrics, VoiceTransportEvent, VoiceUiState } from './types';

export type VoiceSessionMachineState = {
  ui: VoiceUiState;
  conversation_id: string | null;
  last_user_transcript: string;
  agent_text: string;
  speaking_response_id: string | null;
  error_message: string | null;
  metrics: VoiceSessionMetrics;
  /** Timestamp da última utterance final do user (para TTFA). */
  last_user_final_at: number | null;
  /** Timestamp do client_tool_call de produtos pendente. */
  pending_products_tool_at: number | null;
  audio_chunk_ats: number[];
  aligned_char_count: number;
  agent_response_char_count: number;
  started_at: number | null;
};

export function createVoiceSessionMachineState(): VoiceSessionMachineState {
  return {
    ui: 'idle',
    conversation_id: null,
    last_user_transcript: '',
    agent_text: '',
    speaking_response_id: null,
    error_message: null,
    metrics: emptyMetrics(),
    last_user_final_at: null,
    pending_products_tool_at: null,
    audio_chunk_ats: [],
    aligned_char_count: 0,
    agent_response_char_count: 0,
    started_at: null,
  };
}

function emptyMetrics(): VoiceSessionMetrics {
  return {
    conversation_id: null,
    time_to_first_audio_ms: null,
    time_to_products_ui_ms: null,
    avg_audio_chunk_gap_ms: null,
    interruption_count: 0,
    tool_call_count: 0,
    error_count: 0,
    session_duration_ms: null,
    text_audio_alignment_coverage: null,
    used_text_fallback: false,
  };
}

function avgGaps(ats: number[]): number | null {
  if (ats.length < 2) return null;
  let sum = 0;
  for (let i = 1; i < ats.length; i++) sum += ats[i]! - ats[i - 1]!;
  return Math.round(sum / (ats.length - 1));
}

/**
 * Reduz eventos de transporte (ElevenLabs ou mock) para estado de UI + métricas.
 * Prova técnica: barge-in, thinking↔speaking, sync e tool calls.
 */
export function reduceVoiceSession(
  state: VoiceSessionMachineState,
  event: VoiceTransportEvent
): VoiceSessionMachineState {
  const next: VoiceSessionMachineState = {
    ...state,
    metrics: { ...state.metrics },
    audio_chunk_ats: [...state.audio_chunk_ats],
  };

  switch (event.type) {
    case 'status':
      if (event.status === 'connecting') next.ui = 'connecting';
      else if (event.status === 'connected') {
        next.ui = next.ui === 'connecting' || next.ui === 'idle' ? 'listening' : next.ui;
      } else if (event.status === 'disconnected') {
        next.ui = 'disconnected';
        if (next.started_at != null) {
          next.metrics.session_duration_ms = event.at - next.started_at;
        }
      }
      break;

    case 'session_started':
      next.conversation_id = event.conversation_id;
      next.metrics.conversation_id = event.conversation_id;
      next.started_at = event.at;
      next.ui = 'listening';
      break;

    case 'session_ended':
      next.ui = 'disconnected';
      if (next.started_at != null) {
        next.metrics.session_duration_ms = event.at - next.started_at;
      }
      if (next.agent_response_char_count > 0) {
        next.metrics.text_audio_alignment_coverage =
          Math.round((next.aligned_char_count / next.agent_response_char_count) * 1000) / 1000;
      }
      next.metrics.avg_audio_chunk_gap_ms = avgGaps(next.audio_chunk_ats);
      break;

    case 'mode':
      if (event.mode === 'listening' && next.ui !== 'error' && next.ui !== 'disconnected') {
        next.ui = next.ui === 'interrupted' ? 'listening' : 'listening';
      }
      if (event.mode === 'speaking') next.ui = 'speaking';
      break;

    case 'user_transcript':
      next.last_user_transcript = event.text;
      if (event.is_final) {
        next.last_user_final_at = event.at;
        next.ui = 'thinking';
        next.audio_chunk_ats = [];
        next.aligned_char_count = 0;
        next.agent_response_char_count = 0;
        next.agent_text = '';
      }
      break;

    case 'agent_response_part':
      if (event.phase === 'start') {
        next.speaking_response_id = event.response_id;
        next.agent_text = '';
        if (next.ui === 'thinking') next.ui = 'speaking';
      } else if (event.phase === 'delta') {
        next.agent_text += event.text;
      }
      break;

    case 'agent_response':
      next.agent_text = event.text;
      next.agent_response_char_count = event.text.length;
      next.speaking_response_id = event.response_id;
      break;

    case 'agent_response_correction':
      next.agent_text = event.corrected;
      next.agent_response_char_count = event.corrected.length;
      break;

    case 'audio_chunk':
      if (next.ui === 'thinking' || next.ui === 'listening') next.ui = 'speaking';
      next.audio_chunk_ats.push(event.at);
      if (
        next.metrics.time_to_first_audio_ms == null &&
        next.last_user_final_at != null &&
        event.chunk_index === 0
      ) {
        next.metrics.time_to_first_audio_ms = event.at - next.last_user_final_at;
      }
      if (event.alignment?.chars?.length) {
        next.aligned_char_count += event.alignment.chars.length;
      }
      break;

    case 'client_tool_call':
      next.metrics.tool_call_count += 1;
      if (
        event.tool_name === 'show_product_cards' ||
        event.tool_name === 'recommend_products'
      ) {
        next.pending_products_tool_at = event.at;
      }
      // Tool em curso: UI pode permanecer em thinking/speaking conforme pre_tool_speech
      if (next.ui === 'listening') next.ui = 'thinking';
      break;

    case 'interruption':
      next.ui = 'interrupted';
      next.metrics.interruption_count += 1;
      break;

    case 'error':
      next.ui = 'error';
      next.error_message = event.message;
      next.metrics.error_count += 1;
      if (/fallback|unavailable|failed/i.test(event.message)) {
        next.metrics.used_text_fallback = true;
      }
      break;

    default:
      break;
  }

  return next;
}

/** Marca quando o frontend renderizou cards a partir do tool call. */
export function markProductsUiRendered(
  state: VoiceSessionMachineState,
  at: number
): VoiceSessionMachineState {
  if (state.pending_products_tool_at == null) return state;
  if (state.metrics.time_to_products_ui_ms != null) return state;
  return {
    ...state,
    metrics: {
      ...state.metrics,
      time_to_products_ui_ms: at - state.pending_products_tool_at,
    },
    pending_products_tool_at: null,
  };
}
