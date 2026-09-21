import { describe, expect, it } from 'vitest';
import { pickSuggestedHandleFromUserText, userWantsTryOnGeneration } from './chatTryOnIntent';

describe('try-on generation intent', () => {
  it('detects explicit try-on requests', () => {
    expect(userWantsTryOnGeneration('quero experimentar essa calça')).toBe(true);
    expect(userWantsTryOnGeneration('ok')).toBe(false);
  });

  it('picks the suggestion named in the shopper message', () => {
    const suggestions = [
      { handle: 'cinto-couro', title: 'Cinto de couro' },
      { handle: 'sapato-oxford', title: 'Oxford preto' },
    ];
    expect(pickSuggestedHandleFromUserText('quero ver o oxford', suggestions)).toBe('sapato-oxford');
    expect(pickSuggestedHandleFromUserText('sem preferência', suggestions)).toBeNull();
  });
});
