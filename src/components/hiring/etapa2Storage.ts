import { ETAPA2_CONFIG } from '../../content/hiring/etapa2/config';
import type { Etapa2Draft, Etapa2Screen } from '../../content/hiring/etapa2/types';

function storageKey(inviteToken: string | null): string {
  const suffix = inviteToken?.trim() || 'public';
  return `${ETAPA2_CONFIG.storageKeyPrefix}:${suffix}`;
}

function newResponseId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fallback abaixo */
  }
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyDraft(inviteToken: string | null): Etapa2Draft {
  return {
    response_id: newResponseId(),
    invite_token: inviteToken,
    questions_version: ETAPA2_CONFIG.questionsVersion,
    status: 'in_progress',
    candidate: { name: '', email: '' },
    consent: {
      accepted: false,
      accepted_at: null,
      talent_bank_opt_in: false,
      consent_text_version: ETAPA2_CONFIG.consentTextVersion,
    },
    answers: {
      forced_choice: [],
      likert: [],
      open: null,
    },
    blockIndex: 0,
    screen: 'form',
    timestamps: {
      started_at: null,
      last_saved_at: null,
      submitted_at: null,
    },
    welcomeBackSeen: true,
  };
}

export function loadDraft(inviteToken: string | null): Etapa2Draft | null {
  try {
    const raw = localStorage.getItem(storageKey(inviteToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Etapa2Draft;
    if (!parsed?.response_id || !parsed?.status) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Etapa2Draft): Etapa2Draft {
  const next: Etapa2Draft = {
    ...draft,
    timestamps: {
      ...draft.timestamps,
      last_saved_at: new Date().toISOString(),
    },
  };
  try {
    localStorage.setItem(storageKey(draft.invite_token), JSON.stringify(next));
  } catch {
    // quota / private mode — UI still works in memory
  }
  return next;
}

export function clearDraft(inviteToken: string | null): void {
  try {
    localStorage.removeItem(storageKey(inviteToken));
  } catch {
    /* ignore */
  }
}

export function isDeadlinePassed(deadlineIso: string = ETAPA2_CONFIG.responseDeadlineIso): boolean {
  const deadline = Date.parse(deadlineIso);
  if (Number.isNaN(deadline)) return false;
  return Date.now() > deadline;
}

export function firstIncompleteScreen(draft: Etapa2Draft): {
  screen: Etapa2Screen;
  blockIndex: number;
} {
  if (draft.status === 'submitted') {
    return { screen: 'already_submitted', blockIndex: 0 };
  }
  return { screen: 'form', blockIndex: 0 };
}
