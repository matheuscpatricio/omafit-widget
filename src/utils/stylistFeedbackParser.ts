export type StylistFeedbackType =
  | 'none'
  | 'budget_down'
  | 'dislike_previous'
  | 'style_preference'
  | 'occasion_gift';

export type ParsedStylistFeedback = {
  type: StylistFeedbackType;
  sortPriceAsc: boolean;
  excludePreviousSuggestions: boolean;
  styleKeywords: string[];
};

const BUDGET_DOWN =
  /\b(caro|caríssim|carissim|preço\s+alto|muito\s+caro|barato|mais\s+barat|econômic|economico|promoç|promocao|desconto|orçamento|orcamento|budget|cheaper|affordable)\b/i;

const DISLIKE =
  /\b(não\s+gost|nao\s+gost|não\s+curt|nao\s+curt|outra\s+opç|outra\s+opc|diferente|não\s+quero\s+ess|nao\s+quero\s+ess|outro\s+estilo|something\s+else|don'?t\s+like)\b/i;

const STYLE_HINTS: Array<{ re: RegExp; kw: string }> = [
  { re: /\b(mais\s+)?formal\b/i, kw: 'formal' },
  { re: /\b(casual|dia\s+a\s+dia)\b/i, kw: 'casual' },
  { re: /\b(sem\s+estampa|lis[oa]|sólid)\b/i, kw: 'liso' },
  { re: /\b(pret[oa]|black)\b/i, kw: 'preto' },
  { re: /\b(bege|beige|neutr)\b/i, kw: 'neutro' },
  { re: /\b(jeans|denim)\b/i, kw: 'jeans' },
];

export function parseStylistFeedback(message: string): ParsedStylistFeedback {
  const m = String(message || '').trim();
  if (!m) {
    return {
      type: 'none',
      sortPriceAsc: false,
      excludePreviousSuggestions: false,
      styleKeywords: [],
    };
  }

  const budgetDown = BUDGET_DOWN.test(m);
  const dislike = DISLIKE.test(m);
  const styleKeywords = STYLE_HINTS.filter((h) => h.re.test(m)).map((h) => h.kw);

  let type: StylistFeedbackType = 'none';
  if (budgetDown) type = 'budget_down';
  else if (dislike) type = 'dislike_previous';
  else if (styleKeywords.length) type = 'style_preference';
  else if (/\b(presente|gift|dia\s+dos?\s+pai|dia\s+das?\s+m[ãa]es|natal)\b/i.test(m)) {
    type = 'occasion_gift';
  }

  return {
    type,
    sortPriceAsc: budgetDown,
    excludePreviousSuggestions: dislike,
    styleKeywords,
  };
}
