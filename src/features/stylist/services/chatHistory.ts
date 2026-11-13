import type { StylistChatMessage } from '../types';

export type ValidateSizeChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Monta chat_history para validate-size — mesma regra do TryOnWidget:
 * últimas 12 mensagens com conteúdo + opcionalmente a utterance atual do user.
 */
export function buildChatHistoryForValidateSize(
  messages: StylistChatMessage[],
  options: {
    currentUserUtterance?: string;
    maxTurns?: number;
  } = {}
): ValidateSizeChatTurn[] {
  const maxTurns = options.maxTurns ?? 12;
  const base: ValidateSizeChatTurn[] = messages
    .slice(-maxTurns)
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        String(m.content || '').trim().length > 0
    )
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').trim(),
    }));

  const q = String(options.currentUserUtterance || '').trim();
  if (q) {
    const last = base[base.length - 1];
    if (!last || last.role !== 'user' || last.content !== q) {
      base.push({ role: 'user', content: q });
    }
  }
  return base;
}
