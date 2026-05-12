export type SuggestedChatProduct = {
  handle: string;
  title: string;
  image_url?: string;
};

/** Deteta se o utilizador pede explicitamente try-on / imagem / experimentar. */
export function userWantsTryOnGeneration(message: string): boolean {
  const raw = String(message || '').trim();
  if (raw.length < 3) return false;
  const n = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const patterns = [
    /try\s*on/,
    /\bpreview\b/,
    /\bgenerate\b|\bgenerat/,
    /probar|prueba|generar|imagen/,
    /experiment|experimenta|experimente|experimentar/,
    /testar|testa/,
    /gerar|gera\b|gere\b/,
    /previa|previsual|pre\-?visual/,
    /provador|tryon/,
    /imag(em|ens)/,
    /foto\s+(com|da|do)/,
    /montar|criar\s+(a\s+)?(imagem|foto)/,
    /quero\s+ver/,
    /quiero\s+ver/,
    /want\s+to\s+see/,
  ];
  return patterns.some((re) => re.test(n));
}

/** Escolhe qual sugestão corresponde melhor ao texto (senão null). */
export function pickSuggestedHandleFromUserText(
  message: string,
  suggestions: SuggestedChatProduct[]
): string | null {
  if (!suggestions.length) return null;
  const n = String(message || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  for (const s of suggestions) {
    const handle = String(s.handle || '').trim().toLowerCase();
    const slug = handle.replace(/-/g, ' ');
    if (handle && (n.includes(handle) || n.includes(slug))) {
      return s.handle;
    }
  }

  for (const s of suggestions) {
    const title = String(s.title || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const words = title.split(/[^a-z0-9áéíóúãõç]+/).filter((w) => w.length >= 4);
    for (const w of words) {
      if (n.includes(w)) return s.handle;
    }
  }

  return null;
}
