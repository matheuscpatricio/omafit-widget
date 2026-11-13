import { getOmafitCatalogRuntimeConfig } from './omafitEnv';

/**
 * Cliente das rotas omafit `/api/widget/voice-session/{mint,heartbeat,end}`.
 * O plano, a quota de minutos e o token ElevenLabs são decididos no servidor;
 * a chave ElevenLabs nunca chega ao widget.
 */

export type VoiceSessionAction = 'mint' | 'heartbeat' | 'end';

export type VoiceMintResult = {
  voice_session_id: string;
  conversation_token: string;
  voice_ticket: string;
  plan: 'growth' | 'enterprise';
  minutes_limit: number;
  minutes_remaining: number;
  max_session_seconds: number;
  expires_at: string;
  language: string;
};

export type VoiceHeartbeatResult = {
  should_end: boolean;
  reason: string | null;
  seconds_left: number;
};

export type VoiceEndResult = { billed_seconds: number; already_ended?: boolean };

export type VoiceSessionErrorCode =
  | 'plan_required'
  | 'minutes_exhausted'
  | 'too_many_sessions'
  | 'session_not_found'
  | 'session_closed'
  | 'voice_not_configured'
  | 'voice_provider_unavailable'
  | 'not_configured'
  | 'network_error'
  | string;

export type VoiceSessionResponse<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: VoiceSessionErrorCode; status: number; extra?: Record<string, unknown> };

export type VoiceSessionIdentity = {
  shopDomain: string;
  publicId: string;
  widgetSessionId?: string;
};

export function buildVoiceSessionCanonical(params: {
  action: string;
  public_id: string;
  session_id?: string;
  shop_domain: string;
  timestamp: string;
  voice_session_id?: string;
}): string {
  return [
    'voice_session_v1',
    `action=${params.action}`,
    `public_id=${params.public_id}`,
    `session_id=${params.session_id || ''}`,
    `shop_domain=${params.shop_domain}`,
    `timestamp=${params.timestamp}`,
    `voice_session_id=${params.voice_session_id || ''}`,
  ].join('|');
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export type VoiceSessionClientDeps = {
  baseUrl: string;
  secret: string;
  fetchImpl?: typeof fetch;
  nowSec?: () => number;
};

export function createVoiceSessionClient(deps: VoiceSessionClientDeps) {
  const doFetch = deps.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const nowSec = deps.nowSec ?? (() => Math.floor(Date.now() / 1000));

  async function call<T>(
    action: VoiceSessionAction,
    identity: VoiceSessionIdentity,
    body: Record<string, unknown>,
    opts?: { keepalive?: boolean }
  ): Promise<VoiceSessionResponse<T>> {
    if (!deps.baseUrl || !deps.secret || !identity.shopDomain || !identity.publicId) {
      return { ok: false, error: 'not_configured', status: 0 };
    }
    const signed = {
      action,
      public_id: identity.publicId,
      session_id: identity.widgetSessionId || '',
      shop_domain: identity.shopDomain,
      timestamp: String(nowSec()),
      voice_session_id: String(body.voice_session_id || ''),
    };
    const signature = await hmacSha256Hex(deps.secret, buildVoiceSessionCanonical(signed));
    try {
      const res = await doFetch(`${deps.baseUrl}/api/widget/voice-session/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, ...signed, signature }),
        keepalive: opts?.keepalive,
      });
      let json: Record<string, unknown> = {};
      try {
        json = (await res.json()) as Record<string, unknown>;
      } catch {
        /* corpo vazio */
      }
      if (!res.ok || json.error) {
        const { error, ...extra } = json;
        return { ok: false, error: String(error || `http_${res.status}`), status: res.status, extra };
      }
      return { ok: true, data: json as T, status: res.status };
    } catch {
      return { ok: false, error: 'network_error', status: 0 };
    }
  }

  return {
    mint: (identity: VoiceSessionIdentity, language: string) =>
      call<VoiceMintResult>('mint', identity, { language }),
    heartbeat: (identity: VoiceSessionIdentity, voiceSessionId: string, elConversationId?: string | null) =>
      call<VoiceHeartbeatResult>('heartbeat', identity, {
        voice_session_id: voiceSessionId,
        ...(elConversationId ? { el_conversation_id: elConversationId } : {}),
      }),
    end: (
      identity: VoiceSessionIdentity,
      voiceSessionId: string,
      payload: { reason: string; durationMs?: number | null; metrics?: Record<string, unknown> },
      opts?: { keepalive?: boolean }
    ) =>
      call<VoiceEndResult>(
        'end',
        identity,
        {
          voice_session_id: voiceSessionId,
          reason: payload.reason,
          duration_ms: payload.durationMs ?? null,
          metrics: payload.metrics ?? {},
        },
        opts
      ),
  };
}

export type VoiceSessionClient = ReturnType<typeof createVoiceSessionClient>;

export function createDefaultVoiceSessionClient(): VoiceSessionClient {
  const { baseUrl, secret } = getOmafitCatalogRuntimeConfig();
  return createVoiceSessionClient({ baseUrl, secret });
}
