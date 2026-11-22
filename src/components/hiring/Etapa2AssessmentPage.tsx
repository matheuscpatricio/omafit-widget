import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { OmafitLogo } from '../landing/OmafitLogo';
import { Button } from '../ui/button';
import { PageSEO } from '../seo/PageSEO';
import { ETAPA2_CONFIG } from '../../content/hiring/etapa2/config';
import {
  CONSENT_TEXT,
  FORCED_CHOICE_BLOCKS,
  LIKERT_ITEMS,
  LIKERT_SCALE,
  OPEN_QUESTION,
} from '../../content/hiring/etapa2/questions';
import type { Etapa2Draft } from '../../content/hiring/etapa2/types';
import {
  createEmptyDraft,
  isDeadlinePassed,
  loadDraft,
  saveDraft,
} from './etapa2Storage';
import { submitEtapa2Response, upsertProgress } from './etapa2Submit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nowIso() {
  return new Date().toISOString();
}

type View = 'form' | 'thanks' | 'already_submitted' | 'expired';

export function Etapa2AssessmentPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');

  const [draft, setDraft] = useState<Etapa2Draft>(() => createEmptyDraft(inviteToken));
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>('form');
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);
  const [talentBank, setTalentBank] = useState(false);

  useEffect(() => {
    if (isDeadlinePassed()) {
      setView('expired');
      setHydrated(true);
      return;
    }

    const existing = loadDraft(inviteToken);
    if (existing?.status === 'submitted') {
      setDraft(existing);
      setView('already_submitted');
    } else if (existing) {
      setDraft({ ...existing, screen: 'form', welcomeBackSeen: true });
      setAgree(existing.consent.accepted);
      setTalentBank(existing.consent.talent_bank_opt_in);
      setView('form');
    } else {
      setDraft(createEmptyDraft(inviteToken));
      setView('form');
    }
    setHydrated(true);
  }, [inviteToken]);

  /** Atualização funcional — evita perder teclas no nome/e-mail por closure atrasada. */
  const persist = (
    updater: (prev: Etapa2Draft) => Etapa2Draft,
    options?: { syncRemote?: boolean },
  ) => {
    setDraft((prev) => {
      const next = updater(prev);
      const withStart: Etapa2Draft = {
        ...next,
        screen: 'form',
        timestamps: {
          ...next.timestamps,
          started_at: next.timestamps.started_at ?? nowIso(),
        },
      };
      const saved = saveDraft(withStart);
      if (options?.syncRemote !== false) {
        void upsertProgress(saved);
      }
      return saved;
    });
  };

  const likertMap = useMemo(() => {
    const map = new Map<string, number>();
    draft.answers.likert.forEach((a) => map.set(a.item_id, a.value));
    return map;
  }, [draft.answers.likert]);

  const openText = draft.answers.open?.text ?? '';

  const blockAnswer = (blockId: string) =>
    draft.answers.forced_choice.find((a) => a.block_id === blockId);

  const setMostLeast = (blockId: string, statementId: string, kind: 'most' | 'least') => {
    persist((prev) => {
      const current = prev.answers.forced_choice.find((a) => a.block_id === blockId);
      let most = current?.most ?? '';
      let least = current?.least ?? '';

      if (kind === 'most') {
        if (least === statementId) least = '';
        most = statementId;
      } else {
        if (most === statementId) most = '';
        least = statementId;
      }

      const others = prev.answers.forced_choice.filter((a) => a.block_id !== blockId);
      const entry =
        most || least
          ? [{ block_id: blockId, most, least, answered_at: nowIso() }]
          : [];

      return {
        ...prev,
        answers: { ...prev.answers, forced_choice: [...others, ...entry] },
      };
    });
  };

  const setLikert = (itemId: string, value: number) => {
    persist((prev) => {
      const others = prev.answers.likert.filter((a) => a.item_id !== itemId);
      return {
        ...prev,
        answers: {
          ...prev.answers,
          likert: [...others, { item_id: itemId, value, answered_at: nowIso() }],
        },
      };
    });
  };

  const handleOpenChange = (text: string) => {
    if (text.length > OPEN_QUESTION.maxChars) return;
    persist(
      (prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          open: {
            question_id: OPEN_QUESTION.id,
            text,
            answered_at: nowIso(),
          },
        },
      }),
      { syncRemote: false },
    );
  };

  const validate = (): string | null => {
    if (!draft.candidate.name.trim()) return 'Informe seu nome completo.';
    if (!EMAIL_RE.test(draft.candidate.email.trim())) return 'Informe um e-mail válido.';

    for (const block of FORCED_CHOICE_BLOCKS) {
      const ans = blockAnswer(block.id);
      if (!ans?.most || !ans?.least) {
        return `No bloco ${block.number}, marque 1 frase como MAIS e 1 como MENOS.`;
      }
      if (ans.most === ans.least) {
        return `No bloco ${block.number}, escolha frases diferentes para MAIS e MENOS.`;
      }
    }

    if (LIKERT_ITEMS.some((item) => !likertMap.has(item.id))) {
      return 'Responda todas as frases da Parte B.';
    }

    const text = openText.trim();
    if (!text) return 'Escreva sua resposta da Parte C para enviar.';
    if (text.length < OPEN_QUESTION.minChars) {
      return `Na Parte C, escreva pelo menos ${OPEN_QUESTION.minChars} caracteres.`;
    }
    if (openText.length > OPEN_QUESTION.maxChars) {
      return 'Sua resposta passou do limite de 600 caracteres.';
    }

    if (!agree) return 'Marque “Li e concordo” para enviar.';

    return null;
  };

  const requestSubmit = () => {
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setConfirmSubmit(true);
  };

  const handleSubmit = async () => {
    const message = validate();
    if (message) {
      setError(message);
      setConfirmSubmit(false);
      return;
    }

    setSubmitting(true);
    setError(null);
    const submittedAt = nowIso();
    const acceptedAt = draft.consent.accepted_at ?? submittedAt;

    const ready: Etapa2Draft = {
      ...draft,
      status: 'submitted',
      screen: 'thanks',
      consent: {
        accepted: true,
        accepted_at: acceptedAt,
        talent_bank_opt_in: talentBank,
        consent_text_version: ETAPA2_CONFIG.consentTextVersion,
      },
      timestamps: {
        ...draft.timestamps,
        started_at: draft.timestamps.started_at ?? acceptedAt,
        submitted_at: submittedAt,
        last_saved_at: submittedAt,
      },
      answers: {
        forced_choice: draft.answers.forced_choice.filter((a) => a.most && a.least),
        likert: draft.answers.likert,
        open: {
          question_id: OPEN_QUESTION.id,
          text: openText.trim(),
          answered_at: draft.answers.open?.answered_at ?? submittedAt,
        },
      },
    };

    const result = await submitEtapa2Response(ready);
    setSubmitting(false);
    setConfirmSubmit(false);

    if (!result.ok) {
      setError(
        'Não conseguimos salvar agora. Verifique sua conexão e tente de novo. Suas respostas continuam guardadas neste dispositivo.',
      );
      return;
    }

    const saved = saveDraft(ready);
    setDraft(saved);
    setView('thanks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!hydrated) {
    return (
      <div className="landing-page flex min-h-screen items-center justify-center bg-oma-canvas text-oma-cream">
        <Loader2 className="h-8 w-8 animate-spin text-oma-accent" aria-hidden />
        <span className="sr-only">Carregando…</span>
      </div>
    );
  }

  return (
    <div className="landing-page min-h-screen bg-oma-canvas text-oma-cream antialiased">
      <PageSEO
        title={ETAPA2_CONFIG.pageTitle}
        description="Etapa 2 do processo seletivo Omafit — teste de estilo de trabalho."
        path="/processo-seletivo/etapa-2"
        noindex
      />

      <header className="border-b border-oma-line/40 bg-oma-elevated/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4 sm:px-6">
          <OmafitLogo variant="onDark" className="text-[20px]" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {view === 'expired' && (
          <StatusCard
            title="Prazo encerrado"
            body={`O prazo para responder a este teste terminou. Se houve algum imprevisto, fale com a gente: ${ETAPA2_CONFIG.contactEmail}.`}
          />
        )}

        {view === 'already_submitted' && (
          <StatusCard
            title="Teste já respondido"
            body={`Este teste já foi respondido. Obrigado! Dúvidas: ${ETAPA2_CONFIG.contactEmail}.`}
          />
        )}

        {view === 'thanks' && (
          <section className="space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-oma-accent/40 bg-oma-accent/15">
              <CheckCircle2 className="h-7 w-7 text-oma-accent" aria-hidden />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Respostas enviadas. Obrigado!</h1>
            <p className="text-oma-muted leading-relaxed">
              Recebemos suas respostas, {draft.candidate.name.split(' ')[0] || 'candidato(a)'}.
              Obrigado pelo tempo dedicado ao processo da Omafit.
            </p>
            <p className="text-oma-muted leading-relaxed">
              Os sócios vão analisar todas as candidaturas com os mesmos critérios e entraremos em
              contato pelo e-mail informado até {ETAPA2_CONFIG.contactByDateLabel}.
            </p>
            <p className="text-xs text-oma-muted">
              Dúvidas ou pedidos sobre seus dados:{' '}
              <a
                className="text-oma-accent hover:underline"
                href={`mailto:${ETAPA2_CONFIG.contactEmail}`}
              >
                {ETAPA2_CONFIG.contactEmail}
              </a>
              .
            </p>
          </section>
        )}

        {view === 'form' && (
          <div className="space-y-10">
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-oma-accent">
                Processo seletivo – {ETAPA2_CONFIG.roleTitle}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Etapa 2 – Teste de estilo de trabalho
              </h1>
              <p className="text-oma-muted leading-relaxed">
                Tempo estimado: 8 a 10 minutos. São três partes curtas. Não existem respostas certas
                ou erradas — responda de forma espontânea, como você realmente age no trabalho.
              </p>
            </section>

            {/* Identificação — topo */}
            <section className="space-y-4 rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-oma-cream">Seus dados</h2>
              <Field
                label="Nome completo"
                id="candidate-name"
                autoComplete="name"
                value={draft.candidate.name}
                maxLength={120}
                onChange={(v) =>
                  persist(
                    (prev) => ({
                      ...prev,
                      candidate: { ...prev.candidate, name: v },
                    }),
                    { syncRemote: false },
                  )
                }
              />
              <Field
                label="E-mail"
                id="candidate-email"
                type="email"
                autoComplete="email"
                value={draft.candidate.email}
                onChange={(v) =>
                  persist(
                    (prev) => ({
                      ...prev,
                      candidate: { ...prev.candidate, email: v },
                    }),
                    { syncRemote: false },
                  )
                }
              />
            </section>

            {/* Parte A */}
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-oma-cream">
                  Parte A — Escolha de comportamentos
                </h2>
                <p className="mt-1 text-sm text-oma-muted">
                  Em cada bloco, marque 1 frase MAIS parecida com você e 1 frase MENOS parecida com
                  você.
                </p>
              </div>

              {FORCED_CHOICE_BLOCKS.map((block) => {
                const ans = blockAnswer(block.id);
                return (
                  <div
                    key={block.id}
                    className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-4 sm:p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-oma-accent">
                      Bloco {block.number} de 12
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-oma-cream">{block.stem}</h3>
                    <div className="mt-4 space-y-3">
                      {block.statements.map((s) => {
                        const isMost = ans?.most === s.id;
                        const isLeast = ans?.least === s.id;
                        return (
                          <div
                            key={s.id}
                            className={`rounded-xl border p-3 transition-colors ${
                              isMost
                                ? 'border-oma-accent/50 bg-oma-accent/10'
                                : isLeast
                                  ? 'border-oma-line/60 bg-oma-canvas/50'
                                  : 'border-oma-line/35 bg-oma-canvas/40'
                            }`}
                          >
                            <p className="text-sm leading-relaxed text-oma-cream">
                              <span className="mr-2 font-semibold text-oma-accent">{s.letter}.</span>
                              {s.text}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <ChoiceChip
                                active={isMost}
                                label="MAIS"
                                ariaLabel={`Bloco ${block.number}, frase ${s.letter}: MAIS`}
                                onClick={() => setMostLeast(block.id, s.id, 'most')}
                              />
                              <ChoiceChip
                                active={isLeast}
                                label="MENOS"
                                tone="muted"
                                ariaLabel={`Bloco ${block.number}, frase ${s.letter}: MENOS`}
                                onClick={() => setMostLeast(block.id, s.id, 'least')}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Parte B */}
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-oma-cream">
                  Parte B — Escala de concordância
                </h2>
                <p className="mt-1 text-sm text-oma-muted">
                  Indique de 1 (discordo totalmente) a 5 (concordo totalmente).
                </p>
              </div>

              {LIKERT_ITEMS.map((item) => {
                const value = likertMap.get(item.id);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-4"
                  >
                    <p className="text-sm leading-relaxed text-oma-cream">{item.text}</p>
                    <div className="mt-3 flex justify-between gap-1 text-[10px] text-oma-muted sm:text-xs">
                      <span>Discordo totalmente</span>
                      <span>Concordo totalmente</span>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {LIKERT_SCALE.map((opt) => {
                        const active = value === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            aria-label={`${opt.value}: ${opt.label}`}
                            aria-pressed={active}
                            onClick={() => setLikert(item.id, opt.value)}
                            className={`flex h-11 min-h-[44px] items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                              active
                                ? 'border-oma-accent bg-oma-accent text-oma-cream'
                                : 'border-oma-line/50 bg-oma-canvas/70 text-oma-cream hover:border-oma-accent/40'
                            }`}
                          >
                            {opt.value}
                          </button>
                        );
                      })}
                    </div>
                    {value != null && (
                      <p className="mt-2 text-center text-xs text-oma-accent">
                        {LIKERT_SCALE.find((s) => s.value === value)?.label}
                      </p>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Parte C */}
            <section className="space-y-3">
              <div>
                <h2 className="text-xl font-semibold text-oma-cream">Parte C — Resposta aberta</h2>
                <p className="mt-2 text-sm leading-relaxed text-oma-muted">{OPEN_QUESTION.text}</p>
              </div>
              <textarea
                id="open-answer"
                rows={6}
                value={openText}
                placeholder={OPEN_QUESTION.placeholder}
                onChange={(e) => handleOpenChange(e.target.value)}
                className="w-full rounded-2xl border border-oma-line/50 bg-oma-canvas/80 px-4 py-3 text-oma-cream shadow-inner placeholder:text-oma-muted/55 focus:border-oma-accent/50 focus:outline-none focus:ring-2 focus:ring-oma-accent/35"
              />
              <p className="text-right text-xs text-oma-muted">
                {openText.length}/{OPEN_QUESTION.maxChars} caracteres
              </p>
            </section>

            {/* Privacidade — acima do enviar */}
            <section className="space-y-4 rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-oma-cream">
                Privacidade e uso dos dados (LGPD)
              </h2>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-oma-line/30 bg-oma-canvas/60 p-4 text-sm leading-relaxed text-oma-muted">
                {CONSENT_TEXT}
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-sm text-oma-cream">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 rounded border-oma-line accent-[var(--color-accent,#D96845)]"
                  checked={agree}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAgree(checked);
                    persist((prev) => ({
                      ...prev,
                      consent: {
                        ...prev.consent,
                        accepted: checked,
                        accepted_at: checked ? prev.consent.accepted_at ?? nowIso() : null,
                        talent_bank_opt_in: talentBank,
                      },
                    }));
                  }}
                />
                <span>
                  Li e concordo. <span className="text-oma-accent">(obrigatório)</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 text-sm text-oma-muted">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 rounded border-oma-line accent-[var(--color-accent,#D96845)]"
                  checked={talentBank}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTalentBank(checked);
                    persist((prev) => ({
                      ...prev,
                      consent: {
                        ...prev.consent,
                        talent_bank_opt_in: checked,
                      },
                    }));
                  }}
                />
                <span>
                  Autorizo manter meus dados no banco de talentos da Omafit por até 2 anos
                  (opcional).
                </span>
              </label>

              <p className="text-xs text-oma-muted">
                Dúvidas ou pedidos sobre seus dados:{' '}
                <a
                  className="text-oma-accent hover:underline"
                  href={`mailto:${ETAPA2_CONFIG.contactEmail}`}
                >
                  {ETAPA2_CONFIG.contactEmail}
                </a>
              </p>
            </section>

            {error && (
              <p
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              disabled={submitting}
              onClick={requestSubmit}
            >
              Enviar o teste
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      {confirmSubmit && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-oma-line/40 bg-oma-elevated p-6 shadow-elegant">
            <h2 id="confirm-submit-title" className="text-lg font-semibold text-oma-cream">
              Tudo pronto?
            </h2>
            <p className="mt-2 text-sm text-oma-muted">
              Depois de enviar, não será possível alterar as respostas.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => setConfirmSubmit(false)}
              >
                Revisar
              </Button>
              <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  'Enviar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
  maxLength,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-oma-cream">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-oma-line/50 bg-oma-canvas/80 px-4 py-3 text-oma-cream shadow-inner placeholder:text-oma-muted/55 focus:border-oma-accent/50 focus:outline-none focus:ring-2 focus:ring-oma-accent/35"
      />
    </div>
  );
}

function ChoiceChip({
  active,
  label,
  onClick,
  ariaLabel,
  tone = 'accent',
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  ariaLabel: string;
  tone?: 'accent' | 'muted';
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] min-w-[88px] rounded-xl border px-3 text-xs font-semibold tracking-wide transition-colors ${
        active
          ? tone === 'accent'
            ? 'border-oma-accent bg-oma-accent text-oma-cream'
            : 'border-oma-line bg-oma-line/40 text-oma-cream'
          : 'border-oma-line/50 bg-oma-canvas/50 text-oma-muted hover:border-oma-accent/40 hover:text-oma-cream'
      }`}
    >
      {label}
    </button>
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-6 text-center shadow-elegant">
      <h1 className="text-2xl font-semibold text-oma-cream">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-oma-muted">{body}</p>
    </section>
  );
}

export default Etapa2AssessmentPage;
