import type { Etapa2Draft } from '../../content/hiring/etapa2/types';
import { ETAPA2_CONFIG } from '../../content/hiring/etapa2/config';
import { buildEtapa2EmailContent } from './etapa2EmailBody';

export type SubmitResult =
  | { ok: true; stored: 'email' | 'local' }
  | { ok: false; message: string };

const NETLIFY_FORM_NAME = 'etapa2-avaliacao';

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

/** Backup local no navegador (não substitui o e-mail). */
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

  // Netlify Forms responde 200 em sucesso; 404 se o form ainda não foi detectado no build
  return res.ok;
}

async function submitViaNetlifyFunction(input: {
  subject: string;
  text: string;
  candidate_name: string;
  candidate_email: string;
  response_id: string;
}): Promise<boolean> {
  const res = await fetch('/.netlify/functions/hiring-etapa2-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
  return res.ok && !!data.ok;
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
    // 1) Netlify Forms → notificação por e-mail (contato@omafit.co no painel Netlify)
    const formsOk = await submitViaNetlifyForms(payload);
    if (formsOk) {
      // 2) Também tenta função (Resend), se configurada — não falha o fluxo se der erro
      void submitViaNetlifyFunction(payload);
      return { ok: true, stored: 'email' };
    }

    // Fallback: só a função (ex.: Resend com RESEND_API_KEY)
    const fnOk = await submitViaNetlifyFunction(payload);
    if (fnOk) {
      return { ok: true, stored: 'email' };
    }

    return {
      ok: false,
      message:
        'Não conseguimos enviar suas respostas por e-mail. Verifique a conexão e tente de novo. Suas respostas continuam guardadas neste dispositivo.',
    };
  } catch (err) {
    console.warn('[etapa2] submit exception:', err);
    return {
      ok: false,
      message:
        'Não conseguimos enviar suas respostas por e-mail. Verifique a conexão e tente de novo. Suas respostas continuam guardadas neste dispositivo.',
    };
  }
}

/** Progresso só no dispositivo — sem banco remoto. */
export async function upsertProgress(_draft: Etapa2Draft): Promise<void> {
  /* no-op */
}
