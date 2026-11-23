import type { Etapa2Draft } from '../../content/hiring/etapa2/types';
import { ETAPA2_CONFIG } from '../../content/hiring/etapa2/config';
import { buildEtapa2EmailContent } from './etapa2EmailBody';

export type SubmitResult =
  | { ok: true; stored: 'email' | 'local' }
  | { ok: false; message: string };

const NETLIFY_FORM_NAME = 'etapa2-avaliacao';
const EMAIL_TO = ETAPA2_CONFIG.contactEmail;

function payloadFromDraft(draft: Etapa2Draft) {
  return {
    id: draft.response_id,
    invite_token: draft.invite_token,
    questions_version: draft.questions_version,
    status: 'submitted' as const,
    candidate_name: draft.candidate.name.trim(),
    candidate_email: draft.candidate.email.trim().toLowerCase(),
    consent_accepted: draft.consent.accepted,
    consent_accepted_at: draft.consent.accepted_at,
    talent_bank_opt_in: draft.consent.talent_bank_opt_in,
    consent_text_version: draft.consent.consent_text_version,
    answers: draft.answers,
    started_at: draft.timestamps.started_at,
    last_saved_at: draft.timestamps.last_saved_at,
    submitted_at: draft.timestamps.submitted_at ?? new Date().toISOString(),
  };
}

function archiveLocally(draft: Etapa2Draft): void {
  const key = `${ETAPA2_CONFIG.storageKeyPrefix}:submissions`;
  try {
    const raw = localStorage.getItem(key);
    const list: unknown[] = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(list)
      ? list.filter((item) => (item as { id?: string })?.id !== draft.response_id)
      : [];
    filtered.push(payloadFromDraft(draft));
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
}

async function submitViaNetlifyForms(input: {
  subject: string;
  text: string;
  candidate_name: string;
  candidate_email: string;
  response_id: string;
}): Promise<boolean> {
  try {
    const body = new URLSearchParams();
    body.set('form-name', NETLIFY_FORM_NAME);
    body.set('subject', input.subject);
    body.set('candidate_name', input.candidate_name);
    body.set('candidate_email', input.candidate_email);
    body.set('response_id', input.response_id);
    body.set('message', input.text);

    const res = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Função Netlify (servidor) — evita bloqueio de CORS/adblock no celular. */
async function submitViaNetlifyFunction(input: {
  subject: string;
  text: string;
  candidate_name: string;
  candidate_email: string;
  response_id: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/.netlify/functions/hiring-etapa2-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return res.ok && data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Fallback direto no navegador.
 * HTTP 200 conta como sucesso (o FormSubmit às vezes envia o e-mail mesmo
 * quando o JSON de resposta vem atípico / bloqueado no mobile).
 */
async function submitViaFormSubmitBrowser(input: {
  subject: string;
  text: string;
  candidate_name: string;
  candidate_email: string;
  response_id: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(EMAIL_TO)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: input.subject,
        _template: 'box',
        _replyto: input.candidate_email,
        _captcha: 'false',
        name: input.candidate_name || input.candidate_email,
        email: input.candidate_email,
        response_id: input.response_id,
        message: input.text,
      }),
    });

    if (!res.ok) return false;

    const data = (await res.json().catch(() => null)) as {
      success?: string | boolean;
      message?: string;
    } | null;

    if (!data) {
      // Resposta ilegível, mas HTTP 200 — na prática o e-mail costuma ter sido aceito
      return true;
    }

    if (data.success === true || data.success === 'true') return true;

    const msg = typeof data.message === 'string' ? data.message : '';
    if (/activation|activate form|html files/i.test(msg)) return false;
    if (/submitted successfully|form was submitted|enviad|success/i.test(msg)) return true;

    // 200 sem mensagem de ativação → trata como enviado
    return true;
  } catch {
    // Rede/CORS no mobile: não dá para saber; deixa o caminho do servidor decidir
    return false;
  }
}

export async function submitEtapa2Response(draft: Etapa2Draft): Promise<SubmitResult> {
  archiveLocally(draft);

  const { subject, text } = buildEtapa2EmailContent(draft);
  const payload = {
    subject,
    text,
    candidate_name: draft.candidate.name.trim(),
    candidate_email: draft.candidate.email.trim().toLowerCase(),
    response_id: draft.response_id,
  };

  try {
    // Backup no painel Netlify Forms
    void submitViaNetlifyForms(payload);

    // 1) Preferir servidor (celular/adblock não quebram)
    if (await submitViaNetlifyFunction(payload)) {
      return { ok: true, stored: 'email' };
    }

    // 2) Fallback no navegador
    if (await submitViaFormSubmitBrowser(payload)) {
      return { ok: true, stored: 'email' };
    }

    return {
      ok: false,
      message:
        'Não foi possível confirmar o envio. Suas respostas ficaram salvas neste aparelho — toque em “Enviar respostas” de novo em alguns segundos. Se o problema continuar, avise pelo e-mail contato@omafit.co.',
    };
  } catch (err) {
    console.warn('[etapa2] submit exception:', err);
    return {
      ok: false,
      message:
        'Não foi possível confirmar o envio. Suas respostas ficaram salvas neste aparelho — toque em “Enviar respostas” de novo em alguns segundos.',
    };
  }
}

export async function upsertProgress(_draft: Etapa2Draft): Promise<void> {
  /* no-op */
}
