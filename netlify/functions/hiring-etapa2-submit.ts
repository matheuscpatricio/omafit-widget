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
 * Envia o e-mail da Etapa 2 para contato@omafit.co.
 * 1) Resend (se RESEND_API_KEY)
 * 2) FormSubmit (formulário já ativado) — caminho principal sem chave
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
  const responseId = (body.response_id || '').trim();

  if (!subject || !text || !candidateEmail) {
    return json(400, { ok: false, error: 'Missing subject, text or candidate_email' });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
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
      if (res.ok) {
        return json(200, { ok: true, via: 'resend' });
      }
      console.error('[hiring-etapa2-submit] Resend error:', await res.text());
    } catch (err) {
      console.error('[hiring-etapa2-submit] Resend exception:', err);
    }
  }

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(TO_EMAIL)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://omafit.co',
        Referer: 'https://omafit.co/processo-seletivo/etapa-2',
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'box',
        _replyto: candidateEmail,
        _captcha: 'false',
        name: candidateName || candidateEmail,
        email: candidateEmail,
        response_id: responseId,
        message: text,
      }),
    });

    const raw = await res.text();
    let data: { success?: string | boolean; message?: string } = {};
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      /* ignore */
    }

    const successFlag = data.success === true || data.success === 'true';
    const msg = typeof data.message === 'string' ? data.message : '';
    const looksOk =
      res.ok &&
      (successFlag ||
        /submitted successfully|form was submitted|enviad/i.test(msg) ||
        (!/activation|activate form|html files/i.test(msg) && res.status >= 200 && res.status < 300));

    if (looksOk || successFlag) {
      return json(200, { ok: true, via: 'formsubmit', detail: msg || undefined });
    }

    console.error('[hiring-etapa2-submit] FormSubmit rejected:', res.status, raw);
    return json(502, { ok: false, error: 'Email provider failed', detail: msg || raw.slice(0, 300) });
  } catch (err) {
    console.error('[hiring-etapa2-submit] FormSubmit exception:', err);
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
