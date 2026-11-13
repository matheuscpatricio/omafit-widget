import type { ChatMessage, StylistStructuredAction } from '../types';

/**
 * Thread único texto↔voz: transcrições e respostas do agent de voz entram em
 * `chatMessages` com o mesmo shape do chat de texto, e as ações estruturadas
 * viram uma mensagem do assistente com cards/opções.
 */
export function voiceTranscriptToMessage(
  role: 'user' | 'assistant',
  text: string,
  at: number = Date.now()
): ChatMessage | null {
  const content = String(text || '').trim();
  if (!content) return null;
  return { role, content, timestamp: at, inputModality: 'voice' };
}

export function structuredActionsToMessage(
  actions: StylistStructuredAction[],
  at: number = Date.now()
): ChatMessage | null {
  const textParts: string[] = [];
  let message: ChatMessage | null = null;
  const ensure = () => {
    if (!message) message = { role: 'assistant', content: '', timestamp: at, inputModality: 'voice' };
    return message;
  };
  for (const a of actions) {
    if (a.type === 'text') {
      textParts.push(a.content);
    } else if (a.type === 'products') {
      const m = ensure();
      m.suggestedProducts = a.products;
      if (a.impressionId) m.stylistImpressionId = a.impressionId;
      if (a.anchorHandle) m.stylistAnchorHandle = a.anchorHandle;
      m.structuredActions = [...(m.structuredActions || []), a];
    } else if (a.type === 'selection_options' && a.options.length) {
      const m = ensure();
      m.structuredActions = [...(m.structuredActions || []), a];
    }
  }
  const msg = message as ChatMessage | null;
  if (!msg) return null;
  msg.content = textParts.join(' ').trim();
  return msg;
}

/** Append que evita duplicar a mesma fala (ex.: correção do agent após interrupção). */
export function appendToSharedThread(prev: ChatMessage[], next: ChatMessage | null): ChatMessage[] {
  if (!next) return prev;
  const last = prev[prev.length - 1];
  if (
    last &&
    last.role === next.role &&
    last.inputModality === 'voice' &&
    next.inputModality === 'voice' &&
    !next.suggestedProducts &&
    !next.structuredActions &&
    last.content === next.content
  ) {
    return prev;
  }
  return [...prev, next];
}

/** Substitui a última fala do assistente por voz quando o agent corrige após interrupção. */
export function applyVoiceCorrection(prev: ChatMessage[], original: string, corrected: string): ChatMessage[] {
  for (let i = prev.length - 1; i >= 0; i -= 1) {
    const m = prev[i];
    if (m.role === 'assistant' && m.inputModality === 'voice' && m.content === original) {
      const copy = prev.slice();
      copy[i] = { ...m, content: corrected };
      return copy;
    }
  }
  return prev;
}

/** Resumo curto do thread para `sendContextualUpdate` ao iniciar/retomar voz. */
export function buildVoiceContextSummary(messages: ChatMessage[], maxTurns = 8): string {
  const lines: string[] = [];
  for (const m of messages.slice(-maxTurns)) {
    const who = m.role === 'user' ? 'Cliente' : 'Stylist';
    const text = String(m.content || '').replace(/\s+/g, ' ').trim().slice(0, 240);
    const products = (m.suggestedProducts || []).map((p) => `${p.title} (${p.handle})`).join(', ');
    if (text) lines.push(`${who}: ${text}`);
    if (products) lines.push(`${who} mostrou: ${products}`);
  }
  return lines.length ? `Conversa anterior no chat:\n${lines.join('\n')}` : '';
}
