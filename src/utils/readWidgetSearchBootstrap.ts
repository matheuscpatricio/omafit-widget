/**
 * Lê parâmetros críticos da URL no primeiro paint (antes do primeiro useEffect).
 * Evita um frame com `productImage` vazio e o cartão “Carregando produto…” em iframe hero.
 */
export type WidgetSearchBootstrap = {
  productImage: string;
  productImages: string[];
  tryonLayoutBackgroundImage: string;
};

export function readWidgetSearchBootstrap(): WidgetSearchBootstrap {
  if (typeof window === 'undefined') {
    return { productImage: '', productImages: [], tryonLayoutBackgroundImage: '' };
  }
  const params = new URLSearchParams(window.location.search);

  const productImage = params.get('productImage')?.trim() || '';

  let productImages: string[] = [];
  const imagesParam = params.get('productImages');
  if (imagesParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(imagesParam));
      if (Array.isArray(parsed)) {
        productImages = parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      /* ignore */
    }
  }

  const tryonLayoutBackgroundImage =
    params.get('tryon_layout_background_image')?.trim() ||
    params.get('tryonLayoutBackgroundImage')?.trim() ||
    '';

  return { productImage, productImages, tryonLayoutBackgroundImage };
}
