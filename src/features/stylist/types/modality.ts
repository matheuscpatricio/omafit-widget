import type { StylistLanguage } from './messages';

/**
 * Eventos de entrada desacoplados da UI.
 * Texto é o caminho atual; voz é contrato preparado (sem SDK ElevenLabs).
 */
export type StylistTextInputEvent = {
  modality: 'text';
  text: string;
  language?: StylistLanguage;
  /** Intenção de alto nível alinhada ao callGPTAssistant atual. */
  intention?: 'custom' | 'add_to_cart' | 'complementary';
  at: number;
};

/**
 * Stub para conversa de voz em tempo real (ElevenLabs Conversational AI).
 * Não integrar SDK nesta etapa — apenas tipagem e roteamento futuro.
 */
export type StylistVoiceInputEvent = {
  modality: 'voice';
  /** Transcrição final ou parcial; o motor consomirá o mesmo path que texto. */
  transcript: string;
  is_final: boolean;
  language?: StylistLanguage;
  /** Id do turno de voz no provedor (futuro). */
  voice_turn_id?: string;
  at: number;
};

export type StylistInputEvent = StylistTextInputEvent | StylistVoiceInputEvent;

/** Eventos de saída de voz (TTS / barge-in) — não implementados ainda. */
export type StylistVoiceOutputEvent =
  | { kind: 'speak_text'; text: string; language: StylistLanguage }
  | { kind: 'stop_speaking' }
  | { kind: 'voice_unavailable'; reason: string };

/**
 * Normaliza qualquer input para texto processável pelo motor.
 * Voz parcial (is_final=false) não deve disparar turno completo.
 */
export function inputEventToProcessableText(
  event: StylistInputEvent
): { text: string; intention: 'custom' | 'add_to_cart' | 'complementary' } | null {
  if (event.modality === 'text') {
    const text = String(event.text || '').trim();
    if (!text) return null;
    return { text, intention: event.intention || 'custom' };
  }
  if (!event.is_final) return null;
  const text = String(event.transcript || '').trim();
  if (!text) return null;
  return { text, intention: 'custom' };
}
