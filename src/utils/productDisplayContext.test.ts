import { describe, expect, it } from 'vitest';
import {
  isGenericProductName,
  resolveDisplayProductName,
  resolveSelectedColorLabel,
} from './productDisplayContext';

describe('product display context', () => {
  it('treats placeholder names as generic', () => {
    expect(isGenericProductName('Produto')).toBe(true);
    expect(isGenericProductName('Camisa linho')).toBe(false);
  });

  it('picks the first useful product name', () => {
    expect(resolveDisplayProductName('', 'Produto', 'Calça reta')).toBe('Calça reta');
    expect(resolveDisplayProductName('product', 'item')).toBe('');
  });

  it('prefers the variant color label over a hex', () => {
    expect(
      resolveSelectedColorLabel({
        hex: '#000000',
        variantOptions: { Cor: 'Areia' },
        language: 'pt',
      })
    ).toBe('Areia');
  });

  it('names a hex when no catalog label exists', () => {
    expect(resolveSelectedColorLabel({ hex: '#000000', language: 'en' })).toBe('black');
  });
});
