import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
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
import type { Etapa2Draft, Etapa2Screen } from '../../content/hiring/etapa2/types';
import {
  createEmptyDraft,
  firstIncompleteScreen,
  isDeadlinePassed,
  loadDraft,
  progressStep,
  saveDraft,
} from './etapa2Storage';
import { submitEtapa2Response, upsertProgress } from './etapa2Submit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function nowIso() {
  return new Date().toISOString();
}

export function Etapa2AssessmentPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token');

  const [draft, setDraft] = useState<Etapa2Draft>(() => createEmptyDraft(inviteToken));
  const [hydrated, setHydrated] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [agree, setAgree] = useState(false);
  const [talentBank, setTalentBank] = useState(false);

  useEffect(() => {
    if (isDeadlinePassed()) {
      setDraft((d) => ({ ...d, screen: 'expired' }));
      setHydrated(true);
      return;
    }

    const existing = loadDraft(inviteToken);
    if (existing) {
      if (existing.status === 'submitted') {
        setDraft({ ...existing, screen: 'already_submitted' });
      } else {
        const resume = firstIncompleteScreen(existing);
        const hasProgress =
          existing.consent.accepted ||
          existing.answers.forced_choice.length > 0 ||
          !!existing.candidate.name;
        setDraft({
          ...existing,
          screen: hasProgress && !existing.welcomeBackSeen ? resume.screen : resume.screen,
          blockIndex: resume.blockIndex,
        });
        if (hasProgress && existing.screen !== 'welcome') {
          setShowResumeBanner(true);
        }
        setAgree(existing.consent.accepted);
        setTalentBank(existing.consent.talent_bank_opt_in);
      }
    } else {
      setDraft(createEmptyDraft(inviteToken));
    }
    setHydrated(true);
  }, [inviteToken]);

  const persist = (next: Etapa2Draft) => {
    const saved = saveDraft(next);
    setDraft(saved);
    void upsertProgress(saved);
    return saved;
  };

  const step = progressStep(draft.screen, draft.blockIndex);
  const showProgress = step !== null;

  const currentBlock = FORCED_CHOICE_BLOCKS[draft.blockIndex];
  const blockAnswer = draft.answers.forced_choice.find(
    (a) => a.block_id === currentBlock?.id,
  );

  const likertMap = useMemo(() => {
    const map = new Map<string, number>();
    draft.answers.likert.forEach((a) => map.set(a.item_id, a.value));
    return map;
  }, [draft.answers.likert]);

  const openText = draft.answers.open?.text ?? '';

  const go = (screen: Etapa2Screen, blockIndex = draft.blockIndex) => {
    setError(null);
    persist({ ...draft, screen, blockIndex, welcomeBackSeen: true });
    setShowResumeBanner(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStart = () => {
    if (!agree) return;
    const acceptedAt = draft.consent.accepted_at ?? nowIso();
    persist({
      ...draft,
      consent: {
        accepted: true,
        accepted_at: acceptedAt,
        talent_bank_opt_in: talentBank,
        consent_text_version: ETAPA2_CONFIG.consentTextVersion,
      },
      timestamps: {
        ...draft.timestamps,
        started_at: draft.timestamps.started_at ?? acceptedAt,
      },
      screen: 'identity',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIdentityContinue = () => {
    const name = draft.candidate.name.trim();
    const email = draft.candidate.email.trim();
    if (!name) {
      setError('Informe seu nome completo.');
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    go('instructions');
  };

  const setMostLeast = (statementId: string, kind: 'most' | 'least') => {
    if (!currentBlock) return;
    const prev = blockAnswer;
    let most = prev?.most ?? '';
    let least = prev?.least ?? '';

    if (kind === 'most') {
      if (least === statementId) least = '';
      most = statementId;
    } else {
      if (most === statementId) most = '';
      least = statementId;
    }

    const others = draft.answers.forced_choice.filter((a) => a.block_id !== currentBlock.id);
    const nextAnswers =
      most && least
        ? [
            ...others,
            {
              block_id: currentBlock.id,
              most,
              least,
              answered_at: nowIso(),
            },
          ]
        : most || least
          ? [
              ...others,
              {
                block_id: currentBlock.id,
                most,
                least,
                answered_at: nowIso(),
              },
            ]
          : others;

    // Keep incomplete marker for validation; we store partial with empty string filtered later
    const cleaned = nextAnswers.filter((a) => a.most && a.least);

    // Temporary selection state for UI when incomplete
    const withPartial =
      most && least
        ? cleaned
        : [
            ...cleaned,
            ...(most || least
              ? [
                  {
                    block_id: currentBlock.id,
                    most,
                    least,
                    answered_at: nowIso(),
                  },
                ]
              : []),
          ];

    persist({
      ...draft,
      answers: { ...draft.answers, forced_choice: withPartial },
    });
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
    // Persist only complete answers
    const cleaned = draft.answers.forced_choice.filter((a) => a.most && a.least);
    const nextDraft = { ...draft, answers: { ...draft.answers, forced_choice: cleaned } };
    if (draft.blockIndex >= 11) {
      persist({ ...nextDraft, screen: 'likert', blockIndex: 11 });
    } else {
      persist({ ...nextDraft, screen: 'block', blockIndex: draft.blockIndex + 1 });
    }
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setLikert = (itemId: string, value: number) => {
    const others = draft.answers.likert.filter((a) => a.item_id !== itemId);
    persist({
      ...draft,
      answers: {
        ...draft.answers,
        likert: [...others, { item_id: itemId, value, answered_at: nowIso() }],
      },
    });
  };

  const handleLikertNext = () => {
    if (LIKERT_ITEMS.some((item) => !likertMap.has(item.id))) {
      setError('Responda todas as frases para continuar.');
      return;
    }
    go('open');
  };

  const handleOpenChange = (text: string) => {
    if (text.length > OPEN_QUESTION.maxChars) return;
    persist({
      ...draft,
      answers: {
        ...draft.answers,
        open: {
          question_id: OPEN_QUESTION.id,
          text,
          answered_at: nowIso(),
        },
      },
    });
  };

  const handleSubmit = async () => {
    const text = openText.trim();
    if (!text) {
      setError('Escreva sua resposta para enviar.');
      setConfirmSubmit(false);
      return;
    }
    if (text.length < OPEN_QUESTION.minChars) {
      setError(`Escreva pelo menos ${OPEN_QUESTION.minChars} caracteres.`);
      setConfirmSubmit(false);
      return;
    }
    if (openText.length > OPEN_QUESTION.maxChars) {
      setError('Sua resposta passou do limite de 600 caracteres.');
      setConfirmSubmit(false);
      return;
    }

    setSubmitting(true);
    setError(null);
    const submittedAt = nowIso();
    const ready: Etapa2Draft = {
      ...draft,
      status: 'submitted',
      screen: 'thanks',
      timestamps: {
        ...draft.timestamps,
        submitted_at: submittedAt,
        last_saved_at: submittedAt,
      },
      answers: {
        ...draft.answers,
        forced_choice: draft.answers.forced_choice.filter((a) => a.most && a.least),
        open: {
          question_id: OPEN_QUESTION.id,
          text,
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

    persist(ready);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setError(null);
    if (draft.screen === 'identity') {
      go('welcome');
      return;
    }
    if (draft.screen === 'instructions') {
      go('identity');
      return;
    }
    if (draft.screen === 'block') {
      if (draft.blockIndex === 0) {
        go('instructions');
      } else {
        go('block', draft.blockIndex - 1);
      }
      return;
    }
    if (draft.screen === 'likert') {
      go('block', 11);
      return;
    }
    if (draft.screen === 'open') {
      go('likert');
    }
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

      <header className="sticky top-0 z-20 border-b border-oma-line/40 bg-oma-elevated/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <OmafitLogo variant="onDark" className="text-[20px]" />
          {showProgress && (
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-oma-muted">
                <span>
                  Etapa {step} de 14
                </span>
                <span>{Math.round(((step ?? 0) / 14) * 100)}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-oma-line/40"
                role="progressbar"
                aria-valuenow={step ?? 0}
                aria-valuemin={0}
                aria-valuemax={14}
                aria-label={`Progresso: etapa ${step} de 14`}
              >
                <div
                  className="h-full rounded-full bg-oma-accent transition-all duration-300"
                  style={{ width: `${((step ?? 0) / 14) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        {showResumeBanner && draft.status !== 'submitted' && (
          <div className="mb-6 rounded-2xl border border-oma-accent/35 bg-oma-accent/10 px-4 py-3 text-sm text-oma-cream">
            <p className="font-medium">Bem-vindo(a) de volta!</p>
            <p className="mt-1 text-oma-muted">
              Suas respostas foram salvas. Continue de onde parou.
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-3"
              onClick={() => {
                setShowResumeBanner(false);
                const resume = firstIncompleteScreen(draft);
                go(resume.screen, resume.blockIndex);
              }}
            >
              Continuar
            </Button>
          </div>
        )}

        {draft.screen === 'expired' && (
          <StatusCard
            title="Prazo encerrado"
            body={`O prazo para responder a este teste terminou. Se houve algum imprevisto, fale com a gente: ${ETAPA2_CONFIG.contactEmail}.`}
          />
        )}

        {draft.screen === 'already_submitted' && (
          <StatusCard
            title="Teste já respondido"
            body={`Este teste já foi respondido. Obrigado! Dúvidas: ${ETAPA2_CONFIG.contactEmail}.`}
          />
        )}

        {draft.screen === 'welcome' && (
          <section className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-oma-accent">
                Processo seletivo – {ETAPA2_CONFIG.roleTitle}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-oma-cream sm:text-4xl">
                Etapa 2 – Teste de estilo de trabalho
              </h1>
              <p className="mt-3 text-oma-muted leading-relaxed">
                Olá! Obrigado por seguir no processo da Omafit.
                <br />
                Tempo estimado: 8 a 10 minutos. São três partes curtas.
                <br />
                Antes de começar, leia como tratamos seus dados.
              </p>
            </div>

            <div className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-5 shadow-elegant">
              <h2 className="text-sm font-semibold text-oma-cream">
                Privacidade e uso dos dados (LGPD)
              </h2>
              <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-oma-line/30 bg-oma-canvas/60 p-4 text-sm leading-relaxed text-oma-muted">
                {CONSENT_TEXT}
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-oma-cream">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 rounded border-oma-line accent-[var(--color-accent,#D96845)]"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                />
                <span>
                  Li e concordo. <span className="text-oma-accent">(obrigatório)</span>
                </span>
              </label>

              <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-oma-muted">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 rounded border-oma-line accent-[var(--color-accent,#D96845)]"
                  checked={talentBank}
                  onChange={(e) => setTalentBank(e.target.checked)}
                />
                <span>
                  Autorizo manter meus dados no banco de talentos da Omafit por até 2 anos
                  (opcional).
                </span>
              </label>
            </div>

            <Button type="button" size="lg" className="w-full sm:w-auto" disabled={!agree} onClick={handleStart}>
              Começar
              <ArrowRight className="h-4 w-4" />
            </Button>

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
        )}

        {draft.screen === 'identity' && (
          <section className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Seus dados</h1>
              <p className="mt-2 text-oma-muted">
                Precisamos só de duas informações para vincular suas respostas à sua candidatura.
              </p>
            </div>

            <div className="space-y-4">
              <Field
                label="Nome completo"
                id="candidate-name"
                value={draft.candidate.name}
                maxLength={120}
                onChange={(v) =>
                  persist({ ...draft, candidate: { ...draft.candidate, name: v } })
                }
              />
              <Field
                label="E-mail (o mesmo usado na candidatura)"
                id="candidate-email"
                type="email"
                value={draft.candidate.email}
                onChange={(v) =>
                  persist({ ...draft, candidate: { ...draft.candidate, email: v } })
                }
              />
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <NavRow onBack={handleBack} onNext={handleIdentityContinue} nextLabel="Continuar" />
          </section>
        )}

        {draft.screen === 'instructions' && (
          <section className="space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Como funciona</h1>
              <p className="mt-3 text-oma-muted leading-relaxed">
                <strong className="text-oma-cream">Tempo estimado: 8 a 10 minutos.</strong> A
                avaliação é dividida em três partes curtas e foi desenvolvida para compreender
                melhor suas características comportamentais, sua forma de agir e como você costuma
                lidar com diferentes situações no ambiente profissional.
              </p>
            </div>

            <div className="rounded-2xl border border-oma-line/40 bg-oma-elevated/90 p-5 space-y-3 text-sm text-oma-muted leading-relaxed">
              <p className="font-medium text-oma-cream">Antes de começar, confira algumas orientações:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-oma-cream">Escolha um ambiente tranquilo:</strong> reserve
                  alguns minutos para realizar a avaliação com atenção, evitando interrupções ou
                  distrações.
                </li>
                <li>
                  <strong className="text-oma-cream">Seja espontâneo e sincero:</strong> responda
                  considerando como você realmente pensa, age e se comporta no dia a dia,
                  especialmente no ambiente de trabalho.
                </li>
                <li>
                  <strong className="text-oma-cream">Não existem respostas certas ou erradas:</strong>{' '}
                  o objetivo é conhecer seu perfil comportamental, e não avaliar seus conhecimentos
                  ou habilidades técnicas.
                </li>
                <li>
                  <strong className="text-oma-cream">Não tente identificar a resposta ideal:</strong>{' '}
                  não escolha alternativas pensando no que a empresa espera. Queremos conhecer seu
                  comportamento natural.
                </li>
                <li>
                  <strong className="text-oma-cream">Confie na sua primeira impressão:</strong> evite
                  analisar excessivamente cada pergunta. A resposta mais espontânea representa melhor
                  a maneira como você realmente age.
                </li>
              </ul>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-oma-muted">
              <div>
                <h2 className="font-semibold text-oma-cream">
                  Parte A — Escolha de comportamentos (aproximadamente 5 minutos)
                </h2>
                <p className="mt-1">
                  Você encontrará 12 blocos de frases. Em cada bloco, selecione uma frase que MAIS
                  representa seu comportamento e outra que MENOS representa você.
                </p>
              </div>
              <div>
                <h2 className="font-semibold text-oma-cream">
                  Parte B — Escala de concordância (aproximadamente 1 minuto)
                </h2>
                <p className="mt-1">
                  Você deverá avaliar 5 afirmações utilizando uma escala de 1 a 5, em que 1 significa
                  “Discordo totalmente” e 5 significa “Concordo totalmente”.
                </p>
              </div>
              <div>
                <h2 className="font-semibold text-oma-cream">
                  Parte C — Resposta aberta (aproximadamente 3 minutos)
                </h2>
                <p className="mt-1">
                  Uma pergunta discursiva para que você possa compartilhar sua percepção e
                  experiências em 3 a 5 linhas.
                </p>
              </div>
              <p className="text-oma-cream">
                Ao finalizar, confira suas respostas e envie a avaliação.
              </p>
            </div>

            <p className="text-xs text-oma-muted">
              Suas respostas são salvas automaticamente. Se precisar sair, é só abrir o mesmo link
              para continuar de onde parou.
            </p>

            <NavRow
              onBack={handleBack}
              onNext={() => go('block', 0)}
              nextLabel="Iniciar o teste"
            />
          </section>
        )}

        {draft.screen === 'block' && currentBlock && (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-oma-accent">
                Parte A – Escolha forçada · Bloco {currentBlock.number} de 12
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {currentBlock.stem}
              </h1>
              <p className="mt-2 text-sm text-oma-muted">
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
                    className={`rounded-2xl border p-4 transition-colors ${
                      isMost
                        ? 'border-oma-accent/50 bg-oma-accent/10'
                        : isLeast
                          ? 'border-oma-line/60 bg-oma-elevated/70'
                          : 'border-oma-line/40 bg-oma-elevated/90'
                    }`}
                  >
                    <p className="text-sm leading-relaxed text-oma-cream">
                      <span className="mr-2 font-semibold text-oma-accent">{s.letter}.</span>
                      {s.text}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <ChoiceChip
                        active={isMost}
                        label="MAIS"
                        ariaLabel={`Marcar frase ${s.letter} como MAIS parecida`}
                        onClick={() => setMostLeast(s.id, 'most')}
                      />
                      <ChoiceChip
                        active={isLeast}
                        label="MENOS"
                        ariaLabel={`Marcar frase ${s.letter} como MENOS parecida`}
                        tone="muted"
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
              nextLabel={draft.blockIndex >= 11 ? 'Ir para a Parte B' : 'Próximo'}
            />
          </section>
        )}

        {draft.screen === 'likert' && (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-oma-accent">
                Parte B – Proatividade, autonomia e foco
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Indique de 1 a 5
              </h1>
              <p className="mt-2 text-sm text-oma-muted">
                1 = Discordo totalmente · 5 = Concordo totalmente
              </p>
            </div>

            <div className="space-y-4">
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
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <NavRow onBack={handleBack} onNext={handleLikertNext} nextLabel="Ir para a Parte C" />
          </section>
        )}

        {draft.screen === 'open' && (
          <section className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-oma-accent">
                Parte C – Pergunta situacional
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Sua resposta
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-oma-muted">{OPEN_QUESTION.text}</p>
            </div>

            <div>
              <label htmlFor="open-answer" className="sr-only">
                Resposta aberta
              </label>
              <textarea
                id="open-answer"
                rows={6}
                value={openText}
                placeholder={OPEN_QUESTION.placeholder}
                onChange={(e) => handleOpenChange(e.target.value)}
                className="w-full rounded-2xl border border-oma-line/50 bg-oma-canvas/80 px-4 py-3 text-oma-cream shadow-inner placeholder:text-oma-muted/55 focus:border-oma-accent/50 focus:outline-none focus:ring-2 focus:ring-oma-accent/35"
              />
              <p className="mt-1 text-right text-xs text-oma-muted">
                {openText.length}/{OPEN_QUESTION.maxChars} caracteres
              </p>
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <NavRow
              onBack={handleBack}
              onNext={() => {
                setError(null);
                setConfirmSubmit(true);
              }}
              nextLabel="Enviar respostas"
              nextDisabled={submitting}
            />
          </section>
        )}

        {draft.screen === 'thanks' && (
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-oma-cream">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-oma-line/50 bg-oma-canvas/80 px-4 py-3 text-oma-cream shadow-inner placeholder:text-oma-muted/55 focus:border-oma-accent/50 focus:outline-none focus:ring-2 focus:ring-oma-accent/35"
      />
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="ghost" onClick={onBack} className="justify-start">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>
      <Button type="button" size="lg" onClick={onNext} disabled={nextDisabled} className="w-full sm:w-auto">
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
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

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
      {children}
    </p>
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
