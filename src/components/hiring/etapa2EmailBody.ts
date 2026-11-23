import { ETAPA2_CONFIG } from '../../content/hiring/etapa2/config';
import {
  FORCED_CHOICE_BLOCKS,
  LIKERT_ITEMS,
  LIKERT_SCALE,
  OPEN_QUESTION,
} from '../../content/hiring/etapa2/questions';
import type { Etapa2Draft } from '../../content/hiring/etapa2/types';

/** Corpo de e-mail legível para humanos e para o Grok bot. */
export function buildEtapa2EmailContent(draft: Etapa2Draft): {
  subject: string;
  text: string;
} {
  const name = draft.candidate.name.trim();
  const email = draft.candidate.email.trim().toLowerCase();
  const subject = `[Etapa 2] Avaliação comportamental — ${name || email || 'candidato'}`;

  const partA = FORCED_CHOICE_BLOCKS.map((block) => {
    const ans = draft.answers.forced_choice.find((a) => a.block_id === block.id);
    const most = block.statements.find((s) => s.id === ans?.most);
    const least = block.statements.find((s) => s.id === ans?.least);
    return [
      `Bloco ${block.number} — ${block.stem}`,
      `  MAIS: ${most ? `${most.letter}. ${most.text}` : '(não respondido)'}`,
      `  MENOS: ${least ? `${least.letter}. ${least.text}` : '(não respondido)'}`,
    ].join('\n');
  }).join('\n\n');

  const partB = LIKERT_ITEMS.map((item) => {
    const ans = draft.answers.likert.find((a) => a.item_id === item.id);
    const label = LIKERT_SCALE.find((s) => s.value === ans?.value)?.label;
    return `${item.id}: ${ans?.value ?? '—'} (${label ?? 'sem resposta'})\n  "${item.text}"`;
  }).join('\n\n');

  const partC = draft.answers.open?.text?.trim() || '(sem resposta)';

  const text = [
    'Nova resposta — Avaliação de perfil comportamental (Etapa 2)',
    `Processo: ${ETAPA2_CONFIG.roleTitle}`,
    '',
    '=== CANDIDATO ===',
    `Nome: ${name}`,
    `E-mail: ${email}`,
    `ID da resposta: ${draft.response_id}`,
    `Token do convite: ${draft.invite_token || '(público)'}`,
    '',
    '=== CONSENTIMENTO ===',
    `Li e concordo: ${draft.consent.accepted ? 'sim' : 'não'}`,
    `Aceito em: ${draft.consent.accepted_at || '—'}`,
    `Banco de talentos: ${draft.consent.talent_bank_opt_in ? 'sim' : 'não'}`,
    `Versão do texto: ${draft.consent.consent_text_version}`,
    '',
    '=== PARTE A — Escolha de comportamentos ===',
    partA,
    '',
    '=== PARTE B — Escala de concordância ===',
    partB,
    '',
    `=== PARTE C — Pergunta situacional ===`,
    `Pergunta: ${OPEN_QUESTION.text}`,
    '',
    'Resposta:',
    partC,
    '',
    '=== METADADOS ===',
    `Início: ${draft.timestamps.started_at || '—'}`,
    `Envio: ${draft.timestamps.submitted_at || '—'}`,
    `Versão das perguntas: ${draft.questions_version}`,
    '',
    '=== JSON (para o Grok) ===',
    JSON.stringify(
      {
        response_id: draft.response_id,
        candidate: { name, email },
        consent: draft.consent,
        answers: draft.answers,
        timestamps: draft.timestamps,
        questions_version: draft.questions_version,
        invite_token: draft.invite_token,
      },
      null,
      2,
    ),
  ].join('\n');

  return { subject, text };
}
