import { describe, expect, it } from 'vitest';
import { evaluateStylistClarification } from './stylistClarification';

describe('stylistClarification', () => {
  it('asks clarification for vague pt message', () => {
    const r = evaluateStylistClarification('surpreenda', 'pt');
    expect(r.needsClarification).toBe(true);
  });

  it('skips when budget keyword present', () => {
    const r = evaluateStylistClarification('quero opções mais baratas', 'pt');
    expect(r.needsClarification).toBe(false);
  });
});
