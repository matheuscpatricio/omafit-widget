import { describe, expect, it, vi } from 'vitest';
import { createStylistSession, reduceStylistSession } from './sessionState';
import { createStylistEngine } from './stylistEngine';
import { buildChatHistoryForValidateSize } from './chatHistory';
import { buildAssistantFallbackMessage } from './fallbackMessages';
import {
  buildAssistantMessageFromActions,
  extractActionsFromChatMessage,
} from './structuredResponse';
import { inputEventToProcessableText } from '../types';
import type { StylistChatMessage } from '../types';

describe('chat history compatibility', () => {
  it('mirrors TryOnWidget last-12 + current utterance rule', () => {
    const messages: StylistChatMessage[] = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `m${i}`,
      timestamp: i,
    })) as StylistChatMessage[];

    const history = buildChatHistoryForValidateSize(messages, {
      currentUserUtterance: 'nova pergunta',
    });
    expect(history).toHaveLength(13);
    expect(history[history.length - 1]).toEqual({
      role: 'user',
      content: 'nova pergunta',
    });
  });

  it('does not duplicate trailing user utterance', () => {
    const messages: StylistChatMessage[] = [
      { role: 'user', content: 'oi', timestamp: 1 },
      { role: 'assistant', content: 'olá', timestamp: 2 },
      { role: 'user', content: 'quero casual', timestamp: 3 },
    ];
    const history = buildChatHistoryForValidateSize(messages, {
      currentUserUtterance: 'quero casual',
    });
    expect(history.filter((t) => t.content === 'quero casual')).toHaveLength(1);
  });
});

describe('structured response', () => {
  it('separates conversational text from product actions', () => {
    const msg = buildAssistantMessageFromActions([
      { type: 'text', content: 'Estas peças combinam bem.' },
      {
        type: 'products',
        products: [{ handle: 'a', title: 'A' }],
        impressionId: 'imp_1',
        anchorHandle: 'pdp',
      },
      {
        type: 'selection_options',
        options: [{ label: 'Casual', message: 'quero casual' }],
      },
    ]);
    expect(msg.content).toBe('Estas peças combinam bem.');
    expect(msg.suggestedProducts?.[0].handle).toBe('a');
    expect(msg.stylistImpressionId).toBe('imp_1');
    expect(msg.structuredActions).toHaveLength(3);

    const extracted = extractActionsFromChatMessage({
      role: 'assistant',
      content: 'só texto legado',
      timestamp: 1,
      suggestedProducts: [{ handle: 'b', title: 'B' }],
    });
    expect(extracted.map((a) => a.type)).toEqual(['text', 'products']);
  });
});

describe('modality input', () => {
  it('accepts text and final voice; ignores partial voice', () => {
    expect(
      inputEventToProcessableText({
        modality: 'text',
        text: '  hello ',
        at: 1,
      })
    ).toEqual({ text: 'hello', intention: 'custom' });

    expect(
      inputEventToProcessableText({
        modality: 'voice',
        transcript: 'quero formal',
        is_final: true,
        at: 2,
      })
    ).toEqual({ text: 'quero formal', intention: 'custom' });

    expect(
      inputEventToProcessableText({
        modality: 'voice',
        transcript: 'quero',
        is_final: false,
        at: 3,
      })
    ).toBeNull();
  });
});

describe('stylist engine', () => {
  it('processes text turns via completeTurn and updates session', async () => {
    const engine = createStylistEngine({
      completeTurn: async () => ({
        text: 'Sugiro estas peças.',
        actions: [
          { type: 'text', content: 'Sugiro estas peças.' },
          {
            type: 'products',
            products: [{ handle: 'jeans', title: 'Jeans' }],
          },
        ],
        recommended_products: [{ handle: 'jeans', title: 'Jeans' }],
        interaction_count: 1,
      }),
      now: () => 1000,
    });

    const session = createStylistSession({
      shop_domain: 'loja.myshopify.com',
      language: 'pt',
      current_product: { handle: 'blazer' },
    });

    const result = await engine.processTurn({
      session,
      input: { modality: 'text', text: 'quero casual', at: 1000 },
      host: {
        shop_domain: 'loja.myshopify.com',
        stylist_plan_authorized: true,
        product_name: 'Blazer',
      },
    });

    expect(result.used_fallback).toBe(false);
    expect(result.session.messages).toHaveLength(2);
    expect(result.session.messages[0].role).toBe('user');
    expect(result.session.messages[1].suggestedProducts?.[0].handle).toBe('jeans');
    expect(result.session.recommended_products[0].handle).toBe('jeans');
    expect(result.validate_size_chat_history.at(-1)?.content).toBe('quero casual');
  });

  it('falls back to textual message when AI call fails', async () => {
    const engine = createStylistEngine({
      completeTurn: async () => {
        throw new Error('network');
      },
      now: () => 2000,
    });

    const session = createStylistSession({
      language: 'en',
      recommended_size: 'L',
    });

    const result = await engine.processTurn({
      session,
      input: { modality: 'text', text: 'help', intention: 'custom', at: 2000 },
      host: {
        shop_domain: 'shop.myshopify.com',
        stylist_plan_authorized: false,
        product_name: 'Coat',
        recommended_size: 'L',
      },
    });

    expect(result.used_fallback).toBe(true);
    expect(result.assistant_message.content).toContain('Assistant unavailable');
    expect(result.assistant_message.content).toContain('L');
    expect(result.session.opening_extras_consumed).toBe(true);
  });

  it('routes final voice through the same engine path', async () => {
    const completeTurn = vi.fn(async () => ({
      text: 'Aquí tienes opciones.',
      actions: [{ type: 'text' as const, content: 'Aquí tienes opciones.' }],
    }));
    const engine = createStylistEngine({ completeTurn, now: () => 3 });

    let session = createStylistSession({ language: 'es' });
    session = reduceStylistSession(session, { type: 'set_language', language: 'es' });

    const result = await engine.processTurn({
      session,
      input: {
        modality: 'voice',
        transcript: 'quiero algo formal',
        is_final: true,
        at: 3,
      },
      host: { shop_domain: 'es.myshopify.com', stylist_plan_authorized: true },
    });

    expect(completeTurn).toHaveBeenCalledOnce();
    expect(result.voice_output).toEqual([
      { kind: 'speak_text', text: 'Aquí tienes opciones.', language: 'es' },
    ]);
  });

  it('language change then resume keeps product selection compatible with chat', async () => {
    let session = createStylistSession({
      session_id: 'compat_1',
      language: 'pt',
      shop_domain: 'loja.myshopify.com',
      current_product: { handle: 'pdp-item' },
    });
    session = reduceStylistSession(session, {
      type: 'set_recommended_products',
      products: [
        { handle: 'sugerido-1', title: 'Sugerido 1' },
        { handle: 'sugerido-2', title: 'Sugerido 2' },
      ],
    });
    session = reduceStylistSession(session, { type: 'set_language', language: 'en' });
    session = reduceStylistSession(session, {
      type: 'select_recommended_product',
      handle: 'sugerido-2',
    });

    const engine = createStylistEngine({
      completeTurn: async ({ session: s }) => ({
        text: `Current: ${s.current_product?.handle}`,
        actions: [
          {
            type: 'text',
            content: `Current: ${s.current_product?.handle}`,
          },
        ],
      }),
    });

    const result = await engine.processTurn({
      session,
      input: { modality: 'text', text: 'show similar', at: Date.now() },
      host: {
        shop_domain: session.shop_domain,
        stylist_plan_authorized: true,
        product_handle: session.current_product?.handle,
      },
    });

    expect(session.language).toBe('en');
    expect(session.current_product?.handle).toBe('sugerido-2');
    expect(result.session.messages[0].content).toBe('show similar');
    expect(result.assistant_message.content).toContain('sugerido-2');
  });
});

describe('fallback messages', () => {
  it('matches opening vs follow-up copy', () => {
    const opening = buildAssistantFallbackMessage({
      language: 'pt',
      productName: 'Vestido',
      recommendedSize: 'M',
      allowOpeningExtras: true,
    });
    expect(opening).toContain('Tamanho sugerido: M');

    const followUp = buildAssistantFallbackMessage({
      language: 'pt',
      recommendedSize: 'M',
      allowOpeningExtras: false,
    });
    expect(followUp).toContain('Assistência instável');
    expect(followUp).not.toContain('Tamanho sugerido');
  });
});
