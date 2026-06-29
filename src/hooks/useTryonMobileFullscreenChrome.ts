import { useIsMdUp } from './useMediaQuery';
import { isTryonWidgetEmbedded } from '../utils/isTryonWidgetEmbedded';

/**
 * Chrome de viewport inteira no iframe mobile (Shopify).
 * Hero/sidebar já usam h-dvh; layout default também deve preencher o modal.
 */
export function useTryonMobileFullscreenChrome(sidebarOrHeroChrome: boolean): boolean {
  const isMdUp = useIsMdUp();
  if (sidebarOrHeroChrome) return true;
  return isTryonWidgetEmbedded() && !isMdUp;
}
