import type { Etapa2Draft } from '../../content/hiring/etapa2/types';
import { ETAPA2_CONFIG } from '../../content/hiring/etapa2/config';
import { buildEtapa2EmailContent } from './etapa2EmailBody';

export type SubmitResult =
  | { ok: true; stored: 'email' | 'local' }
  | { ok: false; message: string };

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

export async function submitEtapa2Response(draft: Etapa2Draft): Promise<SubmitResult> {
  archiveLocally(draft);

  const { subject, text } = buildEtapa2EmailContent(draft);
  const candidate_name = draft.candidate.name.trim();
  const candidate_email = draft.candidate.email.trim().toLowerCase();

  try {
    const res = await fetch('/.netlify/functions/hiring-etapa2-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        text,
        candidate_name,
        candidate_email,
        response_id: draft.response_id,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

    if (!res.ok || !data.ok) {
      console.warn('[etapa2] email submit failed:', data.error || res.status);
      return {
        ok: false,
        message:
          'Não conseguimos enviar suas respostas por e-mail. Verifique a conexão e tente de novo. Suas respostas continuam guardadas neste dispositivo.',
      };
    }

    return { ok: true, stored: 'email' };
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
