import type {
  VoiceSessionClient,
  VoiceSessionErrorCode,
  VoiceSessionIdentity,
} from '../../../utils/omafitVoiceSessionClient';
import type { VoiceClientToolHandler, VoiceTransport, VoiceTransportHandle } from './elevenLabsTransport';
import { createVoiceSessionMachineState, reduceVoiceSession, type VoiceSessionMachineState } from './sessionMachine';
import type { VoiceTransportEvent, VoiceUiState } from './types';

export type VoiceControllerState = {
  ui: VoiceUiState;
  errorCode: VoiceSessionErrorCode | null;
  minutesRemaining: number | null;
  secondsLeftInSession: number | null;
  endedReason: string | null;
};

export type VoiceSessionContext = {
  language: string;
  storeName: string;
  anchorProductTitle: string;
  anchorProductHandle: string;
  recommendedSize: string;
  /** Resumo do thread de texto (continuidade texto→voz). */
  threadSummary: string;
};

export type VoiceControllerDeps = {
  client: VoiceSessionClient;
  transport: VoiceTransport;
  getIdentity: () => VoiceSessionIdentity;
  getContext: () => VoiceSessionContext;
  clientTools: Record<string, VoiceClientToolHandler>;
  onTransportEvent: (event: VoiceTransportEvent) => void;
  onState: (state: VoiceControllerState) => void;
  heartbeatMs?: number;
  now?: () => number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (id: unknown) => void;
};

const HEARTBEAT_MS = 20_000;

export function createVoiceSessionController(deps: VoiceControllerDeps) {
  const now = deps.now ?? (() => Date.now());
  const setIntervalFn = deps.setInterval ?? ((fn, ms) => globalThis.setInterval(fn, ms));
  const clearIntervalFn = deps.clearInterval ?? ((id) => globalThis.clearInterval(id as number));

  let state: VoiceControllerState = {
    ui: 'idle',
    errorCode: null,
    minutesRemaining: null,
    secondsLeftInSession: null,
    endedReason: null,
  };
  let machine: VoiceSessionMachineState = createVoiceSessionMachineState();
  let voiceSessionId: string | null = null;
  let handle: VoiceTransportHandle | null = null;
  let startedAt: number | null = null;
  let maxSeconds = 0;
  let ticker: unknown = null;
  let lastHeartbeatAt = 0;
  let ending = false;
  let generation = 0;

  const setState = (patch: Partial<VoiceControllerState>) => {
    state = { ...state, ...patch };
    deps.onState(state);
  };

  const clearTicker = () => {
    if (ticker != null) clearIntervalFn(ticker);
    ticker = null;
  };

  const metricsPayload = () => ({
    conversation_id: machine.metrics.conversation_id,
    ttfa_ms: machine.metrics.time_to_first_audio_ms,
    tool_call_count: machine.metrics.tool_call_count,
    interruption_count: machine.metrics.interruption_count,
    error_count: machine.metrics.error_count,
  });

  async function stop(reason: string, opts?: { keepalive?: boolean }): Promise<void> {
    if (ending || !voiceSessionId) {
      if (!voiceSessionId && state.ui === 'connecting') {
        generation += 1;
        setState({ ui: 'idle', endedReason: reason });
      }
      return;
    }
    ending = true;
    generation += 1;
    clearTicker();
    const vsid = voiceSessionId;
    const h = handle;
    const durationMs = startedAt != null ? now() - startedAt : null;
    voiceSessionId = null;
    handle = null;
    startedAt = null;
    if (h) await h.end();
    const res = await deps.client.end(
      deps.getIdentity(),
      vsid,
      { reason, durationMs, metrics: metricsPayload() },
      opts
    );
    ending = false;
    const minutesRemaining =
      res.ok && state.minutesRemaining != null
        ? Math.max(0, state.minutesRemaining - res.data.billed_seconds / 60)
        : state.minutesRemaining;
    setState({
      ui: reason === 'error' ? 'error' : 'idle',
      secondsLeftInSession: null,
      endedReason: reason,
      minutesRemaining,
    });
  }

  async function heartbeat() {
    if (!voiceSessionId) return;
    const res = await deps.client.heartbeat(deps.getIdentity(), voiceSessionId, machine.conversation_id);
    if (res.ok) {
      if (res.data.should_end) {
        if (res.data.reason === 'minutes_exhausted') setState({ errorCode: 'minutes_exhausted' });
        await stop(res.data.reason || 'limit');
      }
    } else if (res.error === 'session_closed' || res.error === 'session_not_found') {
      await stop(res.error);
    }
  }

  function tick() {
    if (startedAt == null) return;
    const elapsed = Math.floor((now() - startedAt) / 1000);
    const left = Math.max(0, maxSeconds - elapsed);
    if (left !== state.secondsLeftInSession) setState({ secondsLeftInSession: left });
    if (left <= 0) {
      void stop('max_duration');
      return;
    }
    if (now() - lastHeartbeatAt >= (deps.heartbeatMs ?? HEARTBEAT_MS)) {
      lastHeartbeatAt = now();
      void heartbeat();
    }
  }

  function handleEvent(event: VoiceTransportEvent, gen: number) {
    if (gen !== generation) return;
    machine = reduceVoiceSession(machine, event);
    deps.onTransportEvent(event);
    if (machine.ui !== state.ui && voiceSessionId) setState({ ui: machine.ui });
    if (event.type === 'session_ended' && voiceSessionId && !ending) {
      void stop('disconnected');
    }
  }

  async function start(): Promise<boolean> {
    if (state.ui !== 'idle' && state.ui !== 'error' && state.ui !== 'disconnected') return false;
    const gen = ++generation;
    machine = createVoiceSessionMachineState();
    setState({ ui: 'connecting', errorCode: null, endedReason: null });
    const ctx = deps.getContext();
    const mint = await deps.client.mint(deps.getIdentity(), ctx.language);
    if (gen !== generation) return false;
    if (!mint.ok) {
      const remaining = mint.extra?.minutes_remaining;
      setState({
        ui: 'error',
        errorCode: mint.error,
        ...(typeof remaining === 'number' ? { minutesRemaining: remaining } : {}),
      });
      return false;
    }
    voiceSessionId = mint.data.voice_session_id;
    maxSeconds = mint.data.max_session_seconds;
    setState({ minutesRemaining: mint.data.minutes_remaining });

    try {
      handle = await deps.transport.start({
        conversationToken: mint.data.conversation_token,
        language: ctx.language,
        dynamicVariables: {
          omafit_voice_ticket: mint.data.voice_ticket,
          language: ctx.language,
          store_name: ctx.storeName,
          anchor_product_title: ctx.anchorProductTitle,
          anchor_product_handle: ctx.anchorProductHandle,
          recommended_size: ctx.recommendedSize,
        },
        clientTools: deps.clientTools,
        onEvent: (e) => handleEvent(e, gen),
      });
    } catch (err) {
      if (gen === generation) {
        const name = err instanceof Error ? `${err.name} ${err.message}` : '';
        setState({
          errorCode: /notallowed|permission|microphone/i.test(name) ? 'microphone_denied' : 'voice_provider_unavailable',
        });
        await stop('error');
      }
      return false;
    }
    if (gen !== generation) {
      await handle.end();
      return false;
    }
    startedAt = now();
    lastHeartbeatAt = now();
    if (ctx.threadSummary) handle.sendContextualUpdate(ctx.threadSummary);
    setState({ ui: machine.ui === 'connecting' || machine.ui === 'idle' ? 'listening' : machine.ui });
    ticker = setIntervalFn(tick, 1000);
    return true;
  }

  return {
    start,
    stop,
    getState: () => state,
    getMetrics: () => machine.metrics,
    isActive: () => voiceSessionId != null,
    sendContextualUpdate: (text: string) => handle?.sendContextualUpdate(text),
    sendUserMessage: (text: string) => handle?.sendUserMessage(text),
  };
}

export type VoiceSessionController = ReturnType<typeof createVoiceSessionController>;
