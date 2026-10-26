import type { StylistStructuredAction, SuggestedProductCard } from '../types';
import type { VoiceStructuredUiEvent, VoiceTransportEvent } from './types';

/**
 * Mapeia client_tool_call do ElevenLabs → ações estruturadas do Stylist.
 * Commerce real deve residir no backend omafit (webhook tools); client tools
 * só sincronizam UI (cards, try-on, cart request).
 */
export function mapClientToolToStructuredActions(
  toolName: string,
  parameters: Record<string, unknown>
): StylistStructuredAction[] {
  const name = String(toolName || '').trim();

  if (name === 'show_product_cards' || name === 'recommend_products') {
    const raw = Array.isArray(parameters.products)
      ? parameters.products
      : Array.isArray(parameters.items)
        ? parameters.items
        : [];
    const products: SuggestedProductCard[] = raw
      .map((p) => {
        const row = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
        const handle = String(row.handle || '').trim();
        const title = String(row.title || handle).trim();
        if (!handle) return null;
        return {
          handle,
          title,
          image_url: row.image_url ? String(row.image_url) : undefined,
          rationale: row.rationale ? String(row.rationale) : undefined,
          price_label: row.price_label ? String(row.price_label) : undefined,
        } satisfies SuggestedProductCard;
      })
      .filter(Boolean) as SuggestedProductCard[];

    const actions: StylistStructuredAction[] = [];
    const speak = String(parameters.speak_text || parameters.message || '').trim();
    if (speak) actions.push({ type: 'text', content: speak });
    if (products.length) {
      actions.push({
        type: 'products',
        products,
        impressionId: parameters.impression_id
          ? String(parameters.impression_id)
          : undefined,
        anchorHandle: parameters.anchor_handle
          ? String(parameters.anchor_handle)
          : undefined,
      });
    }
    return actions;
  }

  if (name === 'request_try_on') {
    const handle = String(parameters.handle || '').trim();
    if (!handle) return [];
    return [
      {
        type: 'request_try_on',
        handle,
        autoSubmit: parameters.auto_submit !== false,
      },
    ];
  }

  if (name === 'add_to_cart') {
    return [
      {
        type: 'cart_action',
        handle: parameters.handle ? String(parameters.handle) : undefined,
        source: 'omafit-widget-suggested',
        variantId: parameters.variant_id ? String(parameters.variant_id) : undefined,
      },
    ];
  }

  if (name === 'end_conversation') {
    return [{ type: 'end_conversation', reason: String(parameters.reason || 'user_ended') }];
  }

  if (name === 'show_selection_options') {
    const options = Array.isArray(parameters.options) ? parameters.options : [];
    return [
      {
        type: 'selection_options',
        options: options
          .map((o) => {
            if (typeof o === 'string') {
              const label = o.trim();
              return label ? { label, message: label } : null;
            }
            const row = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
            const label = String(row.label || '').trim();
            const message = String(row.message || label).trim();
            if (!label) return null;
            return { label, message };
          })
          .filter(Boolean) as Array<{ label: string; message: string }>,
      },
    ];
  }

  return [];
}

export function structuredUiEventFromToolCall(
  event: Extract<VoiceTransportEvent, { type: 'client_tool_call' }>
): VoiceStructuredUiEvent | null {
  const actions = mapClientToolToStructuredActions(event.tool_name, event.parameters);
  if (!actions.length) return null;
  const productsAction = actions.find((a) => a.type === 'products');
  return {
    at: event.at,
    actions,
    products: productsAction && productsAction.type === 'products' ? productsAction.products : undefined,
    source_tool_call_id: event.tool_call_id,
  };
}

/**
 * Critérios da prova: alinhamento texto/áudio cobre a resposta falada.
 */
export function computeAlignmentCoverage(
  responseText: string,
  alignmentChars: string[]
): number {
  const expected = String(responseText || '').replace(/\s+/g, '').length;
  if (expected <= 0) return 0;
  const got = alignmentChars.join('').replace(/\s+/g, '').length;
  return Math.min(1, Math.round((got / expected) * 1000) / 1000);
}
