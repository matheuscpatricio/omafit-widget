import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  buildVoiceSessionCanonical,
  createVoiceSessionClient,
  type VoiceSessionClient,
} from '../../../utils/omafitVoiceSessionClient';
import { hasStylistVoiceAccess } from '../../../utils/shopifyPlanAccess';
import type { VoiceTransport, VoiceTransportStartOptions } from './elevenLabsTransport';
import { createVoiceSessionController, type VoiceControllerState } from './voiceSessionController';

const identity = { shopDomain: 'loja.myshopify.com', publicId: 'pub_1', widgetSessionId: 'w1' };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('voice session client', () => {
  it('signs requests with the canonical shared with omafit', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { error: null, voice_session_id: 'vs1' }));
    const client = createVoiceSessionClient({
      baseUrl: 'https://app.test',
      secret: 's3cret',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      nowSec: () => 1_800_000_000,
    });
    await client.heartbeat(identity, 'vs1', 'conv_1');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://app.test/api/widget/voice-session/heartbeat');
    const body = JSON.parse(String(init.body));
    const expected = createHmac('sha256', 's3cret')
      .update(
        buildVoiceSessionCanonical({
          action: 'heartbeat',
          public_id: 'pub_1',
          session_id: 'w1',
          shop_domain: 'loja.myshopify.com',
          timestamp: '1800000000',
          voice_session_id: 'vs1',
        })
      )
      .digest('hex');
    expect(body.signature).toBe(expected);
    expect(body.el_conversation_id).toBe('conv_1');
    expect(JSON.stringify(body)).not.toMatch(/xi-api-key|ELEVENLABS/i);
  });

  it('surfaces server gate errors', async () => {
    const client = createVoiceSessionClient({
      baseUrl: 'https://app.test',
      secret: 's',
      fetchImpl: (async () =>
        jsonResponse(402, { error: 'minutes_exhausted', minutes_remaining: 0 })) as unknown as typeof fetch,
    });
    const res = await client.mint(identity, 'pt');
    expect(res).toMatchObject({ ok: false, error: 'minutes_exhausted', status: 402, extra: { minutes_remaining: 0 } });
  });

  it('does not call the network when unconfigured', async () => {
    const fetchImpl = vi.fn();
    const client = createVoiceSessionClient({ baseUrl: '', secret: '', fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(await client.mint(identity, 'pt')).toMatchObject({ ok: false, error: 'not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('plan gate (UI only)', () => {
  it('shows voice for growth and enterprise, not starter', () => {
    expect(hasStylistVoiceAccess('growth')).toBe(true);
    expect(hasStylistVoiceAccess('enterprise')).toBe(true);
    expect(hasStylistVoiceAccess('starter')).toBe(false);
    expect(hasStylistVoiceAccess(null)).toBe(false);
  });
});

function fakeClient(overrides: Partial<Record<keyof VoiceSessionClient, unknown>> = {}) {
  const calls: string[] = [];
  const client = {
    mint: vi.fn(async () => {
      calls.push('mint');
      return {
        ok: true,
        status: 200,
        data: {
          voice_session_id: 'vs1',
          conversation_token: 'tok',
          voice_ticket: 'ticket',
          plan: 'growth',
          minutes_limit: 30,
          minutes_remaining: 12,
          max_session_seconds: 5,
          expires_at: '',
          language: 'pt',
        },
      };
    }),
    heartbeat: vi.fn(async () => ({ ok: true, status: 200, data: { should_end: false, reason: null, seconds_left: 100 } })),
    end: vi.fn(async () => {
      calls.push('end');
      return { ok: true, status: 200, data: { billed_seconds: 60 } };
    }),
    ...overrides,
  } as unknown as VoiceSessionClient;
  return { client, calls };
}

function fakeTransport() {
  let opts: VoiceTransportStartOptions | null = null;
  const handle = { conversationId: 'c1', end: vi.fn(async () => {}), sendContextualUpdate: vi.fn(), sendUserMessage: vi.fn(), setMicMuted: vi.fn() };
  const transport: VoiceTransport = {
    start: vi.fn(async (o) => {
      opts = o;
      return handle;
    }),
  };
  return { transport, handle, getOpts: () => opts! };
}

function setup(clientOverrides = {}) {
  let t = 0;
  let tick: (() => void) | null = null;
  const states: VoiceControllerState[] = [];
  const { client, calls } = fakeClient(clientOverrides);
  const { transport, handle, getOpts } = fakeTransport();
  const events: string[] = [];
  const controller = createVoiceSessionController({
    client,
    transport,
    getIdentity: () => identity,
    getContext: () => ({
      language: 'pt',
      storeName: 'Loja',
      anchorProductTitle: 'Camisa',
      anchorProductHandle: 'camisa',
      recommendedSize: 'M',
      threadSummary: 'Conversa anterior no chat:\nCliente: oi',
    }),
    clientTools: { show_product_cards: () => 'shown' },
    onTransportEvent: (e) => events.push(e.type),
    onState: (s) => states.push(s),
    heartbeatMs: 2000,
    now: () => t,
    setInterval: (fn) => {
      tick = fn;
      return 1;
    },
    clearInterval: () => {
      tick = null;
    },
  });
  return {
    controller,
    client,
    calls,
    handle,
    getOpts,
    events,
    states,
    advance: (ms: number) => {
      t += ms;
      tick?.();
    },
  };
}

describe('voice session controller', () => {
  it('mints, passes the ticket and thread summary, then ends with billing', async () => {
    const s = setup();
    expect(await s.controller.start()).toBe(true);
    const opts = s.getOpts();
    expect(opts.conversationToken).toBe('tok');
    expect(opts.dynamicVariables.omafit_voice_ticket).toBe('ticket');
    expect(opts.dynamicVariables.recommended_size).toBe('M');
    expect(s.handle.sendContextualUpdate).toHaveBeenCalledWith(expect.stringContaining('Cliente: oi'));
    expect(s.controller.getState()).toMatchObject({ ui: 'listening', minutesRemaining: 12 });

    await s.controller.stop('user');
    expect(s.handle.end).toHaveBeenCalled();
    expect(s.calls).toEqual(['mint', 'end']);
    expect(s.controller.getState()).toMatchObject({ ui: 'idle', minutesRemaining: 11, endedReason: 'user' });
  });

  it('falls back to text when the plan has no voice', async () => {
    const s = setup({
      mint: vi.fn(async () => ({ ok: false, status: 403, error: 'plan_required' })),
    });
    expect(await s.controller.start()).toBe(false);
    expect(s.controller.getState()).toMatchObject({ ui: 'error', errorCode: 'plan_required' });
  });

  it('reports minutes_exhausted with zero remaining', async () => {
    const s = setup({
      mint: vi.fn(async () => ({ ok: false, status: 402, error: 'minutes_exhausted', extra: { minutes_remaining: 0 } })),
    });
    await s.controller.start();
    expect(s.controller.getState()).toMatchObject({ errorCode: 'minutes_exhausted', minutesRemaining: 0 });
  });

  it('ends at max session duration and when the server says the quota ran out', async () => {
    const s = setup();
    await s.controller.start();
    s.advance(5000);
    await vi.waitFor(() => expect(s.calls).toContain('end'));
    expect(s.controller.getState().endedReason).toBe('max_duration');

    const s2 = setup({
      heartbeat: vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { should_end: true, reason: 'minutes_exhausted', seconds_left: 0 },
      })),
    });
    await s2.controller.start();
    s2.advance(2000);
    await vi.waitFor(() => expect(s2.calls).toContain('end'));
    expect(s2.controller.getState()).toMatchObject({ errorCode: 'minutes_exhausted', ui: 'idle' });
  });

  it('closes the billed session when the provider disconnects, and can resume with a new mint', async () => {
    const s = setup();
    await s.controller.start();
    s.getOpts().onEvent({ type: 'session_ended', reason: 'network', at: 1 });
    await vi.waitFor(() => expect(s.calls).toEqual(['mint', 'end']));
    expect(s.controller.getState().endedReason).toBe('disconnected');

    expect(await s.controller.start()).toBe(true);
    expect(s.calls).toEqual(['mint', 'end', 'mint']);
    expect(s.handle.sendContextualUpdate).toHaveBeenCalledTimes(2);
  });

  it('maps microphone denial to a dedicated error and still closes the session', async () => {
    const denied = Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    const { client, calls } = fakeClient();
    const controller = createVoiceSessionController({
      client,
      transport: { start: async () => Promise.reject(denied) },
      getIdentity: () => identity,
      getContext: () => ({
        language: 'pt',
        storeName: '',
        anchorProductTitle: '',
        anchorProductHandle: '',
        recommendedSize: '',
        threadSummary: '',
      }),
      clientTools: {},
      onTransportEvent: () => {},
      onState: () => {},
    });
    expect(await controller.start()).toBe(false);
    expect(calls).toEqual(['mint', 'end']);
    expect(controller.getState()).toMatchObject({ ui: 'error', errorCode: 'microphone_denied' });
  });
});
