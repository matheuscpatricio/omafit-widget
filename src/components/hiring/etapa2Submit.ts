import { supabase } from '../../lib/supabase';
import type { Etapa2Draft } from '../../content/hiring/etapa2/types';
import { ETAPA2_CONFIG } from '../../content/hiring/etapa2/config';

export type SubmitResult =
  | { ok: true; stored: 'supabase' | 'local' }
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

/** Cópia local das submissões (útil enquanto o Supabase estiver indisponível). */
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
  const row = payloadFromDraft(draft);
  archiveLocally(draft);

  try {
    const { error } = await supabase.from('hiring_etapa2_responses' as never).upsert(row as never, {
      onConflict: 'id',
    });

    if (error) {
      console.warn('[etapa2] supabase upsert failed:', error.message);
      // Mantém arquivo local e informa que precisa sincronizar depois
      return {
        ok: true,
        stored: 'local',
      };
    }

    return { ok: true, stored: 'supabase' };
  } catch (err) {
    console.warn('[etapa2] submit exception:', err);
    return { ok: true, stored: 'local' };
  }
}

export async function upsertProgress(draft: Etapa2Draft): Promise<void> {
  if (draft.status === 'submitted') return;
  const row = {
    ...payloadFromDraft(draft),
    status: 'in_progress' as const,
    submitted_at: null,
  };

  try {
    await supabase.from('hiring_etapa2_responses' as never).upsert(row as never, {
      onConflict: 'id',
    });
  } catch {
    /* progresso fica no localStorage */
  }
}
