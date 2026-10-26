import { useState } from 'react';
import { Loader2, Mic, MicOff, Square } from 'lucide-react';
import type { VoiceControllerState } from '../voice/voiceSessionController';
import type { StylistLanguage } from '../types';

const CONSENT_KEY = 'omafit_stylist_voice_consent_v1';

const COPY: Record<StylistLanguage, Record<string, string>> = {
  pt: {
    start: 'Falar com a stylist',
    stop: 'Encerrar voz',
    consent:
      'Seu áudio é processado em tempo real para a conversa e não é gravado. Permitir o microfone?',
    allow: 'Permitir',
    cancel: 'Agora não',
    connecting: 'Conectando…',
    listening: 'Ouvindo…',
    thinking: 'Pensando…',
    speaking: 'Falando…',
    interrupted: 'Ouvindo…',
    minutes: 'min de voz restantes na loja',
    session_left: 'restantes nesta conversa',
    plan_required: 'Voz indisponível nesta loja. Continue pelo chat.',
    minutes_exhausted: 'Os minutos de voz da loja acabaram este mês. Continue pelo chat.',
    too_many_sessions: 'Muitas conversas de voz agora. Tente de novo em instantes ou use o chat.',
    mic_denied: 'Microfone bloqueado. Continue pelo chat.',
    generic: 'Não foi possível iniciar a voz. Continue pelo chat.',
    ended_limit: 'Conversa de voz encerrada pelo limite de tempo. Você pode continuar pelo chat.',
  },
  es: {
    start: 'Hablar con la estilista',
    stop: 'Terminar voz',
    consent:
      'Tu audio se procesa en tiempo real para la conversación y no se graba. ¿Permitir el micrófono?',
    allow: 'Permitir',
    cancel: 'Ahora no',
    connecting: 'Conectando…',
    listening: 'Escuchando…',
    thinking: 'Pensando…',
    speaking: 'Hablando…',
    interrupted: 'Escuchando…',
    minutes: 'min de voz restantes en la tienda',
    session_left: 'restantes en esta conversación',
    plan_required: 'Voz no disponible en esta tienda. Sigue por el chat.',
    minutes_exhausted: 'Los minutos de voz de la tienda se agotaron este mes. Sigue por el chat.',
    too_many_sessions: 'Demasiadas conversaciones de voz ahora. Intenta en breve o usa el chat.',
    mic_denied: 'Micrófono bloqueado. Sigue por el chat.',
    generic: 'No se pudo iniciar la voz. Sigue por el chat.',
    ended_limit: 'Conversación de voz terminada por límite de tiempo. Puedes seguir por el chat.',
  },
  en: {
    start: 'Talk to the stylist',
    stop: 'End voice',
    consent: 'Your audio is processed in real time for the conversation and is not recorded. Allow microphone?',
    allow: 'Allow',
    cancel: 'Not now',
    connecting: 'Connecting…',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
    interrupted: 'Listening…',
    minutes: 'voice min left for this store',
    session_left: 'left in this conversation',
    plan_required: 'Voice is not available for this store. Keep chatting by text.',
    minutes_exhausted: "This store's voice minutes are used up this month. Keep chatting by text.",
    too_many_sessions: 'Too many voice conversations right now. Try again shortly or use the chat.',
    mic_denied: 'Microphone blocked. Keep chatting by text.',
    generic: "Couldn't start voice. Keep chatting by text.",
    ended_limit: 'Voice conversation ended at the time limit. You can keep chatting by text.',
  },
};

export function voiceErrorMessage(code: string | null, language: StylistLanguage): string | null {
  if (!code) return null;
  const c = COPY[language] ?? COPY.pt;
  if (code === 'plan_required' || code === 'minutes_exhausted' || code === 'too_many_sessions') return c[code];
  if (/permission|notallowed|microphone/i.test(code)) return c.mic_denied;
  return c.generic;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function hasStoredConsent(): boolean {
  try {
    return window.sessionStorage.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
}

export type StylistVoiceControlsProps = {
  state: VoiceControllerState;
  language: StylistLanguage;
  primaryColor: string;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
};

/** Botão de microfone + estado da conversa de voz, ao lado do input de texto. */
export function StylistVoiceControls({
  state,
  language,
  primaryColor,
  disabled,
  onStart,
  onStop,
}: StylistVoiceControlsProps) {
  const c = COPY[language] ?? COPY.pt;
  const [askingConsent, setAskingConsent] = useState(false);
  const active = state.ui !== 'idle' && state.ui !== 'error' && state.ui !== 'disconnected';
  const unavailable = state.errorCode === 'plan_required' || state.errorCode === 'minutes_exhausted';
  const error = voiceErrorMessage(state.errorCode, language);
  const endedByLimit = !active && (state.endedReason === 'max_duration' || state.endedReason === 'limit');

  const requestStart = () => {
    if (hasStoredConsent()) onStart();
    else setAskingConsent(true);
  };

  const status = active ? c[state.ui] ?? '' : '';

  return (
    <div className="mb-3">
      {askingConsent && (
        <div className="mb-2 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700" role="dialog">
          <p className="mb-2">{c.consent}</p>
          <div className="flex justify-end gap-2">
            <button type="button" className="px-3 py-1.5 text-gray-600" onClick={() => setAskingConsent(false)}>
              {c.cancel}
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 font-medium text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={() => {
                try {
                  window.sessionStorage.setItem(CONSENT_KEY, '1');
                } catch {
                  /* sessionStorage indisponível */
                }
                setAskingConsent(false);
                onStart();
              }}
            >
              {c.allow}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        {active ? (
          <button
            type="button"
            onClick={onStop}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition"
            style={{ borderColor: primaryColor, color: primaryColor }}
            aria-label={c.stop}
          >
            {state.ui === 'connecting' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="relative flex h-3 w-3">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ backgroundColor: primaryColor }}
                />
                <span className="relative inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }} />
              </span>
            )}
            <span>{status}</span>
            <Square className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={requestStart}
            disabled={disabled || unavailable}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={c.start}
          >
            {unavailable ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {c.start}
          </button>
        )}
      </div>

      {active && state.secondsLeftInSession != null && state.secondsLeftInSession <= 60 && (
        <p className="mt-1 text-center text-xs text-gray-500">
          {formatSeconds(state.secondsLeftInSession)} {c.session_left}
        </p>
      )}
      {!active && state.minutesRemaining != null && !error && state.minutesRemaining <= 10 && (
        <p className="mt-1 text-center text-xs text-gray-500">
          {Math.floor(state.minutesRemaining)} {c.minutes}
        </p>
      )}
      {error && <p className="mt-1 text-center text-xs text-gray-600">{error}</p>}
      {endedByLimit && !error && <p className="mt-1 text-center text-xs text-gray-600">{c.ended_limit}</p>}
    </div>
  );
}
