import type {
  StylistChatMessage,
  StylistStructuredAction,
  SuggestedProductCard,
} from '../types';

/**
 * Constrói a mensagem de assistente a partir de texto + ações estruturadas.
 * Mantém compatibilidade: suggestedProducts / impression ids continuam nos campos flat.
 */
export function buildAssistantMessageFromActions(
  actions: StylistStructuredAction[],
  timestamp = Date.now()
): StylistChatMessage {
  const textParts: string[] = [];
  let products: SuggestedProductCard[] | undefined;
  let impressionId: string | undefined;
  let anchorHandle: string | undefined;

  for (const action of actions) {
    if (action.type === 'text' && action.content.trim()) {
      textParts.push(action.content.trim());
    }
    if (action.type === 'products' && action.products.length) {
      products = action.products;
      impressionId = action.impressionId;
      anchorHandle = action.anchorHandle;
    }
  }

  return {
    role: 'assistant',
    content: textParts.join('\n\n') || '',
    timestamp,
    ...(products?.length ? { suggestedProducts: products } : {}),
    ...(products?.length && impressionId ? { stylistImpressionId: impressionId } : {}),
    ...(products?.length && anchorHandle ? { stylistAnchorHandle: anchorHandle } : {}),
    ...(actions.length ? { structuredActions: actions } : {}),
  };
}

/**
 * Extrai ações estruturadas de uma ChatMessage legada (compatibilidade com chat atual).
 */
export function extractActionsFromChatMessage(
  message: StylistChatMessage
): StylistStructuredAction[] {
  if (message.structuredActions?.length) {
    return [...message.structuredActions];
  }
  const actions: StylistStructuredAction[] = [];
  if (String(message.content || '').trim()) {
    actions.push({ type: 'text', content: String(message.content).trim() });
  }
  if (message.suggestedProducts?.length) {
    actions.push({
      type: 'products',
      products: message.suggestedProducts,
      impressionId: message.stylistImpressionId,
      anchorHandle: message.stylistAnchorHandle,
    });
  }
  return actions;
}

export function selectProductFromRecommendations(
  products: SuggestedProductCard[],
  handle: string
): SuggestedProductCard | null {
  const key = String(handle || '').trim().toLowerCase();
  if (!key) return null;
  return products.find((p) => p.handle.trim().toLowerCase() === key) || null;
}
