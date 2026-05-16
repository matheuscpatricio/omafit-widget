/** Texto de legenda pós try-on do produto sugerido — sem tamanho, só combinação com a peça âncora. */

const SIZE_IDEAL_RE = /\b(?:tamanho|talla|size)\s+ideal\b/i;
const SIZE_OPENING_RE =
  /^\s*(?:(?:seu|sua|tu|tus|your)\s+)?(?:tamanho|talla|size)\s+ideal\s+(?:é|es|is|para|for)\s+/iu;

export function pairingCaptionMentionsSize(text: string): boolean {
  const body = String(text || '').trim();
  if (!body) return false;
  if (SIZE_IDEAL_RE.test(body)) return true;
  if (SIZE_OPENING_RE.test(body)) return true;
  if (/^\s*seu tamanho ideal\b/iu.test(body)) return true;
  if (/^\s*tu talla ideal\b/iu.test(body)) return true;
  if (/^\s*your ideal size\b/iu.test(body)) return true;
  return false;
}

/** Remove aberturas típicas de prompt add_to_cart / consultor com tamanho. */
export function stripSizeLeadFromPairingCaption(text: string): string {
  let body = String(text || '').trim();
  if (!body) return body;

  body = body
    .replace(
      /^\s*(?:seu|sua)\s+tamanho\s+ideal\s+(?:é|para)\s*[^.!?]+[.!?]\s*/giu,
      ''
    )
    .replace(
      /^\s*(?:seu|sua)\s+tamanho\s+ideal\s+(?:é|para)\s*\S+\s*,\s*/giu,
      ''
    )
    .replace(/^\s*tu\s+talla\s+ideal\s+(?:es|para)\s*[^.!?]+[.!?]\s*/giu, '')
    .replace(/^\s*tu\s+talla\s+ideal\s+(?:es|para)\s*\S+\s*,\s*/giu, '')
    .replace(/^\s*your\s+ideal\s+size\s+(?:is|for)\s*[^.!?]+[.!?]\s*/giu, '')
    .replace(/^\s*your\s+ideal\s+size\s+(?:is|for)\s*\S+\s*,\s*/giu, '')
    .replace(/\bperfeito\s+para\s+suas?\s+propor[cç][oõ]es[^.!?]*[.!?]\s*/giu, '')
    .replace(/\bajuste\s+leve\s+e\s+flex[ií]vel[^.!?]*[.!?]\s*/giu, '')
    .trim();

  return body;
}

export function resolvePairingCaptionForChat(
  raw: string,
  fallbackCaption: string
): string {
  const stripped = stripSizeLeadFromPairingCaption(raw);
  if (!stripped || pairingCaptionMentionsSize(stripped)) {
    return String(fallbackCaption || '').trim();
  }
  return stripped;
}
