import type { Handler } from '@netlify/functions';

const TO_EMAIL = 'contato@omafit.co';

type Body = {
  subject?: string;
  text?: string;
  candidate_name?: string;
  candidate_email?: string;
  response_id?: string;
};

/**
 * Envio opcional via Resend (se RESEND_API_KEY estiver no Netlify).
 * O caminho principal é Netlify Forms no client; esta função é reforço.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  let body: Body;
  try {
    body = JSON.parse(event.body || '{}') as Body;
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  const subject = (body.subject || '').trim();
  const text = (body.text || '').trim();
  const candidateEmail = (body.candidate_email || '').trim();
  const candidateName = (body.candidate_name || '').trim();

  if (!subject || !text || !candidateEmail) {
    return json(400, { ok: false, error: 'Missing subject, text or candidate_email' });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    return json(503, {
      ok: false,
      error: 'RESEND_API_KEY not configured — use Netlify Forms path',
    });
  }

  try {
    const from =
      process.env.RESEND_FROM_EMAIL?.trim() || 'Omafit Avaliacao <onboarding@resend.dev>';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [TO_EMAIL],
        reply_to: candidateEmail,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('[hiring-etapa2-submit] Resend error:', detail);
      return json(502, { ok: false, error: 'Email provider failed', detail });
    }

    return json(200, {
      ok: true,
      via: 'resend',
      candidate_name: candidateName,
    });
  } catch (err) {
    console.error('[hiring-etapa2-submit] exception:', err);
    return json(500, { ok: false, error: 'Submit failed' });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(statusCode: number, payload: Record<string, unknown>) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
    body: JSON.stringify(payload),
  };
}
