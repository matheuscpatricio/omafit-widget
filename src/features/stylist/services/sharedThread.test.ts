import { describe, expect, it } from 'vitest';
import {
  appendToSharedThread,
  applyVoiceCorrection,
  buildVoiceContextSummary,
  structuredActionsToMessage,
  voiceTranscriptToMessage,
} from './sharedThread';
import { mapClientToolToStructuredActions } from '../voice/protocolBridge';
import type { ChatMessage } from '../types';

describe('shared text/voice thread', () => {
  it('appends voice transcripts in the chat message shape', () => {
    const textTurn: ChatMessage = { role: 'user', content: 'oi', timestamp: 1 };
    const thread = appendToSharedThread([textTurn], voiceTranscriptToMessage('user', 'quero uma calça', 2));
    expect(thread).toHaveLength(2);
    expect(thread[1]).toMatchObject({ role: 'user', content: 'quero uma calça', inputModality: 'voice' });
  });

  it('ignores empty and duplicated voice lines', () => {
    const a = voiceTranscriptToMessage('assistant', 'Olha essas', 1);
    let t = appendToSharedThread([], a);
    t = appendToSharedThread(t, voiceTranscriptToMessage('assistant', 'Olha essas', 2));
    t = appendToSharedThread(t, voiceTranscriptToMessage('assistant', '  ', 3));
    expect(t).toHaveLength(1);
  });

  it('turns show_product_cards into a card message the existing UI renders', () => {
    const actions = mapClientToolToStructuredActions('show_product_cards', {
      products: [{ handle: 'calca-preta', title: 'Calça preta', image_url: 'https://x/y.jpg' }],
      message: 'Separei esta',
    });
    const msg = structuredActionsToMessage(actions, 5)!;
    expect(msg.content).toBe('Separei esta');
    expect(msg.suggestedProducts?.[0].handle).toBe('calca-preta');
  });

  it('accepts selection options as plain strings', () => {
    const actions = mapClientToolToStructuredActions('show_selection_options', { options: ['Casual', 'Festa'] });
    const msg = structuredActionsToMessage(actions)!;
    expect(msg.structuredActions?.[0]).toEqual({
      type: 'selection_options',
      options: [
        { label: 'Casual', message: 'Casual' },
        { label: 'Festa', message: 'Festa' },
      ],
    });
  });

  it('applies agent corrections after interruption', () => {
    const t = appendToSharedThread([], voiceTranscriptToMessage('assistant', 'Essa calça é ótima para', 1));
    expect(applyVoiceCorrection(t, 'Essa calça é ótima para', 'Essa calça')[0].content).toBe('Essa calça');
  });

  it('summarizes the text thread for voice context', () => {
    const summary = buildVoiceContextSummary([
      { role: 'user', content: 'quero algo casual', timestamp: 1 },
      {
        role: 'assistant',
        content: 'Veja',
        timestamp: 2,
        suggestedProducts: [{ handle: 'tenis', title: 'Tênis' }],
      },
    ]);
    expect(summary).toContain('Cliente: quero algo casual');
    expect(summary).toContain('Tênis (tenis)');
  });
});
