import {
  createVoiceSessionMachineState,
  markProductsUiRendered,
  reduceVoiceSession,
} from '../sessionMachine';
import { runMockVoiceConversation } from '../mockElevenLabsTransport';
import {
  computeAlignmentCoverage,
  structuredUiEventFromToolCall,
} from '../protocolBridge';
import type { VoiceProofScenarioResult, VoiceTransportEvent } from '../types';

export type VoiceProofReport = {
  generated_at: string;
  architecture_ready_for_integration: false;
  architecture_blockers: string[];
  scenarios: VoiceProofScenarioResult[];
  summary: {
    passed: number;
    failed: number;
    mock_ttfa_ms: number | null;
    mock_products_ui_ms: number | null;
    barge_in_ok: boolean;
    tool_calling_ok: boolean;
    text_audio_sync_ok: boolean;
    text_fallback_ok: boolean;
  };
  recommended_next_steps: string[];
  elevenlabs_notes: string[];
};

const ARCHITECTURE_BLOCKERS = [
  'StylistEngine ainda não substitui callGPTAssistant no TryOnWidget',
  'Ferramentas comerciais (catalog-search, ATC, suggestion-events) não estão centralizadas como tools server-side no omafit',
  'Não existe endpoint server-side para mint de signed URL / conversation token (Enterprise gate + minutos)',
  'Sessão tipada existe no widget, mas não é contexto compartilhado autoritativo FE↔BE',
  'Não há medição/limite de minutos de voz por loja no servidor',
];

async function runHappyPath(): Promise<VoiceProofScenarioResult> {
  let state = createVoiceSessionMachineState();
  const events: VoiceTransportEvent[] = [];
  let productsEventAt: number | null = null;
  let alignmentChars: string[] = [];
  let agentFinal = '';

  const t0 = Date.now();
  await runMockVoiceConversation(
    (event) => {
      events.push(event);
      state = reduceVoiceSession(state, event);
      if (event.type === 'client_tool_call') {
        const ui = structuredUiEventFromToolCall(event);
        if (ui?.products?.length) {
          productsEventAt = event.at + 5; // simula paint do card
          state = markProductsUiRendered(state, productsEventAt);
        }
      }
      if (event.type === 'audio_chunk' && event.alignment) {
        alignmentChars = alignmentChars.concat(event.alignment.chars);
      }
      if (event.type === 'agent_response') agentFinal = event.text;
    },
    {
      first_audio_delay_ms: 120,
      audio_chunk_gap_ms: 25,
      tool_call_delay_ms: 40,
      interrupt_after_ms: null,
    }
  );
  const wall = Date.now() - t0;

  const coverage = computeAlignmentCoverage(agentFinal, alignmentChars);
  const ttfa = state.metrics.time_to_first_audio_ms;
  const productsMs = state.metrics.time_to_products_ui_ms;
  const passed =
    state.metrics.tool_call_count >= 1 &&
    ttfa != null &&
    ttfa < 800 &&
    productsMs != null &&
    productsMs < 200 &&
    coverage >= 0.85 &&
    state.ui === 'disconnected';

  return {
    name: 'happy_path_latency_tools_sync',
    passed,
    details: passed
      ? `TTFA=${ttfa}ms products_ui=${productsMs}ms alignment=${coverage} tools=${state.metrics.tool_call_count}`
      : `Failed: ttfa=${ttfa} products=${productsMs} coverage=${coverage} ui=${state.ui}`,
    metrics: state.metrics,
    timings_ms: { wall_clock: wall, ttfa: ttfa ?? -1, products_ui: productsMs ?? -1 },
  };
}

async function runBargeIn(): Promise<VoiceProofScenarioResult> {
  let state = createVoiceSessionMachineState();
  let sawInterrupted = false;
  let sawCorrection = false;

  await runMockVoiceConversation(
    (event) => {
      state = reduceVoiceSession(state, event);
      if (event.type === 'interruption') sawInterrupted = true;
      if (event.type === 'agent_response_correction') sawCorrection = true;
    },
    {
      first_audio_delay_ms: 50,
      audio_chunk_gap_ms: 20,
      interrupt_after_ms: 5,
    }
  );

  const passed =
    sawInterrupted &&
    sawCorrection &&
    state.metrics.interruption_count >= 1 &&
    (state.ui === 'interrupted' || state.ui === 'listening' || state.ui === 'disconnected');

  return {
    name: 'barge_in_interruption',
    passed,
    details: passed
      ? `interruption_count=${state.metrics.interruption_count} corrected_text_len=${state.agent_text.length}`
      : `interrupted=${sawInterrupted} correction=${sawCorrection} ui=${state.ui}`,
    metrics: state.metrics,
    timings_ms: {},
  };
}

async function runFallback(): Promise<VoiceProofScenarioResult> {
  let state = createVoiceSessionMachineState();
  await runMockVoiceConversation((event) => {
    state = reduceVoiceSession(state, event);
  }, { fail_connect: true });

  const passed =
    state.metrics.used_text_fallback === true &&
    state.ui === 'disconnected' &&
    state.metrics.error_count >= 1;

  return {
    name: 'text_fallback_on_connect_failure',
    passed,
    details: passed
      ? 'Connect failure marked used_text_fallback; session disconnected'
      : `fallback=${state.metrics.used_text_fallback} ui=${state.ui}`,
    metrics: state.metrics,
    timings_ms: {},
  };
}

export async function runVoiceProof(): Promise<VoiceProofReport> {
  const scenarios = await Promise.all([runHappyPath(), runBargeIn(), runFallback()]);
  const happy = scenarios.find((s) => s.name === 'happy_path_latency_tools_sync');
  const barge = scenarios.find((s) => s.name === 'barge_in_interruption');
  const fallback = scenarios.find((s) => s.name === 'text_fallback_on_connect_failure');

  return {
    generated_at: new Date().toISOString(),
    architecture_ready_for_integration: false,
    architecture_blockers: ARCHITECTURE_BLOCKERS,
    scenarios,
    summary: {
      passed: scenarios.filter((s) => s.passed).length,
      failed: scenarios.filter((s) => !s.passed).length,
      mock_ttfa_ms: happy?.metrics.time_to_first_audio_ms ?? null,
      mock_products_ui_ms: happy?.metrics.time_to_products_ui_ms ?? null,
      barge_in_ok: barge?.passed === true,
      tool_calling_ok: (happy?.metrics.tool_call_count ?? 0) >= 1 && happy?.passed === true,
      text_audio_sync_ok:
        (happy?.metrics.text_audio_alignment_coverage ??
          (happy?.passed ? 0.85 : 0)) >= 0.85 && happy?.passed === true,
      text_fallback_ok: fallback?.passed === true,
    },
    recommended_next_steps: [
      'Centralizar tools comerciais no backend omafit (catalog-search, recommend, ATC allowlist) como webhook tools — nunca Shopify arbitrário',
      'Expor POST /api/widget/voice-session/mint com gate Enterprise + quota de minutos + signed URL/token ElevenLabs',
      'Ligar TryOnWidget ao StylistEngine + sessão compartilhada antes de montar o microfone',
      'Só então integrar @elevenlabs/client com clientTools de UI (show_product_cards, request_try_on)',
      'Prova live com AGENT_ID + API key server-side (não no widget) para medir TTFA real em WebRTC',
    ],
    elevenlabs_notes: [
      'SDK atual: @elevenlabs/client Conversation.startSession (WebRTC token ou WebSocket signed URL)',
      'Auth: get-signed-url / conversation token — API key só no servidor; URL expira em 15 min',
      'Barge-in: evento interruption + agent_response_correction; onModeChange listening|speaking',
      'Sync texto/áudio: audio alignment + agent_chat_response_part (habilitar em client_events)',
      'Tools: webhook (commerce no omafit) + client (cards/try-on/cart UI); expects_response para bloquear turno',
      'Custom LLM (controlar validate-size): possível via OpenAI-compatible SSE, mas incompatível com Realtime model — maior latência',
      'Arquitetura recomendada: ElevenLabs = voz; omafit webhook tools = único sistema de recomendações; client tools = sync UI',
    ],
  };
}

export function formatVoiceProofMarkdown(report: VoiceProofReport): string {
  const lines = [
    '# AI Stylist Voice — Prova técnica (isolada)',
    '',
    `Gerado em: ${report.generated_at}`,
    '',
    '## Gate de arquitetura',
    '',
    `**Pronto para integração no widget?** \`${report.architecture_ready_for_integration}\``,
    '',
    'Bloqueadores:',
    ...report.architecture_blockers.map((b) => `- ${b}`),
    '',
    '## Resultados da prova (mock de protocolo ElevenLabs)',
    '',
    `| Cenário | Passou | Detalhe |`,
    `|---|---|---|`,
    ...report.scenarios.map(
      (s) => `| ${s.name} | ${s.passed ? 'yes' : 'NO'} | ${s.details.replace(/\|/g, '/')} |`
    ),
    '',
    '### Summary',
    '',
    `- passed/failed: ${report.summary.passed}/${report.summary.failed}`,
    `- mock TTFA: ${report.summary.mock_ttfa_ms} ms`,
    `- mock products UI: ${report.summary.mock_products_ui_ms} ms`,
    `- barge-in: ${report.summary.barge_in_ok}`,
    `- tool calling: ${report.summary.tool_calling_ok}`,
    `- text/audio sync: ${report.summary.text_audio_sync_ok}`,
    `- text fallback: ${report.summary.text_fallback_ok}`,
    '',
    '## Notas ElevenLabs',
    '',
    ...report.elevenlabs_notes.map((n) => `- ${n}`),
    '',
    '## Próximos passos (não executados nesta entrega)',
    '',
    ...report.recommended_next_steps.map((n, i) => `${i + 1}. ${n}`),
    '',
    '> Esta prova **não** integra microfone no TryOnWidget e **não** faz deploy.',
    '',
  ];
  return lines.join('\n');
}
