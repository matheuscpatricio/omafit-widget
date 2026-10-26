import { useEffect, useRef, useState } from 'react';
import {
  createDefaultVoiceSessionClient,
  type VoiceSessionClient,
  type VoiceSessionIdentity,
} from '../../../utils/omafitVoiceSessionClient';
import { createElevenLabsTransport, type VoiceClientToolHandler, type VoiceTransport } from '../voice/elevenLabsTransport';
import type { VoiceTransportEvent } from '../voice/types';
import {
  createVoiceSessionController,
  type VoiceControllerState,
  type VoiceSessionContext,
  type VoiceSessionController,
} from '../voice/voiceSessionController';

export type UseStylistVoiceSessionOptions = {
  enabled: boolean;
  identity: VoiceSessionIdentity;
  getContext: () => VoiceSessionContext;
  clientTools: Record<string, VoiceClientToolHandler>;
  onTransportEvent: (event: VoiceTransportEvent) => void;
  client?: VoiceSessionClient;
  transport?: VoiceTransport;
};

const INITIAL: VoiceControllerState = {
  ui: 'idle',
  errorCode: null,
  minutesRemaining: null,
  secondsLeftInSession: null,
  endedReason: null,
};

/**
 * Liga o controller de voz ao React. Callbacks mudam a cada render; o controller
 * lê sempre a versão mais recente via ref, então não é recriado.
 */
export function useStylistVoiceSession(options: UseStylistVoiceSessionOptions) {
  const [state, setState] = useState<VoiceControllerState>(INITIAL);
  const optsRef = useRef(options);
  optsRef.current = options;
  const controllerRef = useRef<VoiceSessionController | null>(null);

  const getController = () => {
    if (!controllerRef.current) {
      const toolNames = Object.keys(optsRef.current.clientTools);
      const clientTools: Record<string, VoiceClientToolHandler> = {};
      for (const name of toolNames) {
        clientTools[name] = (params) => optsRef.current.clientTools[name]?.(params);
      }
      controllerRef.current = createVoiceSessionController({
        client: optsRef.current.client ?? createDefaultVoiceSessionClient(),
        transport: optsRef.current.transport ?? createElevenLabsTransport(),
        getIdentity: () => optsRef.current.identity,
        getContext: () => optsRef.current.getContext(),
        clientTools,
        onTransportEvent: (e) => optsRef.current.onTransportEvent(e),
        onState: setState,
      });
    }
    return controllerRef.current;
  };

  useEffect(() => {
    const endOnLeave = () => {
      void controllerRef.current?.stop('page_hidden', { keepalive: true });
    };
    window.addEventListener('pagehide', endOnLeave);
    return () => {
      window.removeEventListener('pagehide', endOnLeave);
      void controllerRef.current?.stop('widget_close', { keepalive: true });
    };
  }, []);

  useEffect(() => {
    if (!options.enabled) void controllerRef.current?.stop('disabled');
  }, [options.enabled]);

  return {
    state,
    isActive: state.ui !== 'idle' && state.ui !== 'error',
    start: () => (optsRef.current.enabled ? getController().start() : Promise.resolve(false)),
    stop: (reason = 'user') => controllerRef.current?.stop(reason) ?? Promise.resolve(),
    sendContextualUpdate: (text: string) => controllerRef.current?.sendContextualUpdate(text),
    sendUserMessage: (text: string) => controllerRef.current?.sendUserMessage(text),
  };
}
