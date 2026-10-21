import type { VoiceTransportEvent } from './types';

export type MockTransportOptions = {
  /** Atraso artificial até primeiro áudio (ms). */
  first_audio_delay_ms?: number;
  /** Gap entre chunks de áudio (ms). */
  audio_chunk_gap_ms?: number;
  /** Atraso do tool call após início da fala (ms). */
  tool_call_delay_ms?: number;
  /** Interromper após N ms de fala. */
  interrupt_after_ms?: number | null;
  /** Simular falha de transporte. */
  fail_connect?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_PRODUCTS = [
  {
    handle: 'calca-jeans-reta',
    title: 'Calça Jeans Reta',
    rationale: 'Equilibra o blazer',
    price_label: 'R$ 219',
  },
  {
    handle: 'camiseta-algodao',
    title: 'Camiseta Algodão',
    rationale: 'Base casual',
    price_label: 'R$ 89',
  },
];

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Transporte mock alinhado ao protocolo ElevenLabs Agents (eventos client-side).
 * Isolado: sem SDK, sem API key, sem microfone — prova de máquina de estados e sync.
 */
export async function runMockVoiceConversation(
  onEvent: (event: VoiceTransportEvent) => void,
  options: MockTransportOptions = {}
): Promise<{ conversation_id: string }> {
  const now = options.now || (() => Date.now());
  const sleep = options.sleep || defaultSleep;
  const firstAudioDelay = options.first_audio_delay_ms ?? 180;
  const chunkGap = options.audio_chunk_gap_ms ?? 40;
  const toolDelay = options.tool_call_delay_ms ?? 90;
  const interruptAfter = options.interrupt_after_ms ?? null;

  onEvent({ type: 'status', status: 'connecting', at: now() });
  await sleep(15);

  if (options.fail_connect) {
    onEvent({
      type: 'error',
      message: 'voice_unavailable: connect failed — fallback to text chat',
      at: now(),
    });
    onEvent({ type: 'status', status: 'disconnected', at: now() });
    onEvent({
      type: 'session_ended',
      reason: 'connect_failed',
      at: now(),
    });
    return { conversation_id: '' };
  }

  const conversation_id = `mock_conv_${Math.random().toString(36).slice(2, 10)}`;
  onEvent({ type: 'status', status: 'connected', at: now() });
  onEvent({ type: 'session_started', conversation_id, at: now() });
  onEvent({ type: 'mode', mode: 'listening', at: now() });

  // Utterance do comprador (contínua — sem push-to-talk)
  onEvent({
    type: 'user_transcript',
    text: 'quero algo casual para combinar',
    is_final: false,
    at: now(),
  });
  await sleep(20);
  onEvent({
    type: 'user_transcript',
    text: 'quero algo casual para combinar com este blazer',
    is_final: true,
    at: now(),
  });

  // thinking → resposta + áudio
  const response_id = `resp_${Math.random().toString(36).slice(2, 8)}`;
  const fullText =
    'Separei duas peças que combinam bem com o seu blazer. Veja os cards enquanto eu explico.';
  onEvent({
    type: 'agent_response_part',
    text: '',
    response_id,
    phase: 'start',
    at: now(),
  });

  await sleep(firstAudioDelay);

  const words = fullText.split(' ');
  let built = '';
  for (let i = 0; i < words.length; i++) {
    const word = words[i]!;
    const piece = (i === 0 ? '' : ' ') + word;
    built += piece;
    onEvent({
      type: 'agent_response_part',
      text: piece,
      response_id,
      phase: 'delta',
      at: now(),
    });

    const chars = piece.split('');
    onEvent({
      type: 'audio_chunk',
      response_id,
      chunk_index: i,
      duration_ms: chunkGap,
      alignment: {
        chars,
        char_start_times_ms: chars.map((_, idx) => idx * 12),
      },
      at: now(),
    });

    if (interruptAfter != null && i === 3) {
      await sleep(interruptAfter);
      onEvent({ type: 'interruption', at: now() });
      onEvent({
        type: 'agent_response_correction',
        original: fullText,
        corrected: built,
        at: now(),
      });
      onEvent({ type: 'mode', mode: 'listening', at: now() });
      onEvent({
        type: 'agent_response_part',
        text: '',
        response_id,
        phase: 'stop',
        at: now(),
      });
      onEvent({ type: 'session_ended', reason: 'interrupted_demo', at: now() });
      onEvent({ type: 'status', status: 'disconnected', at: now() });
      return { conversation_id };
    }

    await sleep(chunkGap);

    if (i === 2) {
      await sleep(toolDelay);
      onEvent({
        type: 'client_tool_call',
        tool_call_id: `call_${i}`,
        tool_name: 'show_product_cards',
        parameters: {
          speak_text: 'Estas são as sugestões da loja.',
          impression_id: 'imp_mock_1',
          anchor_handle: 'blazer-navy',
          products: DEFAULT_PRODUCTS,
        },
        at: now(),
      });
    }
  }

  onEvent({
    type: 'agent_response',
    text: fullText,
    response_id,
    at: now(),
  });
  onEvent({
    type: 'agent_response_part',
    text: '',
    response_id,
    phase: 'stop',
    at: now(),
  });
  onEvent({ type: 'mode', mode: 'listening', at: now() });
  onEvent({ type: 'session_ended', reason: 'completed', at: now() });
  onEvent({ type: 'status', status: 'disconnected', at: now() });

  return { conversation_id };
}
