export type ForcedChoiceLetter = 'A' | 'B' | 'C' | 'D';

export type PublicStatement = {
  id: string;
  letter: ForcedChoiceLetter;
  text: string;
};

export type PublicForcedChoiceBlock = {
  id: string;
  number: number;
  stem: string;
  statements: PublicStatement[];
};

export type PublicLikertItem = {
  id: string;
  text: string;
};

export type LikertScaleLabel = {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
};

export type ForcedChoiceAnswer = {
  block_id: string;
  most: string;
  least: string;
  answered_at: string;
};

export type LikertAnswer = {
  item_id: string;
  value: number;
  answered_at: string;
};

export type OpenAnswer = {
  question_id: string;
  text: string;
  answered_at: string;
};

export type Etapa2Consent = {
  accepted: boolean;
  accepted_at: string | null;
  talent_bank_opt_in: boolean;
  consent_text_version: string;
};

export type Etapa2Candidate = {
  name: string;
  email: string;
};

export type Etapa2Status = 'in_progress' | 'submitted';

/** Estado de UI (formulário único ou telas finais). */
export type Etapa2Screen =
  | 'form'
  | 'thanks'
  | 'already_submitted'
  | 'expired'
  /** Legado do fluxo multi-tela (compat. localStorage antigo). */
  | 'welcome'
  | 'identity'
  | 'instructions'
  | 'block'
  | 'likert'
  | 'open';

export type Etapa2Draft = {
  response_id: string;
  invite_token: string | null;
  questions_version: string;
  status: Etapa2Status;
  candidate: Etapa2Candidate;
  consent: Etapa2Consent;
  answers: {
    forced_choice: ForcedChoiceAnswer[];
    likert: LikertAnswer[];
    open: OpenAnswer | null;
  };
  /** Índice do bloco atual (0–11) quando screen === 'block' */
  blockIndex: number;
  screen: Etapa2Screen;
  timestamps: {
    started_at: string | null;
    last_saved_at: string | null;
    submitted_at: string | null;
  };
  welcomeBackSeen: boolean;
};
