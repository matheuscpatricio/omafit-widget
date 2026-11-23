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

/** Backup local no navegador. */
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

/** Cópia no painel Netlify Forms (não envia e-mail sozinho). */
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

/**
 * Envio real para contato@omafit.co via FormSubmit (do navegador).
 * Na 1ª vez, o FormSubmit manda um e-mail de ATIVAÇÃO para contato@omafit.co —
 * é preciso abrir e confirmar o link; depois as respostas chegam normalmente.
 */
async function submitViaFormSubmit(input: {
  subject: string;
  text: string;
  candidate_name: string;
  candidate_email: string;
  response_id: string;
}): Promise<{ ok: boolean; detail?: string }> {
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

    const data = (await res.json().catch(() => ({}))) as {
      success?: string | boolean;
      message?: string;
    };

    const success =
      res.ok &&
      (data.success === true ||
        data.success === 'true' ||
        (typeof data.message === 'string' && /sent|sucesso|success/i.test(data.message)));

    return {
      ok: success,
      detail: typeof data.message === 'string' ? data.message : undefined,
    };
  } catch (err) {
    console.warn('[etapa2] FormSubmit exception:', err);
    return { ok: false, detail: 'network_error' };
  }
}

async function submitViaResendFunction(input: {
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
    return res.ok && !!data.ok;
  } catch {
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
    // Arquivo no Netlify Forms (painel) — independente do e-mail
    void submitViaNetlifyForms(payload);

    // E-mail real para a caixa que o Grok lê
    const emailResult = await submitViaFormSubmit(payload);
    if (emailResult.ok) {
      void submitViaResendFunction(payload);
      return { ok: true, stored: 'email' };
    }

    // Fallback Resend (se RESEND_API_KEY estiver no Netlify)
    const resendOk = await submitViaResendFunction(payload);
    if (resendOk) {
      return { ok: true, stored: 'email' };
    }

    console.warn('[etapa2] email failed:', emailResult.detail);
    return {
      ok: false,
      message:
        'Não conseguimos enviar o e-mail agora. Se for a primeira vez, verifique em contato@omafit.co um e-mail de ativação do FormSubmit e confirme o link. Depois tente enviar de novo.',
    };
  } catch (err) {
    console.warn('[etapa2] submit exception:', err);
    return {
      ok: false,
      message:
        'Não conseguimos enviar suas respostas por e-mail. Verifique a conexão e tente de novo.',
    };
  }
}

/** Progresso só no dispositivo. */
export async function upsertProgress(_draft: Etapa2Draft): Promise<void> {
  /* no-op */
}
