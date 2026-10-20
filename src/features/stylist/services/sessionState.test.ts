import { describe, expect, it } from 'vitest';
import {
  createStylistSession,
  reduceStylistSession,
  resumeStylistSession,
  serializeStylistSession,
} from './sessionState';
import { selectProductFromRecommendations } from './structuredResponse';
import type { StylistChatMessage, SuggestedProductCard } from '../types';

const sampleProducts: SuggestedProductCard[] = [
  { handle: 'calca-jeans', title: 'Calça Jeans', price_label: 'R$ 199' },
  { handle: 'camisa-linho', title: 'Camisa Linho', price_label: 'R$ 149' },
];

describe('stylist session state', () => {
  it('creates a session with required fields', () => {
    const s = createStylistSession({
      shop_domain: 'loja.myshopify.com',
      language: 'pt',
      current_product: { handle: 'blazer-navy', title: 'Blazer Navy' },
      recommended_size: 'M',
    });
    expect(s.session_id).toBeTruthy();
    expect(s.shop_domain).toBe('loja.myshopify.com');
    expect(s.current_product?.handle).toBe('blazer-navy');
    expect(s.messages).toEqual([]);
    expect(s.recommended_size).toBe('M');
    expect(s.language).toBe('pt');
    expect(s.consents.voice_recording).toBe(false);
    expect(s.opening_extras_consumed).toBe(false);
  });

  it('appends messages and tracks recommendations', () => {
    let s = createStylistSession({ shop_domain: 'x.myshopify.com' });
    const userMsg: StylistChatMessage = {
      role: 'user',
      content: 'quero algo casual',
      timestamp: 1,
    };
    s = reduceStylistSession(s, { type: 'append_message', message: userMsg });
    s = reduceStylistSession(s, {
      type: 'set_recommended_products',
      products: sampleProducts,
    });
    s = reduceStylistSession(s, { type: 'set_interaction_count', count: 2 });
    s = reduceStylistSession(s, { type: 'mark_opening_extras_consumed' });

    expect(s.messages).toHaveLength(1);
    expect(s.recommended_products).toHaveLength(2);
    expect(s.interaction_count).toBe(2);
    expect(s.opening_extras_consumed).toBe(true);
  });

  it('selects a recommended product into current_product', () => {
    let s = createStylistSession({
      shop_domain: 'x.myshopify.com',
      current_product: { handle: 'blazer-navy' },
    });
    s = reduceStylistSession(s, {
      type: 'set_recommended_products',
      products: sampleProducts,
    });
    s = reduceStylistSession(s, {
      type: 'select_recommended_product',
      handle: 'Camisa-Linho',
    });
    expect(s.current_product?.handle).toBe('camisa-linho');
    expect(s.current_product?.title).toBe('Camisa Linho');
  });

  it('ignores unknown product selection', () => {
    let s = createStylistSession({
      current_product: { handle: 'blazer-navy' },
    });
    s = reduceStylistSession(s, {
      type: 'set_recommended_products',
      products: sampleProducts,
    });
    const before = s.current_product;
    s = reduceStylistSession(s, {
      type: 'select_recommended_product',
      handle: 'inexistente',
    });
    expect(s.current_product).toEqual(before);
  });

  it('changes language without clearing history', () => {
    let s = createStylistSession({ language: 'pt' });
    s = reduceStylistSession(s, {
      type: 'append_message',
      message: { role: 'assistant', content: 'Olá', timestamp: 1 },
    });
    s = reduceStylistSession(s, { type: 'set_language', language: 'en' });
    expect(s.language).toBe('en');
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].content).toBe('Olá');
  });

  it('resumes a serialized session snapshot', () => {
    let s = createStylistSession({
      session_id: 'sess_abc',
      shop_domain: 'loja.myshopify.com',
      language: 'es',
    });
    s = reduceStylistSession(s, {
      type: 'append_message',
      message: {
        role: 'user',
        content: 'más barato',
        timestamp: 10,
      },
    });
    s = reduceStylistSession(s, {
      type: 'set_recommended_products',
      products: sampleProducts,
    });
    s = reduceStylistSession(s, { type: 'set_interaction_count', count: 3 });
    s = reduceStylistSession(s, { type: 'mark_opening_extras_consumed' });

    const snapshot = serializeStylistSession(s);
    const resumed = resumeStylistSession(snapshot, { language: 'es' });

    expect(resumed.session_id).toBe('sess_abc');
    expect(resumed.shop_domain).toBe('loja.myshopify.com');
    expect(resumed.messages).toHaveLength(1);
    expect(resumed.messages[0].content).toBe('más barato');
    expect(resumed.recommended_products).toHaveLength(2);
    expect(resumed.interaction_count).toBe(3);
    expect(resumed.opening_extras_consumed).toBe(true);
    expect(resumed.language).toBe('es');
  });

  it('serialize strips try-on image urls (no sensitive photo persistence)', () => {
    const s = createStylistSession({ session_id: 's1' });
    const withPhoto: typeof s = {
      ...s,
      messages: [
        {
          role: 'assistant',
          content: 'aqui o look',
          timestamp: 1,
          tryOnImageUrl: 'https://cdn.example/person.jpg',
          suggestedProducts: sampleProducts,
        },
      ],
    };
    const out = serializeStylistSession(withPhoto);
    expect(out.messages[0].tryOnImageUrl).toBeUndefined();
    expect(out.messages[0].suggestedProducts).toHaveLength(2);
  });

  it('selectProductFromRecommendations matches handles case-insensitively', () => {
    expect(selectProductFromRecommendations(sampleProducts, 'CALCA-JEANS')?.title).toBe(
      'Calça Jeans'
    );
    expect(selectProductFromRecommendations(sampleProducts, '')).toBeNull();
  });
});
