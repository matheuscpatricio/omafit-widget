/** True quando o widget corre dentro de iframe (loja / tema Shopify). */
export function isTryonWidgetEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}
