import type { StylistLanguage } from '../types';

export type FallbackMessageContext = {
  language: StylistLanguage;
  productName?: string;
  recommendedSize?: string | null;
  /** false = follow-up após abertura (não repetir lead de tamanho). */
  allowOpeningExtras: boolean;
};

/**
 * Fallback textual quando validate-size / IA falha.
 * O widget NÃO deve depender de voz nem do serviço de IA para continuar usável.
 */
export function buildAssistantFallbackMessage(ctx: FallbackMessageContext): string {
  const language: StylistLanguage =
    ctx.language === 'es' ? 'es' : ctx.language === 'en' ? 'en' : 'pt';
  const sz = String(ctx.recommendedSize || '').trim();
  const allowOpeningExtras = Boolean(ctx.allowOpeningExtras);
  const localProductName = String(ctx.productName || '').trim();

  const fallbackMessages: Record<StylistLanguage, string> = {
    pt: !allowOpeningExtras
      ? sz
        ? 'Assistência instável. Veja o espelho virtual e tente novamente em instantes.'
        : `${localProductName ? `${localProductName}: ` : ''}Ótima escolha para o seu perfil — adicione ao carrinho.`
      : sz
        ? `Assistência instável. Tamanho sugerido: ${sz}. Veja o espelho e adicione ao carrinho se quiser.`
        : `${localProductName ? `${localProductName}: ` : ''}Ótima escolha para o seu perfil — adicione ao carrinho.`,
    es: !allowOpeningExtras
      ? sz
        ? 'Sin asistente por ahora. Mira el espejo virtual e inténtalo de nuevo en unos instantes.'
        : `${localProductName ? `${localProductName}: ` : ''}Te queda muy bien — agrégalo al carrito.`
      : sz
        ? `Sin asistente por ahora. Talla sugerida: ${sz}. Mira el espejo y añade al carrito si te encaja.`
        : `${localProductName ? `${localProductName}: ` : ''}Te queda muy bien — agrégalo al carrito.`,
    en: !allowOpeningExtras
      ? sz
        ? 'Assistant unavailable. Check the virtual mirror and try again in a moment.'
        : `${localProductName ? `${localProductName}: ` : ''}Great fit for you — add to cart.`
      : sz
        ? `Assistant unavailable. Suggested size: ${sz}. Check the mirror and add to cart if you like it.`
        : `${localProductName ? `${localProductName}: ` : ''}Great fit for you — add to cart.`,
  };

  return fallbackMessages[language];
}

export function buildInteractionLimitMessage(language: StylistLanguage): string {
  const messages: Record<StylistLanguage, string> = {
    pt: 'Você atingiu o limite de interações por sessão.',
    es: 'Has alcanzado el límite de interacciones por sesión.',
    en: 'You have reached the interaction limit per session.',
  };
  return messages[language === 'es' ? 'es' : language === 'en' ? 'en' : 'pt'];
}
