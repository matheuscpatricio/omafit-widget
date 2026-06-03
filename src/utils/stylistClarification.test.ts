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

  it('skips short but clear outfit request', () => {
    const r = evaluateStylistClarification('quero um look', 'pt');
    expect(r.needsClarification).toBe(false);
  });

  it('skips occasion chip-style message', () => {
    const r = evaluateStylistClarification(
      'Sugira um look para a ocasião ou estação atual',
      'pt'
    );
    expect(r.needsClarification).toBe(false);
  });

  it('skips one-word acknowledgements', () => {
    expect(evaluateStylistClarification('sim', 'pt').needsClarification).toBe(false);
    expect(evaluateStylistClarification('ok', 'pt').needsClarification).toBe(false);
  });
});
