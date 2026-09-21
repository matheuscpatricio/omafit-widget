import { describe, expect, it } from 'vitest';
import { assistantReplyMissingExplicitSize, prependIdealSizeLeadIfMissing } from './tryonAssistantCopy';

describe('try-on assistant size lead', () => {
  it('detects when the ideal size is already explicit', () => {
    expect(assistantReplyMissingExplicitSize('Seu tamanho ideal é M.', 'M')).toBe(false);
    expect(assistantReplyMissingExplicitSize('Essa peça veste bem.', 'M')).toBe(true);
  });

  it('prepends the ideal size without duplicating it', () => {
    const once = prependIdealSizeLeadIfMissing('Combina com um cinto.', 'M', 'Camisa linho', 'pt');
    expect(once.startsWith('Seu tamanho ideal para Camisa linho é M.')).toBe(true);
    expect(prependIdealSizeLeadIfMissing(once, 'M', 'Camisa linho', 'pt')).toBe(once);
  });
});
