/**
 * Calçados e acessórios: podem aparecer nas sugestões do estilista,
 * mas não usam o provador de roupa (CTA → carrinho).
 */
const NON_GARMENT_TOKEN_RE =
  /(?:^|[^\p{L}])(?:sapatos?|calcados?|tenis|trainers?|sneakers?|sandalias?|chinelos?|slides?|boots?|heels?|loafers?|mocassins?|oxfords?|zapatos?|zapatillas?|botas?|botines?|chanclas?|calzado|oculos(?:\s+de\s+sol)?|sunglasses?|gafas?(?:\s+de\s+sol)?|anteojos?|reloj(?:es)?|relogio|smartwatch|watches?|cinto|cinturon|cintos?|belts?|carteira|carteiras|wallet|bolsas?|handbags?|clutch|mochila|backpack|rucksack|pulseiras?|colares?|brincos?|earrings?|necklaces?|bracelets?|rings?|joias?|bijuterias?|acessorios?|anel|aneis|argolas?|broches?|pingentes?|charms?|tiaras?|presilhas?|hair\s*clips?|headbands?|gorros?|bones?|chapeus?|sombreros?|fedoras?|gorras?|viseras?|viseiras?|toucas?|beanies?|luvas?|gloves?|cachecol|cachecois?|lenco|lencos?|echarpes?|bufandas?|scarves?|pa[nñ]uelos?|bandanas?|pochetes?|mini\s+bags?|crossbody|jewelry|accessor(?:y|ies))(?:[^\p{L}]|$)/u;

function textMentionsNonGarment(text: string): boolean {
  const folded = String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  return NON_GARMENT_TOKEN_RE.test(folded);
}

/** Título/handle de produto sugerido — calçado ou acessório (sem try-on de roupa). */
export function productLooksLikeNonGarmentForTryOn(product: {
  title?: string;
  handle?: string;
}): boolean {
  const handleSpaced = String(product.handle || '')
    .replace(/[-_]/g, ' ')
    .trim();
  return textMentionsNonGarment(`${String(product.title || '')} ${handleSpaced}`);
}
