import { describe, expect, it } from 'vitest';
import {
  computeTorsoCmForValidate,
  inferCollectionTypeFromOmafitProduct,
  normalizeWidgetLanguage,
  resolveWidgetCartVariantId,
} from './tryonProductContext';

describe('try-on product context', () => {
  it('infers lower-body products from the handle', () => {
    expect(
      inferCollectionTypeFromOmafitProduct({
        product_type: '',
        title: 'Calça jeans',
        handle: 'calca-jeans',
      })
    ).toBe('lower');
  });

  it('normalizes store language aliases', () => {
    expect(normalizeWidgetLanguage('pt-BR')).toBe('pt');
    expect(normalizeWidgetLanguage('español')).toBe('es');
    expect(normalizeWidgetLanguage('fr')).toBeNull();
  });

  it('resolves the cart variant from the algorithm size', () => {
    const variantId = resolveWidgetCartVariantId({
      catalog: {
        sizes: ['P', 'M'],
        colors: ['Preto'],
        variants: [
          { id: 1, available: true, selectedOptions: { Tamanho: 'P', Cor: 'Preto' } },
          { id: 2, available: true, selectedOptions: { Tamanho: 'M', Cor: 'Preto' } },
        ],
      },
      selectedVariantOptions: { Cor: 'Preto' },
      selectedVariantId: '1',
      selectedProductImage: '',
      selectedColorHex: '',
      algorithmSize: 'M',
    });
    expect(variantId).toBe('2');
  });

  it('estimates torso centimeters when MediaPipe is absent', () => {
    const female = computeTorsoCmForValidate({ gender: 'female', weight: 60, bodyTypeIndex: 0 }, null);
    const detected = computeTorsoCmForValidate(
      { gender: 'female', weight: 60 },
      { chest: 91.2, waist: 70.4, hip: 98.6 }
    );
    expect(female.peito_cm).toBeGreaterThan(0);
    expect(detected).toEqual({ peito_cm: 91, cintura_cm: 70, quadril_cm: 99 });
  });
});
