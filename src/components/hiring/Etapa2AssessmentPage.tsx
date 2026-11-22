import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { OmafitLogo } from '../landing/OmafitLogo';
import { PageSEO } from '../seo/PageSEO';
import { ETAPA2_CONFIG } from '../../content/hiring/etapa2/config';
import {
  CONSENT_TEXT,
  FORCED_CHOICE_BLOCKS,
  LIKERT_ITEMS,
  LIKERT_SCALE,
  OPEN_QUESTION,
} from '../../content/hiring/etapa2/questions';
import type { Etapa2Draft, Etapa2Screen } from '../../content/hiring/etapa2/types';
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

type Step =
  | 'identity'
  | 'instructions'
  | 'block'
  | 'likert'
  | 'open'
  | 'privacy'
  | 'thanks'
  | 'already_submitted'
  | 'expired';

function draftToStep(draft: Etapa2Draft): { step: Step; blockIndex: number } {
  if (draft.status === 'submitted') return { step: 'already_submitted', blockIndex: 0 };
  if (!draft.candidate.name.trim() || !draft.candidate.email.trim()) {
    return { step: 'identity', blockIndex: 0 };
  }
  const complete = draft.answers.forced_choice.filter((a) => a.most && a.least);
  if (complete.length === 0) return { step: 'instructions', blockIndex: 0 };
  for (let i = 0; i < 12; i += 1) {
    if (!complete.some((a) => a.block_id === `B${i + 1}`)) {
      return { step: 'block', blockIndex: i };
    }
  }
  if (draft.answers.likert.length < 5) return { step: 'likert', blockIndex: 11 };
  if (!draft.answers.open?.text?.trim()) return { step: 'open', blockIndex: 11 };
  if (!draft.consent.accepted) return { step: 'privacy', blockIndex: 11 };
  return { step: 'privacy', blockIndex: 11 };
}

export function Etapa2AssessmentPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');

  const [draft, setDraft] = useState<Etapa2Draft>(() => createEmptyDraft(inviteToken));
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>('identity');
  const [blockIndex, setBlockIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);
  const [talentBank, setTalentBank] = useState(false);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    if (isDeadlinePassed()) {
      setStep('expired');
      setHydrated(true);
      return;
    }

    const existing = loadDraft(inviteToken);
    if (existing?.status === 'submitted') {
      setDraft(existing);
      setStep('already_submitted');
    } else if (existing) {
      setDraft(existing);
      setAgree(existing.consent.accepted);
      setTalentBank(existing.consent.talent_bank_opt_in);
      const resume = draftToStep(existing);
      setStep(resume.step);
      setBlockIndex(resume.blockIndex);
      const hasProgress =
        !!existing.candidate.name ||
        existing.answers.forced_choice.length > 0 ||
        existing.answers.likert.length > 0;
      if (hasProgress) setShowResume(true);
    } else {
      setDraft(createEmptyDraft(inviteToken));
      setStep('identity');
    }
    setHydrated(true);
  }, [inviteToken]);

  const persist = (
    updater: (prev: Etapa2Draft) => Etapa2Draft,
    options?: { syncRemote?: boolean },
  ) => {
    setDraft((prev) => {
      const next = updater(prev);
      const withMeta: Etapa2Draft = {
        ...next,
        timestamps: {
          ...next.timestamps,
          started_at: next.timestamps.started_at ?? nowIso(),
        },
      };
      const saved = saveDraft(withMeta);
      if (options?.syncRemote !== false) void upsertProgress(saved);
      return saved;
    });
  };

  const go = (next: Step, nextBlock = blockIndex) => {
    setError(null);
    setShowResume(false);
    setStep(next);
    setBlockIndex(nextBlock);
    persist((prev) => ({
      ...prev,
      screen: next as Etapa2Screen,
      blockIndex: nextBlock,
      welcomeBackSeen: true,
    }), { syncRemote: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Progress: 12 blocos + likert + open + privacy = 15 etapas de pergunta
  const questionStep =
    step === 'block'
      ? blockIndex + 1
      : step === 'likert'
        ? 13
        : step === 'open'
          ? 14
          : step === 'privacy'
            ? 15
            : null;
  const questionTotal = 15;

  const currentBlock = FORCED_CHOICE_BLOCKS[blockIndex];

  const likertMap = useMemo(() => {
    const map = new Map<string, number>();
    draft.answers.likert.forEach((a) => map.set(a.item_id, a.value));
    return map;
  }, [draft.answers.likert]);

  const openText = draft.answers.open?.text ?? '';
  const blockAnswer = draft.answers.forced_choice.find((a) => a.block_id === currentBlock?.id);

  const setMostLeast = (statementId: string, kind: 'most' | 'least') => {
    if (!currentBlock) return;
    persist((prev) => {
      const current = prev.answers.forced_choice.find((a) => a.block_id === currentBlock.id);
      let most = current?.most ?? '';
      let least = current?.least ?? '';
      if (kind === 'most') {
        if (least === statementId) least = '';
        most = statementId;
      } else {
        if (most === statementId) most = '';
        least = statementId;
      }
      const others = prev.answers.forced_choice.filter((a) => a.block_id !== currentBlock.id);
      const entry =
        most || least
          ? [{ block_id: currentBlock.id, most, least, answered_at: nowIso() }]
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

  const handleIdentityNext = () => {
    if (!draft.candidate.name.trim()) {
      setError('Informe seu nome completo.');
      return;
    }
    if (!EMAIL_RE.test(draft.candidate.email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    go('instructions');
  };

  const handleBlockNext = () => {
    if (!currentBlock) return;
    const ans = draft.answers.forced_choice.find((a) => a.block_id === currentBlock.id);
    if (!ans?.most || !ans?.least) {
      setError('Marque 1 frase como MAIS e 1 frase como MENOS para continuar.');
      return;
    }
    if (ans.most === ans.least) {
      setError('Escolha frases diferentes para MAIS e MENOS.');
      return;
    }
    persist((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        forced_choice: prev.answers.forced_choice.filter((a) => a.most && a.least),
      },
    }));
    if (blockIndex >= 11) go('likert', 11);
    else go('block', blockIndex + 1);
  };

  const handleLikertNext = () => {
    if (LIKERT_ITEMS.some((item) => !likertMap.has(item.id))) {
      setError('Responda todas as frases para continuar.');
      return;
    }
    go('open');
  };

  const handleOpenNext = () => {
    const text = openText.trim();
    if (!text) {
      setError('Escreva sua resposta para continuar.');
      return;
    }
    if (text.length < OPEN_QUESTION.minChars) {
      setError(`Escreva pelo menos ${OPEN_QUESTION.minChars} caracteres.`);
      return;
    }
    go('privacy');
  };

  const handleSubmit = async () => {
    if (!agree) {
      setError('Marque “Li e concordo” para enviar.');
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

    setDraft(saveDraft(ready));
    setStep('thanks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setError(null);
    if (step === 'instructions') go('identity');
    else if (step === 'block') {
      if (blockIndex === 0) go('instructions');
      else go('block', blockIndex - 1);
    } else if (step === 'likert') go('block', 11);
    else if (step === 'open') go('likert');
    else if (step === 'privacy') go('open');
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-neutral-800">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
        <span className="sr-only">Carregando…</span>
      </div>
    );
  }

  const showProgress = questionStep !== null;

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 antialiased">
      <PageSEO
        title={ETAPA2_CONFIG.pageTitle}
        description="Etapa 2 do processo seletivo — teste de estilo de trabalho."
        path="/processo-seletivo/etapa-2"
        noindex
      />

      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-xl px-4 py-3 sm:px-6">
          <div className={`flex items-center ${showProgress ? 'justify-between gap-4' : ''}`}>
            <OmafitLogo variant="onLight" className="text-[20px]" />
            {showProgress && (
              <span className="shrink-0 text-xs text-neutral-500">
                Etapa {questionStep} de {questionTotal}
              </span>
            )}
          </div>
          {showProgress && (
            <div className="mt-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-neutral-200"
                role="progressbar"
                aria-valuenow={questionStep ?? 0}
                aria-valuemin={0}
                aria-valuemax={questionTotal}
                aria-label={`Progresso: etapa ${questionStep} de ${questionTotal}`}
              >
                <div
                  className="h-full rounded-full bg-neutral-800 transition-all duration-300"
                  style={{ width: `${((questionStep ?? 0) / questionTotal) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        {showResume && step !== 'thanks' && step !== 'already_submitted' && step !== 'expired' && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
            <p className="font-medium text-neutral-900">Bem-vindo(a) de volta!</p>
            <p className="mt-1 text-neutral-600">
              Suas respostas foram salvas. Continue de onde parou.
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-neutral-900 underline"
              onClick={() => {
                const resume = draftToStep(draft);
                go(resume.step, resume.blockIndex);
              }}
            >
              Continuar
            </button>
          </div>
        )}

        {step === 'expired' && (
          <StatusCard
            title="Prazo encerrado"
            body={`O prazo para responder a este teste terminou. Se houve algum imprevisto, fale com a gente: ${ETAPA2_CONFIG.contactEmail}.`}
          />
        )}

        {step === 'already_submitted' && (
          <StatusCard
            title="Teste já respondido"
            body={`Este teste já foi respondido. Obrigado! Dúvidas: ${ETAPA2_CONFIG.contactEmail}.`}
          />
        )}

        {step === 'thanks' && (
          <section className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
              <CheckCircle2 className="h-6 w-6 text-neutral-800" aria-hidden />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Respostas enviadas. Obrigado!
            </h1>
            <p className="text-neutral-600 leading-relaxed">
              Recebemos suas respostas
              {draft.candidate.name ? `, ${draft.candidate.name.split(' ')[0]}` : ''}. Obrigado pelo
              tempo dedicado ao processo.
            </p>
            <p className="text-neutral-600 leading-relaxed">
              Entraremos em contato pelo e-mail informado até {ETAPA2_CONFIG.contactByDateLabel}.
            </p>
            <p className="text-xs text-neutral-500">
              Dúvidas:{' '}
              <a className="underline" href={`mailto:${ETAPA2_CONFIG.contactEmail}`}>
                {ETAPA2_CONFIG.contactEmail}
              </a>
            </p>
          </section>
        )}

        {step === 'identity' && (
          <section className="space-y-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Processo seletivo – {ETAPA2_CONFIG.roleTitle}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
                Etapa 2 – Teste de estilo de trabalho
              </h1>
              <p className="mt-2 text-neutral-600">
                Precisamos só de duas informações para vincular suas respostas à sua candidatura.
              </p>
            </div>
            <div className="space-y-4">
              <Field
                label="Nome completo"
                id="candidate-name"
                autoComplete="name"
                value={draft.candidate.name}
                maxLength={120}
                onChange={(v) =>
                  persist(
                    (prev) => ({ ...prev, candidate: { ...prev.candidate, name: v } }),
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
                    (prev) => ({ ...prev, candidate: { ...prev.candidate, email: v } }),
                    { syncRemote: false },
                  )
                }
              />
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <NavRow hideBack onNext={handleIdentityNext} nextLabel="Continuar" />
          </section>
        )}

        {step === 'instructions' && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Como funciona
              </h1>
              <p className="mt-3 text-neutral-600 leading-relaxed">
                <strong className="text-neutral-900">Tempo estimado: 8 a 10 minutos.</strong> A
                avaliação é dividida em três partes curtas.
              </p>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-600 leading-relaxed">
              <li>Escolha um ambiente tranquilo e responda com atenção.</li>
              <li>Seja espontâneo e sincero — não existem respostas certas ou erradas.</li>
              <li>Não tente identificar a resposta “ideal”; queremos seu comportamento natural.</li>
              <li>Confie na primeira impressão.</li>
            </ul>
            <div className="space-y-3 text-sm text-neutral-600 leading-relaxed">
              <p>
                <strong className="text-neutral-900">Parte A (~5 min):</strong> 12 blocos — marque 1
                frase MAIS e 1 MENOS parecida com você.
              </p>
              <p>
                <strong className="text-neutral-900">Parte B (~1 min):</strong> 5 afirmações de 1 a
                5.
              </p>
              <p>
                <strong className="text-neutral-900">Parte C (~3 min):</strong> uma pergunta aberta
                em 3 a 5 linhas.
              </p>
            </div>
            <p className="text-xs text-neutral-500">
              Suas respostas são salvas automaticamente. Se precisar sair, abra o mesmo link para
              continuar.
            </p>
            <NavRow onBack={handleBack} onNext={() => go('block', 0)} nextLabel="Iniciar o teste" />
          </section>
        )}

        {step === 'block' && currentBlock && (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Parte A – Escolha forçada · Bloco {currentBlock.number} de 12
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                {currentBlock.stem}
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Marque 1 frase MAIS parecida com você e 1 frase MENOS parecida com você.
              </p>
            </div>
            <div className="space-y-3">
              {currentBlock.statements.map((s) => {
                const isMost = blockAnswer?.most === s.id;
                const isLeast = blockAnswer?.least === s.id;
                return (
                  <div
                    key={s.id}
                    className={`rounded-lg border p-4 ${
                      isMost
                        ? 'border-neutral-900 bg-neutral-50'
                        : isLeast
                          ? 'border-neutral-300 bg-neutral-50'
                          : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <p className="text-sm leading-relaxed text-neutral-900">
                      <span className="mr-2 font-semibold">{s.letter}.</span>
                      {s.text}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <ChoiceChip
                        active={isMost}
                        label="MAIS"
                        onClick={() => setMostLeast(s.id, 'most')}
                      />
                      <ChoiceChip
                        active={isLeast}
                        label="MENOS"
                        muted
                        onClick={() => setMostLeast(s.id, 'least')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <NavRow
              onBack={handleBack}
              onNext={handleBlockNext}
              nextLabel={blockIndex >= 11 ? 'Ir para a Parte B' : 'Próximo'}
            />
          </section>
        )}

        {step === 'likert' && (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Parte B – Proatividade, autonomia e foco
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                Indique de 1 a 5
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                1 = Discordo totalmente · 5 = Concordo totalmente
              </p>
            </div>
            <div className="space-y-4">
              {LIKERT_ITEMS.map((item) => {
                const value = likertMap.get(item.id);
                return (
                  <div key={item.id} className="rounded-lg border border-neutral-200 p-4">
                    <p className="text-sm leading-relaxed text-neutral-900">{item.text}</p>
                    <div className="mt-3 flex justify-between text-[10px] text-neutral-500 sm:text-xs">
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
                            aria-pressed={active}
                            aria-label={`${opt.value}: ${opt.label}`}
                            onClick={() => setLikert(item.id, opt.value)}
                            className={`flex h-11 min-h-[44px] items-center justify-center rounded-md border text-sm font-semibold ${
                              active
                                ? 'border-neutral-900 bg-neutral-900 text-white'
                                : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-400'
                            }`}
                          >
                            {opt.value}
                          </button>
                        );
                      })}
                    </div>
                    {value != null && (
                      <p className="mt-2 text-center text-xs text-neutral-600">
                        {LIKERT_SCALE.find((s) => s.value === value)?.label}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <NavRow onBack={handleBack} onNext={handleLikertNext} nextLabel="Ir para a Parte C" />
          </section>
        )}

        {step === 'open' && (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Parte C – Pergunta situacional
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                Sua resposta
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">{OPEN_QUESTION.text}</p>
            </div>
            <div>
              <textarea
                id="open-answer"
                rows={6}
                value={openText}
                placeholder={OPEN_QUESTION.placeholder}
                onChange={(e) => {
                  const text = e.target.value;
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
                }}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              />
              <p className="mt-1 text-right text-xs text-neutral-500">
                {openText.length}/{OPEN_QUESTION.maxChars} caracteres
              </p>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <NavRow onBack={handleBack} onNext={handleOpenNext} nextLabel="Continuar" />
          </section>
        )}

        {step === 'privacy' && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                Privacidade e envio
              </h1>
              <p className="mt-2 text-neutral-600">
                Antes de enviar, leia como tratamos seus dados e confirme o consentimento.
              </p>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <h2 className="text-sm font-semibold text-neutral-900">
                Privacidade e uso dos dados (LGPD)
              </h2>
              <div className="mt-3 max-h-40 overflow-y-auto rounded-md border border-neutral-200 bg-white p-3 text-sm leading-relaxed text-neutral-600">
                {CONSENT_TEXT}
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-neutral-900">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 rounded border-neutral-300"
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
                  Li e concordo. <span className="text-neutral-500">(obrigatório)</span>
                </span>
              </label>

              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 rounded border-neutral-300"
                  checked={talentBank}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTalentBank(checked);
                    persist((prev) => ({
                      ...prev,
                      consent: { ...prev.consent, talent_bank_opt_in: checked },
                    }));
                  }}
                />
                <span>
                  Autorizo manter meus dados no banco de talentos por até 2 anos (opcional).
                </span>
              </label>
            </div>

            <p className="text-xs text-neutral-500">
              Dúvidas:{' '}
              <a className="underline" href={`mailto:${ETAPA2_CONFIG.contactEmail}`}>
                {ETAPA2_CONFIG.contactEmail}
              </a>
            </p>

            {error && <ErrorText>{error}</ErrorText>}

            <NavRow
              onBack={handleBack}
              onNext={() => {
                if (!agree) {
                  setError('Marque “Li e concordo” para enviar.');
                  return;
                }
                setError(null);
                setConfirmSubmit(true);
              }}
              nextLabel="Enviar respostas"
              nextDisabled={submitting || !agree}
            />
          </section>
        )}
      </main>

      {confirmSubmit && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
        >
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-lg">
            <h2 id="confirm-submit-title" className="text-lg font-semibold text-neutral-900">
              Tudo pronto?
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Depois de enviar, não será possível alterar as respostas.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmSubmit(false)}
                className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Revisar
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  'Enviar'
                )}
              </button>
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-900">
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
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
      />
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  hideBack,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      {!hideBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-start gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 sm:w-auto"
      >
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ChoiceChip({
  active,
  label,
  onClick,
  muted,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-[44px] min-w-[88px] rounded-md border px-3 text-xs font-semibold tracking-wide ${
        active
          ? muted
            ? 'border-neutral-500 bg-neutral-200 text-neutral-900'
            : 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500'
      }`}
    >
      {label}
    </button>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
      {children}
    </p>
  );
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center">
      <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">{body}</p>
    </section>
  );
}

export default Etapa2AssessmentPage;
