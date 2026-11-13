import { describe, expect, it } from 'vitest';
import { runVoiceProof, formatVoiceProofMarkdown } from './runVoiceProof';
import { mapClientToolToStructuredActions } from '../protocolBridge';
import {
  createVoiceSessionMachineState,
  reduceVoiceSession,
} from '../sessionMachine';

describe('voice proof (isolated)', () => {
  it('passes mock scenarios for latency, barge-in, tools, sync, fallback', async () => {
    const report = await runVoiceProof();
    expect(report.architecture_ready_for_integration).toBe(false);
    expect(report.architecture_blockers.length).toBeGreaterThan(3);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.passed).toBe(3);
    expect(report.summary.barge_in_ok).toBe(true);
    expect(report.summary.tool_calling_ok).toBe(true);
    expect(report.summary.text_audio_sync_ok).toBe(true);
    expect(report.summary.text_fallback_ok).toBe(true);
    expect(report.summary.mock_ttfa_ms).toBeGreaterThan(0);
    expect(report.summary.mock_ttfa_ms).toBeLessThan(800);
  }, 15000);

  it('formats a markdown report', async () => {
    const md = formatVoiceProofMarkdown(await runVoiceProof());
    expect(md).toContain('Gate de arquitetura');
    expect(md).toContain('Pronto para integração no widget?** `false`');
  }, 15000);
});

describe('voice session machine', () => {
  it('transitions connecting → listening → thinking → speaking → interrupted', () => {
    let s = createVoiceSessionMachineState();
    s = reduceVoiceSession(s, { type: 'status', status: 'connecting', at: 1 });
    expect(s.ui).toBe('connecting');
    s = reduceVoiceSession(s, {
      type: 'session_started',
      conversation_id: 'c1',
      at: 2,
    });
    expect(s.ui).toBe('listening');
    s = reduceVoiceSession(s, {
      type: 'user_transcript',
      text: 'oi',
      is_final: true,
      at: 10,
    });
    expect(s.ui).toBe('thinking');
    s = reduceVoiceSession(s, {
      type: 'audio_chunk',
      response_id: 'r1',
      chunk_index: 0,
      duration_ms: 40,
      at: 200,
    });
    expect(s.ui).toBe('speaking');
    expect(s.metrics.time_to_first_audio_ms).toBe(190);
    s = reduceVoiceSession(s, { type: 'interruption', at: 250 });
    expect(s.ui).toBe('interrupted');
  });
});

describe('protocol bridge', () => {
  it('maps show_product_cards to structured product actions', () => {
    const actions = mapClientToolToStructuredActions('show_product_cards', {
      speak_text: 'Olha estas opções',
      products: [{ handle: 'a', title: 'A', price_label: 'R$ 10' }],
      impression_id: 'imp',
      anchor_handle: 'pdp',
    });
    expect(actions.map((a) => a.type)).toEqual(['text', 'products']);
  });
});
