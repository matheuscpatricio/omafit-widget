import { resolveDisplayProductName } from '../utils/productDisplayContext';

export function escapeRegexSegmentAssistant(sizeLabel: string): string {
  return String(sizeLabel || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Detecta se o texto já menciona explicitamente o tamanho do algoritmo (espelha a heurística do validate-size). */
export function assistantReplyMissingExplicitSize(text: string, sizeLabel: string): boolean {
  const s = String(sizeLabel || '').trim();
  if (!s) return false;
  const body = String(text || '');
  if (
    /\b(tamanho|talla|size)\s*ideal\b/i.test(body) &&
    new RegExp(`\\b${escapeRegexSegmentAssistant(s)}\\b`, 'i').test(body)
  ) {
    return false;
  }
  if (
    new RegExp(`\\b(tamanho|talla|size)\\s*[:,\\-]?\\s*${escapeRegexSegmentAssistant(s)}\\b`, 'i').test(body)
  ) {
    return false;
  }
  if (s.length >= 2 || /^\d{2,3}$/.test(s)) {
    if (new RegExp(`\\b${escapeRegexSegmentAssistant(s)}\\b`, 'i').test(body)) return false;
  }
  return true;
}

export function prependIdealSizeLeadIfMissing(
  explicacao: string,
  sizeLabel: string,
  productName: string,
  lang: 'pt' | 'es' | 'en'
): string {
  const sz = String(sizeLabel || '').trim();
  const body = String(explicacao || '').trim();
  if (!sz || !assistantReplyMissingExplicitSize(body, sz)) return body;
  const pn = resolveDisplayProductName(productName);
  let lead = '';
  if (lang === 'es') {
    lead = pn
      ? `Tu talla ideal para ${pn} es ${sz}. `
      : `Tu talla ideal para esta prenda es ${sz}. `;
  } else if (lang === 'en') {
    lead = pn
      ? `Your ideal size for ${pn} is ${sz}. `
      : `Your ideal size for this garment is ${sz}. `;
  } else {
    lead = pn
      ? `Seu tamanho ideal para ${pn} é ${sz}. `
      : `Seu tamanho ideal para esta peça é ${sz}. `;
  }
  return `${lead}${body}`.trim();
}
