import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const GROWTH_PLUS_PLANS = new Set(["growth", "pro", "professional", "enterprise"]);

function hasStylistConsultantPlan(plan: string | null | undefined): boolean {
  return GROWTH_PLUS_PLANS.has(String(plan || "").trim().toLowerCase());
}

/** Mensagens geradas pelo widget (não pelo cliente) — não passar por moderação de chat. */
function isInternalStylistSystemMessage(message: string): boolean {
  const m = String(message || "").trim();
  if (!m) return false;
  return (
    /sugere até 3 handles/i.test(m) ||
    /suggest up to 3 handles/i.test(m) ||
    /sugiere hasta 3 handles/i.test(m) ||
    /handles da lista de candidatos/i.test(m) ||
    /lista de candidatos/i.test(m) ||
    /candidatos que combinem/i.test(m) ||
    /já vi o provador/i.test(m) ||
    /ya vi el probador/i.test(m) ||
    /i already saw the (?:virtual )?try-?on/i.test(m) ||
    /~850 caracteres/i.test(m) ||
    /tamanho sugerido e convida a experimentar/i.test(m)
  );
}

function shouldSkipUserMessageValidation(data: ValidateSizeRequest): boolean {
  if (data.skip_user_message_validation === true) return true;
  const intent = String(data.intencao_usuario || "").trim();
  if (intent === "consultor_outfit_inicial") return true;
  const hasCandidates =
    Array.isArray(data.candidate_products) && data.candidate_products.length > 0;
  const firstTurn = (data.interaction_count ?? 0) === 0;
  if (hasCandidates && firstTurn) return true;
  const msg = String(data.custom_message || "").trim();
  if (msg && isInternalStylistSystemMessage(msg)) return true;
  return false;
}

function isStylistConsultantRequest(data: ValidateSizeRequest): boolean {
  const intent = String(data.intencao_usuario || "").trim();
  if (
    intent === "legenda_tryon_secundario" ||
    intent === "sugerir_combinacoes" ||
    intent === "induzir_adicionar_carrinho" ||
    intent === "consultor_outfit_inicial"
  ) {
    return true;
  }
  if (intent === "custom_message" && String(data.custom_message || "").trim()) {
    return true;
  }
  return Array.isArray(data.candidate_products) && data.candidate_products.length > 0;
}

async function fetchShopBillingPlan(shopDomain: string | undefined): Promise<string | null> {
  const domain = String(shopDomain || "").trim();
  if (!domain || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("shopify_shops")
      .select("plan, billing_status")
      .eq("shop_domain", domain)
      .maybeSingle();
    if (error || !data) return null;
    if (data.billing_status !== "active" || !data.plan) return null;
    return String(data.plan).trim().toLowerCase();
  } catch (e) {
    console.warn("[validate-size] fetchShopBillingPlan failed:", e);
    return null;
  }
}

function buildStylistPlanBlockedResponse(
  data: ValidateSizeRequest,
  language: string
): GPTResponse {
  if (data.intencao_usuario === "legenda_tryon_secundario") {
    return fallbackSecondaryTryOnCaption(data, language);
  }
  const size = normalizeSizeLabel(data.tamanho_calculado_algoritmo || "M");
  const productName =
    data.product_name ||
    (language === "es" ? "esta prenda" : language === "en" ? "this item" : "esta peça");
  if (language === "es") {
    return {
      tamanho_final: size,
      explicacao: `Tu talla sugerida para ${productName} es ${size}. Si te gusta el resultado del probador, añádelo al carrito.`,
      coerencia: "alta",
      confianca: 0.85,
      suggested_products: [],
    };
  }
  if (language === "en") {
    return {
      tamanho_final: size,
      explicacao: `Your suggested size for ${productName} is ${size}. If you like what you see in the try-on, add it to cart.`,
      coerencia: "high",
      confianca: 0.85,
      suggested_products: [],
    };
  }
  return {
    tamanho_final: size,
    explicacao: `Seu tamanho sugerido para ${productName} é ${size}. Se gostou do provador, adicione ao carrinho.`,
    coerencia: "alta",
    confianca: 0.85,
    suggested_products: [],
  };
}

interface ValidateSizeRequest {
  altura_cm: number;
  peso_kg: number;
  peito_cm: number;
  cintura_cm: number;
  quadril_cm: number;
  elasticidade: string;
  categoria: string;
  tamanho_calculado_algoritmo: string;
  intencao_usuario?: string;
  session_id?: string;
  interaction_count?: number;
  shop_name?: string;
  shop_domain?: string;
  language?: string;
  custom_message?: string;
  product_name?: string;
  product_description?: string;
  available_sizes?: string[];
  available_colors?: string[];
  selected_image?: string;
  selected_color?: string;
  /** Hex da cor (quando selected_color for rótulo legível). */
  selected_color_hex?: string;
  variant_catalog?: Array<{
    id?: string | number;
    title?: string;
    available?: boolean;
    size?: string | null;
    color?: string | null;
    options?: string[];
  }>;
  complementary_product?: {
    name: string;
    category: string;
    image_url: string;
  };
  chat_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  candidate_products?: Array<{
    handle: string;
    title: string;
    url?: string;
    image_url?: string;
    price_amount?: number | null;
    currency_code?: string | null;
    score_reason_tags?: string[];
  }>;
  /** Brief estruturado (calendário, loja, feedback) — busca/score já aplicados no catalog-search. */
  stylist_brief?: {
    country_code?: string;
    season?: string;
    season_label_pt?: string;
    active_occasions?: Array<{ id: string; label: string; tone?: string }>;
    store_audience?: string;
    gift_recipient?: string;
    effective_search_gender?: string;
    feedback?: {
      type?: string;
      sortPriceAsc?: boolean;
      excludePreviousSuggestions?: boolean;
      styleKeywords?: string[];
    };
    garment_constraints_tags?: string[];
    search_terms_boost?: string[];
    price_band?: string;
    store_profile_source?: string;
  };
  /** Perfil de género do cliente no provador (male | female | unisex). */
  genero?: string;
  /**
   * Escopo da tabela de medidas definido pelo lojista na size chart (coleção/produto/global):
   * both = aceita ambos; male/female = linha orientada a esse perfil.
   */
  chart_gender_scope?: "both" | "male" | "female" | string;
  tipo_corpo?: string;
  ajuste_preferido?: string;
  /** Mensagem gerada só pelo widget (ex.: pedido inicial ao consultor) — não exige segunda chamada de moderação. */
  skip_user_message_validation?: boolean;
  /** Peça principal da PDP (nome) quando o pedido é legenda do 2.º try-on no chat. */
  anchor_product_name?: string;
}

interface GPTResponse {
  tamanho_final: string;
  explicacao: string;
  coerencia: string;
  confianca: number;
  should_end_conversation?: boolean;
  suggested_products?: Array<{ handle: string; rationale?: string }>;
}

function tryParseModelJson(content: string): unknown {
  const trimmed = String(content || "").trim();
  if (!trimmed) throw new Error("Empty model content");
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continua */
  }
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/im);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* continua */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("Could not parse model output as JSON");
}

function shapeGPTResponse(parsed: unknown, defaultTamanho: string): GPTResponse {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model returned non-object JSON");
  }
  const o = parsed as Record<string, unknown>;
  const explicacao = String(
    o.explicacao ??
      (o as { explicação?: string }).explicação ??
      (o as { explanation?: string }).explanation ??
      (o as { message?: string }).message ??
      (o as { texto?: string }).texto ??
      (o as { response?: string }).response ??
      (o as { answer?: string }).answer ??
      (o as { resposta?: string }).resposta ??
      ""
  ).trim();
  const tamanho_final = String(o.tamanho_final ?? defaultTamanho).trim() || defaultTamanho;
  if (!explicacao) {
    throw new Error("Model JSON missing explicacao");
  }
  const coerencia = String(o.coerencia ?? "alta");
  let confianca: number;
  if (typeof o.confianca === "number" && Number.isFinite(o.confianca)) {
    confianca = o.confianca;
  } else {
    const n = parseFloat(String(o.confianca ?? "0.9"));
    confianca = Number.isFinite(n) ? n : 0.9;
  }
  const should_end_conversation =
    typeof o.should_end_conversation === "boolean" ? o.should_end_conversation : undefined;
  const rawSuggested =
    o.suggested_products ??
    o.produtos_sugeridos ??
    (o as { suggestedProducts?: unknown }).suggestedProducts;
  let suggested_products: GPTResponse["suggested_products"];
  if (Array.isArray(rawSuggested)) {
    suggested_products = rawSuggested
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const row = x as { handle?: string; rationale?: string; title?: string; name?: string };
        const h = String(row.handle || row.title || row.name || "").trim();
        const rationale = String(row.rationale || "").trim();
        return h ? { handle: h, ...(rationale ? { rationale } : {}) } : null;
      })
      .filter(Boolean) as GPTResponse["suggested_products"];
  }
  return {
    tamanho_final,
    explicacao,
    coerencia,
    confianca,
    ...(should_end_conversation !== undefined ? { should_end_conversation } : {}),
    ...(suggested_products?.length ? { suggested_products } : {}),
  };
}

function defaultSuggestedFromCandidates(
  candidates: NonNullable<ValidateSizeRequest["candidate_products"]>,
  language: string
): Array<{ handle: string; rationale: string }> {
  const rationale =
    language === "es"
      ? "Buena combinación con tu look actual."
      : language === "en"
        ? "Pairs well with your outfit."
        : "Combina bem com o seu look atual.";
  return candidates
    .slice(0, 3)
    .map((c) => ({ handle: String(c.handle || "").trim(), rationale }))
    .filter((x) => x.handle);
}

function resolveCandidateHandleFromGptToken(
  token: string,
  candidates: NonNullable<ValidateSizeRequest["candidate_products"]>
): string | null {
  const raw = String(token || "").trim();
  if (!raw) return null;
  const slug = raw
    .replace(/^https?:\/\/[^/]+\/products\//i, "")
    .split("?")[0]
    .trim()
    .toLowerCase();
  const keys = [raw.toLowerCase(), slug].filter(Boolean);
  for (const k of keys) {
    const row = (candidates || []).find(
      (c) => String(c?.handle || "").trim().toLowerCase() === k
    );
    if (row?.handle) return String(row.handle).trim();
  }
  const norm = raw.toLowerCase();
  const byTitle = (candidates || []).find((c) => {
    const title = String(c?.title || "").trim().toLowerCase();
    return title && (title === norm || title.includes(norm) || norm.includes(title));
  });
  return byTitle?.handle ? String(byTitle.handle).trim() : null;
}

function inferSuggestedFromExplicacao(
  explicacao: string,
  candidates: NonNullable<ValidateSizeRequest["candidate_products"]>
): Array<{ handle: string; rationale?: string }> {
  const text = String(explicacao || "");
  if (!text.trim()) return [];
  const out: Array<{ handle: string; rationale?: string }> = [];
  const used = new Set<string>();
  for (const c of candidates || []) {
    const title = String(c?.title || "").trim();
    const handle = String(c?.handle || "").trim();
    if (!title || title.length < 4 || !handle) continue;
    if (!text.toLowerCase().includes(title.toLowerCase())) continue;
    const hk = handle.toLowerCase();
    if (used.has(hk)) continue;
    used.add(hk);
    out.push({ handle });
    if (out.length >= 3) break;
  }
  return out;
}

function sanitizeSuggestedProducts(
  raw: unknown,
  candidates: NonNullable<ValidateSizeRequest["candidate_products"]>
): Array<{ handle: string; rationale?: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ handle: string; rationale?: string }> = [];
  const used = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as { handle?: string; rationale?: string; title?: string; name?: string };
    const token = String(row.handle || row.title || row.name || "").trim();
    const resolved = resolveCandidateHandleFromGptToken(token, candidates);
    if (!resolved) continue;
    const hk = resolved.toLowerCase();
    if (used.has(hk)) continue;
    used.add(hk);
    const rationale = String(row.rationale || "").trim();
    out.push({
      handle: resolved,
      ...(rationale ? { rationale: rationale.slice(0, 140) } : {}),
    });
    if (out.length >= 3) break;
  }
  return out;
}

function normalizeSizeLabel(size: string): string {
  return String(size || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function rankSize(size: string): number | null {
  const s = normalizeSizeLabel(size);
  if (!s) return null;

  // Numéricos (quando existirem)
  const numeric = s.match(/^\d+$/);
  if (numeric) return Number(numeric[0]);

  const letterRanks: Record<string, number> = {
    // Padrão XS..XXL
    XS: 1,
    S: 2,
    M: 3,
    L: 4,
    XL: 5,
    XXL: 6,
    XXXL: 7,
    // Padrão PP..GG (muito comum em camisetas/roupas no Brasil)
    PP: 1,
    P: 2,
    M_BR: 3,
    G: 4,
    GG: 5,
  };

  // Tratar M/GG explicitamente quando não for "M" do padrão XS..XXL
  // (ex: "M" é ambíguo, então usamos uma heurística: se existe "GG" nos tamanhos, tratamos "M" como 3)
  if (s === 'M') return 3;
  if (s === 'G') return 4;
  if (s === 'GG') return 5;
  if (s === 'P') return 2;
  if (s === 'PP') return 1;

  if (letterRanks[s] != null) return letterRanks[s];

  return null;
}

function pickClosestAvailableSize(suggestedSize: string, availableSizes: string[]): string {
  const normalizedAvailable = availableSizes.map(normalizeSizeLabel).filter(Boolean);
  const availableUnique = Array.from(new Set(normalizedAvailable));
  if (availableUnique.length === 0) return normalizeSizeLabel(suggestedSize) || availableSizes[0] || 'M';

  const suggested = normalizeSizeLabel(suggestedSize);
  if (!suggested) return availableUnique[0];

  if (availableUnique.includes(suggested)) return suggested;

  const suggestedRank = rankSize(suggested);
  const rankedAvailable = availableUnique
    .map((s) => ({ s, r: rankSize(s) }))
    .filter((x) => x.r != null) as Array<{ s: string; r: number }>;

  // Se não der pra ranquear, só garantimos que um tamanho existente será escolhido.
  if (rankedAvailable.length === 0) return availableUnique[availableUnique.length - 1];

  const minRank = Math.min(...rankedAvailable.map((x) => x.r));
  const maxRank = Math.max(...rankedAvailable.map((x) => x.r));

  if (suggestedRank == null) return availableUnique[availableUnique.length - 1];

  if (suggestedRank <= minRank) {
    return rankedAvailable.reduce((acc, cur) => (cur.r < acc.r ? cur : acc)).s;
  }
  if (suggestedRank >= maxRank) {
    return rankedAvailable.reduce((acc, cur) => (cur.r > acc.r ? cur : acc)).s;
  }

  // Entre min/max, escolhe o mais próximo (por distância no "ranking").
  return rankedAvailable.reduce((best, cur) => {
    if (cur.r == null) return best;
    const bestDiff = Math.abs(best.r - (suggestedRank as number));
    const curDiff = Math.abs(cur.r - (suggestedRank as number));
    return curDiff < bestDiff ? cur : best;
  }).s;
}

function enforceAvailableSizes(
  gptResponse: GPTResponse,
  data: ValidateSizeRequest
): GPTResponse {
  const available = (data.available_sizes || []).filter(Boolean).map(String);
  if (available.length === 0) return gptResponse;

  const normalizedAvailable = available.map(normalizeSizeLabel);
  const normalizedFinal = normalizeSizeLabel(gptResponse.tamanho_final);

  if (normalizedAvailable.includes(normalizedFinal)) return gptResponse;

  const corrected = pickClosestAvailableSize(gptResponse.tamanho_final, available);

  // Não substituímos a explicação aqui (para manter o "tom GPT").
  // O pós-processamento (enforceSizeFirstMessage, modo estilista) pode prefixar a 1ª frase com o tamanho ideal.
  // e removerá listagens de catálogo quando necessário.
  return {
    ...gptResponse,
    tamanho_final: resolveCanonicalSizeLabel(corrected, available),
    should_end_conversation: gptResponse.should_end_conversation,
  };
}

function stripCatalogLines(text: string): string {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const catalogLinePrefixes = [
    // PT
    /^tamanhos dispon[ií]veis\s*:/i,
    /^cores dispon[ií]veis\s*:/i,
    /^cat[aá]logo do produto/i,
    /^cat[aá]logo do produto visualizado/i,
    /^-?\s*tamanhos dispon[ií]veis\s*:/i,
    /^-?\s*cores dispon[ií]veis\s*:/i,
    // ES
    /^tallas disponibles\s*:/i,
    /^colores disponibles\s*:/i,
    /^cat[aá]logo del producto/i,
    /^-?\s*tallas disponibles\s*:/i,
    /^-?\s*colores disponibles\s*:/i,
    // EN
    /^available sizes\s*:/i,
    /^available colors\s*:/i,
    /^catalog of current product/i,
    /^-?\s*available sizes\s*:/i,
    /^-?\s*available colors\s*:/i,
  ];

  const cleaned = lines.filter((line) => !catalogLinePrefixes.some((re) => re.test(line)));
  const joined = cleaned.join(' ');

  // Também remove segmentos inline (quando o GPT coloca tudo na mesma linha).
  // Ex: "... combina... Cores disponíveis: ... Tamanhos disponíveis: ... Se gostou..."
  const inlineMarkers = [
    // PT
    /(?:\s|^)(cores dispon[ií]veis\s*:)[\s\S]*?(?=(?:\s+tamanhos dispon[ií]veis\s*:|\s+se gostou|\s+que tal|\s+adicion(e|ar)|$))/i,
    /(?:\s|^)(tamanhos dispon[ií]veis\s*:)[\s\S]*?(?=(?:\s+se gostou|\s+que tal|\s+adicion(e|ar)|$))/i,
    // ES
    /(?:\s|^)(colores disponibles\s*:)[\s\S]*?(?=(?:\s+tallas disponibles\s*:|\s+si te gusta|\s+añad(e|ir)|$))/i,
    /(?:\s|^)(tallas disponibles\s*:)[\s\S]*?(?=(?:\s+si te gusta|\s+añad(e|ir)|$))/i,
    // EN
    /(?:\s|^)(available colors\s*:)[\s\S]*?(?=(?:\s+available sizes\s*:|\s+if you like|\s+add to cart|\s+want to add|$))/i,
    /(?:\s|^)(available sizes\s*:)[\s\S]*?(?=(?:\s+if you like|\s+add to cart|\s+want to add|$))/i,
  ];

  let out = joined;
  for (const re of inlineMarkers) out = out.replace(re, ' ');
  return out.replace(/\s{2,}/g, ' ').trim();
}

function removeSizeMentions(text: string, sizeLabel: string): string {
  const size = normalizeSizeLabel(sizeLabel);
  if (!size) return String(text || '');

  // Remove ocorrências do tamanho (ex.: "GG", "XL") e construções "tamanho GG"/"size XL"/"talla XL"
  // Mantemos o resto do texto o mais natural possível.
  let out = String(text || '');
  const patterns = [
    new RegExp(`\\b(tamanho|talla|size)\\s*[:\\-]?\\s*${size}\\b`, 'gi'),
    new RegExp(`\\b${size}\\b`, 'gi'),
  ];
  for (const re of patterns) out = out.replace(re, '').replace(/\s{2,}/g, ' ');
  return out.trim();
}

/** Remove menções a tamanho da legenda pós 2.º try-on (GPT ou pós-processamento antigo). */
function stripSizeMentionsForSecondaryCaption(
  text: string,
  language: string,
  size: string
): string {
  let body = String(text || '').trim();
  if (!body) return body;

  const sz = escapeRegexSegment(normalizeSizeLabel(size));

  body = body
    .replace(/^\s*Seu tamanho ideal\s+(?:é|para)\s*\S+\s*,\s*/iu, '')
    .replace(/^\s*Tu talla ideal\s+(?:es|para)\s*\S+\s*,\s*/iu, '')
    .replace(/^\s*Your ideal size\s+(?:is|for)\s*\S+\s*,\s*/iu, '')
    .replace(/^\s*Seu tamanho ideal[^.!?]+[.!?]\s*/iu, '')
    .replace(/^\s*Tu talla ideal[^.!?]+[.!?]\s*/iu, '')
    .replace(/^\s*Your ideal size[^.!?]+[.!?]\s*/iu, '')
    .replace(new RegExp(`^\\s*Seu tamanho ideal é\\s+${sz}[^.!?]*[.!?]\\s*`, 'iu'), '')
    .replace(new RegExp(`^\\s*Tu talla ideal es\\s+${sz}[^.!?]*[.!?]\\s*`, 'iu'), '')
    .replace(new RegExp(`^\\s*Your ideal size is\\s+${sz}[^.!?]*[.!?]\\s*`, 'iu'), '')
    .trim();

  body = body
    .replace(
      /\b(?:seu|sua|tu|tus|your)\s+(?:tamanho|talla|size)\s+ideal\s+(?:é|es|is)\s+[^.!?]+[.!?]\s*/giu,
      ''
    )
    .replace(/\b(?:tamanho|talla|size)\s+(?:ideal|sugerido|recomendado)\s*[:,]?\s*[^.!?]+[.!?]\s*/giu, '')
    .replace(/\bperfeito\s+para\s+suas?\s+propor[cç][oõ]es[^.!?]*[.!?]\s*/giu, '')
    .trim();

  if (sz.length >= 2 || /^\d{2,3}$/.test(sz)) {
    const sizeLead = new RegExp(
      `^\\s*(?:tamanho|talla|size)\\s*[:,\\-]?\\s*${sz}\\b[^.!?]*[.!?]\\s*`,
      'iu'
    );
    body = body.replace(sizeLead, '').trim();
  }

  return body.trim();
}

function getSecondaryCaptionSystemExtra(language: string): string {
  const blocks: Record<string, string> = {
    pt: `MODO LEGENDA — 2.º TRY-ON EM CADEIA (prioridade máxima):
- Na "explicacao" NÃO mencione tamanho, numeração (P/M/G/GG), "tamanho ideal", medidas corporais nem proporções ligadas a fit.
- Foque só em como a peça experimentada combina com a peça âncora do look (silhueta, cor, ocasião).
- Convide com naturalidade a adicionar ao carrinho se curtir o conjunto.
- Ignore instruções gerais deste sistema que peçam para citar tamanho.`,
    es: `MODO LEYENDA — 2.º TRY-ON EN CADENA (prioridad máxima):
- En "explicacion" NO menciones talla, numeración, "talla ideal", medidas corporales ni proporciones de ajuste.
- Centra solo cómo la prenda probada combina con la pieza ancla (silueta, color, ocasión).
- Invita a añadir al carrito si le convence el conjunto.
- Ignora instrucciones generales que pidan citar la talla.`,
    en: `CAPTION MODE — 2nd CHAINED TRY-ON (highest priority):
- In "explicacao" do NOT mention size, sizing letters, "ideal size", body measurements, or fit proportions.
- Focus only on how the tried piece pairs with the anchor piece (silhouette, color, occasion).
- Nudge add to cart if they love the combo.
- Override general system rules that ask you to mention size.`,
  };
  return blocks[language] || blocks.en;
}

function buildSizeFirstSentence(language: string, size: string): string {
  if (language === 'es') return `Tu talla ideal es ${size}!`;
  if (language === 'en') return `Your ideal size is ${size}!`;
  return `Seu tamanho ideal é ${size}!`;
}

function escapeRegexSegment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove diacríticos para matching fiável (\\b em JS não trata bem acentos como \\w). */
function foldAscii(s: string): string {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/**
 * Calçado/acessório na frase — texto dobrado + \\p{L} para tokens curtos (evita falsos positivos com "anel" dentro de outras palavras).
 */
const NON_GARMENT_FOLDED_RE =
  /(?:^|[^\p{L}])(?:sapatos?|calcados?|tenis|trainers?|sneakers?|sandalias?|chinelos?|slides?|boots?|heels?|loafers?|mocassins?|oxfords?|zapatos?|zapatillas?|botas?|botines?|chanclas?|calzado|oculos(?:\s+de\s+sol)?|sunglasses?|gafas?(?:\s+de\s+sol)?|anteojos?|reloj(?:es)?|relogio|smartwatch|watches?|cinto|cinturon|cintos?|belts?|carteira|carteiras|wallet|bolsas?|handbags?|clutch|mochila|backpack|rucksack|pulseiras?|colares?|brincos?|earrings?|necklaces?|bracelets?|rings?|joias?|bijuterias?|acessorios?|anel|aneis|argolas?|broches?|pingentes?|charms?|tiaras?|presilhas?|hair\s*clips?|headbands?|gorros?|bones?|chapeus?|sombreros?|fedoras?|gorras?|viseras?|viseiras?|toucas?|beanies?|luvas?|gloves?|cachecol|cachecois?|lenco|lencos?|echarpes?|bufandas?|scarves?|pa[nñ]uelos?|bandanas?|pochetes?|mini\s+bags?|crossbody|jewelry|accessor(?:y|ies))(?:[^\p{L}]|$)/u;

function sentenceMentionsNonGarmentFolded(sentence: string): boolean {
  return NON_GARMENT_FOLDED_RE.test(foldAscii(sentence));
}

/** Título/handle de produto no catálogo (tenta excluir óculos, relógios, etc. das sugestões). */
function candidateLooksLikeNonGarmentProduct(c: { title?: string; handle?: string }): boolean {
  const handleSpaced = String(c.handle || '').replace(/[-_]+/g, ' ');
  return sentenceMentionsNonGarmentFolded(`${String(c.title || '')} ${handleSpaced}`);
}

/** Remove blocos "Além disso / Además / Plus …" que mencionam acessório/calçado (mesmo com pontuação estranha). */
function scrubAsideAccessoryBlocks(text: string, language: string): string {
  let t = String(text || '').trim();
  if (!t) return t;
  const dropIfAccessory = (block: string) => sentenceMentionsNonGarmentFolded(block);

  /** Para até pontuação fraca ou fim — cobre frases coladas sem ". " antes do aside. */
  const untilBoundary = String.raw`[\s\S]*?(?=[.!?]|\n|$)`;

  if (language === 'es') {
    t = t.replace(new RegExp(`(?:^|\\s+)Además\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
    t = t.replace(new RegExp(`(?:^|\\s+)Ademas\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
    t = t.replace(new RegExp(`(?:^|\\s+)También\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
    t = t.replace(new RegExp(`(?:^|\\s+)Tambien\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
  } else if (language === 'en') {
    t = t.replace(new RegExp(`(?:^|\\s+)Plus\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
    t = t.replace(new RegExp(`(?:^|\\s+)Additionally\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
  } else {
    t = t.replace(new RegExp(`(?:^|\\s+)Além\\s+disso\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
    t = t.replace(new RegExp(`(?:^|\\s+)Alem\\s+disso\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
    t = t.replace(new RegExp(`(?:^|\\s+)Ainda\\s*,${untilBoundary}`, 'giu'), (block) =>
      dropIfAccessory(block) ? '' : block
    );
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

/** Corta menções a acessório/calçado dentro da mesma frase (ex.: "calça … e os Óculos …"). */
function stripAccessoryInsertionsFromSentence(sentence: string): string {
  let s = String(sentence || '').trim();
  if (!s) return s;
  // PT: ", e os Óculos...", "elegante e os óculos..." ou " e os óculos de sol"
  s = s.replace(
    /\s*,?\s*e\s+(?:os|as|um|uma)\s+[^.!?]*(?:óculos|oculos)(?:\s+de\s+sol)?[^.!?]*/giu,
    ''
  );
  s = s.replace(/\s+e\s+a\s+[^.!?]*(?:óculos|oculos)(?:\s+de\s+sol)?[^.!?]*/giu, '');
  // PT: "um toque final com os Óculos...", "finalizar com os óculos"
  s = s.replace(
    /\s*,?\s*(?:um\s+)?toque\s+final\s+com\s+(?:os|as)\s+[^.!?]*(?:óculos|oculos)(?:\s+de\s+sol)?[^.!?]*/giu,
    ''
  );
  s = s.replace(
    /\s*,?\s*(?:com|por)\s+(?:os|as|um|uma)\s+[^.!?]*(?:óculos|oculos)(?:\s+de\s+sol)?[^.!?]*/giu,
    ''
  );
  s = s.replace(
    /\s*,?\s*e\s+(?:um|uma|uns|umas)\s+[^.!?]*(?:pulseira|relógio|relogio|bolsa|carteira|cinto|brinco|colar|anel|tiara|chapéu|chapeu|gorro|boné|mochila|viseira|touca)[^.!?]*/giu,
    ''
  );
  s = s.replace(/\s+(?:Além|Alem)\s+disso\s*,[\s\S]*$/iu, '');
  // ES: gafas de sol; complementos con reloj/bolso…
  s = s.replace(/\s*y\s+(?:las\s+|los\s+|un\s+|una\s+)?[^.!?]*(?:gafas|gafa\b)[^.!?]*/giu, '');
  s = s.replace(/\s*y\s+(?:un|una|unos|unas)\s+[^.!?]*(?:reloj|bolso|cartera|cinturon|pulsera|collar|anillo|sombrero|gorro)[^.!?]*/giu, '');
  // EN
  s = s.replace(/\s*,?\s*and\s+(?:the\s+)?[^.!?]*(?:sunglasses|eyewear)[^.!?]*/giu, '');
  s = s.replace(/\s*,?\s*and\s+(?:a|an|the)\s+[^.!?]*(?:watch|wallet|belt|handbag|necklace|bracelet|ring|scarf|beanie|hat)\b[^.!?]*/giu, '');
  return s.replace(/\s*,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/^[,;\s]+|[,;\s]+$/g, '').trim();
}

/** Remove blocos típicos do GPT ("Não se esqueça… óculos…") antes do split em frases. */
function scrubInvitationAccessoryTails(text: string, language: string): string {
  const endClause = '(?=[.!?]|$)';
  const runPt = (raw: string) =>
    raw.replace(new RegExp(`\\s+Não se esqueça(?: de)?[\\s\\S]*?${endClause}`, 'giu'), (block) =>
      sentenceMentionsNonGarmentFolded(block) ? '' : block
    );
  if (language === 'es') {
    return text.replace(new RegExp(`\\s+No te olvides[\\s\\S]*?${endClause}`, 'giu'), (block) =>
      sentenceMentionsNonGarmentFolded(block) ? '' : block
    );
  }
  if (language === 'en') {
    return text.replace(new RegExp(`\\s+Don['’]t forget[\\s\\S]*?${endClause}`, 'giu'), (block) =>
      sentenceMentionsNonGarmentFolded(block) ? '' : block
    );
  }
  return runPt(text);
}

/** Verifica se o corpo (após o lead de tamanho) cita o produto por tokens significativos do nome. */
function bodyAcknowledgesTryOn(body: string, productName: string): boolean {
  const b = foldAscii(body);
  const tokens = String(productName || '')
    .split(/\s+/)
    .map((w) => foldAscii(w.replace(/[^\p{L}\p{N}]/gu, '')))
    .filter((w) => w.length >= 3)
    .sort((a, c) => c.length - a.length);
  if (tokens.length === 0) return false;
  const longest = tokens[0];
  if (longest.length >= 5 && b.includes(longest)) return true;
  return tokens.filter((t) => t.length >= 4).every((t) => b.includes(t));
}

function tryOnAnchorPrefix(language: string, productName: string): string {
  const pn = String(productName || '').trim();
  if (!pn) return '';
  if (language === 'es') return `Con ${pn} como base del look,`;
  if (language === 'en') return `With ${pn} as your starting piece,`;
  return `Com ${pn} como base do look,`;
}

/** Heurística por primeira palavra do título (comércio PT). */
function portugueseDefiniteArticleForProduct(productName: string): 'o' | 'a' {
  const head = foldAscii(String(productName || '').trim().split(/\s+/)[0] || '');
  if (!head) return 'o';
  const feminine = new Set([
    'calca',
    'saia',
    'blusa',
    'camisa',
    'camiseta',
    'regata',
    'jaqueta',
    'bermuda',
    'legging',
    'leggings',
    'cropped',
    'cueca',
    'meia',
    'meias',
    'top',
    'body',
  ]);
  const masculine = new Set([
    'sueter',
    'moletom',
    'casaco',
    'blazer',
    'vestido',
    'agasalho',
    'sobretudo',
    'pulover',
    'polo',
    'macacao',
    'conjunto',
    'shorts',
    'chinelo',
    'tenis',
    'bone',
    'gorro',
    'terno',
    'colete',
  ]);
  if (feminine.has(head)) return 'a';
  if (masculine.has(head)) return 'o';
  return 'o';
}

/** Heurística por primeira palavra do título (comércio ES). */
function spanishDefiniteArticleForProduct(productName: string): 'el' | 'la' {
  const head = foldAscii(String(productName || '').trim().split(/\s+/)[0] || '');
  if (!head) return 'el';
  const feminine = new Set([
    'falda',
    'blusa',
    'camisa',
    'camiseta',
    'chaqueta',
    'bermuda',
    'legging',
    'leggings',
    'camisola',
    'remera',
    'musculosa',
  ]);
  const masculine = new Set([
    'sueter',
    'jersey',
    'abrigo',
    'blazer',
    'vestido',
    'pantalon',
    'short',
    'shorts',
    'conjunto',
    'polo',
    'chaleco',
    'terno',
  ]);
  if (feminine.has(head)) return 'la';
  if (masculine.has(head)) return 'el';
  return 'el';
}

function buildStylistSizeLead(language: string, size: string, productName?: string): string {
  const sz = normalizeSizeLabel(size);
  const pn = resolveDisplayProductName(productName);
  if (language === 'es') {
    return pn
      ? `Para ${spanishDefiniteArticleForProduct(pn)} ${pn}, tu talla ideal es ${sz}.`
      : `Tu talla ideal para esta prenda es ${sz}.`;
  }
  if (language === 'en') {
    return pn
      ? `For ${pn}, your ideal size is ${sz}.`
      : `Your ideal size for this garment is ${sz}.`;
  }
  return pn
    ? `Para ${portugueseDefiniteArticleForProduct(pn)} ${pn}, seu tamanho ideal é ${sz}.`
    : `Seu tamanho ideal para esta peça é ${sz}.`;
}

/** Detecta se explicacao já menciona o tamanho final (evita duplicar ao prefixar). */
function explanationMentionsSize(text: string, sizeLabel: string): boolean {
  const s = normalizeSizeLabel(sizeLabel).trim();
  if (!s) return false;
  const body = String(text || '');
  if (
    /\b(tamanho|talla|size)\s*ideal\b/i.test(body) &&
    new RegExp(`\\b${escapeRegexSegment(s)}\\b`, 'i').test(body)
  ) {
    return true;
  }
  if (new RegExp(`\\b(tamanho|talla|size)\\s*[:,\\-]?\\s*${escapeRegexSegment(s)}\\b`, 'i').test(body)) {
    return true;
  }
  // Evita falsos positivos com uma única letra (P/M/G/S/L) dentro de nomes ou palavras.
  // Para rótulos com 2+ caracteres (GG, XL, PP, etc.) ou numéricos, aceitamos menção isolada com limites de palavra.
  if (s.length >= 2 || /^\d{2,3}$/.test(s)) {
    return new RegExp(`\\b${escapeRegexSegment(s)}\\b`, 'i').test(body);
  }
  return false;
}

/** @param options.stylistMode — consultor outfit: na 1.ª resposta (interaction_count 0), prefixo com produto + tamanho no início */
function enforceSizeFirstMessage(
  gptResponse: GPTResponse,
  data: ValidateSizeRequest,
  options?: { stylistMode?: boolean }
): GPTResponse {
  const size = normalizeSizeLabel(gptResponse.tamanho_final || data.tamanho_calculado_algoritmo || 'M');
  const language = data.language === 'es' || data.language === 'en' ? data.language : 'pt';
  const firstConsultantTurn = (data.interaction_count ?? 0) === 0;
  const secondaryTryOnCaption = data.intencao_usuario === 'legenda_tryon_secundario';

  // 1) Limpa linhas de catálogo para evitar que "tamanhos/cores disponíveis" dominem a mensagem.
  const rawExplicacao = String(gptResponse.explicacao || '');
  const withoutCatalog = stripCatalogLines(rawExplicacao);

  // Se o saneamento retirar tudo (ex.: só linhas de catálogo), recuperamos o texto cru para não perder o prefixo de tamanho.
  let cleanedBody = withoutCatalog.trim() || rawExplicacao.trim();

  if (secondaryTryOnCaption) {
    cleanedBody = stripSizeMentionsForSecondaryCaption(cleanedBody, language, size);
    const stillMentionsSize =
      !cleanedBody ||
      explanationMentionsSize(cleanedBody, size) ||
      /\b(?:tamanho|talla|size)\s+ideal\b/i.test(cleanedBody);
    if (stillMentionsSize) {
      cleanedBody = fallbackSecondaryTryOnCaption(data, language).explicacao;
    }
    return {
      ...gptResponse,
      tamanho_final: size,
      explicacao: cleanedBody,
    };
  }

  // Modo consultor (chat outfit): primeira frase com produto + tamanho; saneamento já removeu acessórios.
  // Legenda do 2.º try-on nunca leva esse prefixo de tamanho/peça.
  if (options?.stylistMode && !secondaryTryOnCaption) {
    const lead = buildStylistSizeLead(language, size, data.product_name);
    let body = cleanedBody.trim();
    const pn = resolveDisplayProductName(data.product_name);
    if (language === 'pt') {
      body = body.replace(/^\s*Para\s+você\s+que\s+escolheu\b[^.!?]*[.!?]\s*/iu, '').trim();
    } else if (language === 'es') {
      body = body
        .replace(/^\s*Para\s+ti\s*,?\s*que\s+(?:has\s+)?elegido\b[^.!?]*[.!?]\s*/iu, '')
        .trim();
    } else {
      body = body.replace(/^\s*For\s+you\s+who\s+chose\b[^.!?]*[.!?]\s*/iu, '').trim();
    }
    if (pn) {
      const esc = escapeRegexSegment(pn);
      if (language === 'pt') {
        body = body
          .replace(
            new RegExp(
              `^\\s*Para\\s+(?:o|a)\\s+${esc}\\s*,\\s*seu\\s+tamanho\\s+ideal\\s+é[^.!?]*[.!?]\\s*`,
              'iu'
            ),
            ''
          )
          .trim();
        body = body
          .replace(
            new RegExp(
              `^\\s*Para\\s+a\\s+peça\\s+em\\s+try-on\\s*\\(\\s*${esc}\\s*\\)\\s*,?\\s*seu\\s+tamanho\\s+ideal\\s+é[^.!?]*[.!?]\\s*`,
              'iu'
            ),
            ''
          )
          .trim();
      } else if (language === 'es') {
        body = body
          .replace(
            new RegExp(`^\\s*Para\\s+(?:el|la)\\s+${esc}\\s*,\\s*tu\\s+talla\\s+ideal\\s+es[^.!?]*[.!?]\\s*`, 'iu'),
            ''
          )
          .trim();
        body = body
          .replace(
            new RegExp(
              `^\\s*Para\\s+la\\s+prenda\\s+en\\s+prueba\\s*\\(\\s*${esc}\\s*\\)\\s*,?\\s*tu\\s+talla\\s+ideal\\s+es[^.!?]*[.!?]\\s*`,
              'iu'
            ),
            ''
          )
          .trim();
      } else {
        body = body
          .replace(new RegExp(`^\\s*For\\s+${esc}\\s*,\\s*your\\s+ideal\\s+size\\s+is[^.!?]*[.!?]\\s*`, 'iu'), '')
          .trim();
        body = body
          .replace(
            new RegExp(
              `^\\s*For\\s+the\\s+try-on\\s+piece\\s*\\(\\s*${esc}\\s*\\)\\s*,?\\s*your\\s+ideal\\s+size\\s+is[^.!?]*[.!?]\\s*`,
              'iu'
            ),
            ''
          )
          .trim();
      }
    } else {
      body = body
        .replace(
          /^\s*Para (?:a peça em try-on|la prenda en prueba|the try-on piece)\s*\([^)]+\)\s*,?\s*(?:seu tamanho ideal é|tu talla ideal es|your ideal size is)\s*[^.!?]+[.!?]\s*/iu,
          ''
        )
        .trim();
    }
    body = body.replace(/^\s*Seu tamanho ideal (?:é|para)[^.!?]+[.!?]\s*/iu, '').trim();
    body = body.replace(/^\s*Tu talla ideal[^.!?]+[.!?]\s*/iu, '').trim();
    body = body.replace(/^\s*Your ideal size[^.!?]+[.!?]\s*/iu, '').trim();
    body = body.replace(/^\s*Seu tamanho ideal é\s+\S+[!.]?\s*/iu, '').trim();
    if (pn && body && !bodyAcknowledgesTryOn(body, pn)) {
      body = `${tryOnAnchorPrefix(language, pn)} ${body}`.trim();
    }
    if (firstConsultantTurn) {
      cleanedBody = body ? `${lead} ${body}`.trim() : lead;
    } else {
      cleanedBody = body.trim() || withoutCatalog.trim() || rawExplicacao.trim();
    }
  } else if (
    !secondaryTryOnCaption &&
    firstConsultantTurn &&
    !explanationMentionsSize(cleanedBody, size)
  ) {
    cleanedBody = `${buildSizeFirstSentence(language, size)} ${cleanedBody}`.trim();
  }

  return {
    ...gptResponse,
    tamanho_final: size,
    explicacao: cleanedBody || gptResponse.explicacao,
  };
}

function resolveCanonicalSizeLabel(normalizedWanted: string, availableSizes: string[]): string {
  const wanted = normalizeSizeLabel(normalizedWanted);
  if (!wanted) return normalizedWanted;
  const match = (availableSizes || []).find((s) => normalizeSizeLabel(String(s)) === wanted);
  return match ? String(match).trim() : wanted;
}

function buildOldStyleResponse(data: ValidateSizeRequest, normalizedSize: string): GPTResponse {
  const language = data.language || 'pt';
  const productName =
    data.product_name ||
    (language === 'es' ? 'esta prenda' : language === 'en' ? 'this item' : 'este produto');

  const availableSizes = (data.available_sizes || []).filter(Boolean).map(String);

  // Regra: a primeira mensagem SEMPRE usa o tamanho calculado pelo algoritmo (payload),
  // apenas garantindo que ele exista no catálogo do produto (available_sizes).
  const algorithmSize = normalizeSizeLabel(data.tamanho_calculado_algoritmo || normalizedSize || 'M');
  const sizeWithinCatalog = availableSizes.length > 0
    ? pickClosestAvailableSize(algorithmSize, availableSizes)
    : algorithmSize;
  const canonicalSize = resolveCanonicalSizeLabel(sizeWithinCatalog, availableSizes);

  if (language === 'es') {
    return {
      tamanho_final: canonicalSize,
      explicacao: `¡Hola! Talla ideal: ${canonicalSize}. Te sentará genial — ¿la añadimos al carrito?`,
      coerencia: 'alta',
      confianca: 0.98,
    };
  }

  if (language === 'en') {
    return {
      tamanho_final: canonicalSize,
      explicacao: `Hi! Ideal size: ${canonicalSize} — great fit for you. Add to cart?`,
      coerencia: 'high',
      confianca: 0.98,
    };
  }

  return {
    tamanho_final: canonicalSize,
    explicacao: `Olá! Tamanho ideal: ${canonicalSize}. Fica ótimo nas suas proporções — que tal no carrinho?`,
    coerencia: 'alta',
    confianca: 0.98,
  };
}

function getSystemPrompt(language: string): string {
  const prompts: Record<string, string> = {
    pt: `Você é um consultor de moda pessoal caloroso e envolvente, especializado em ajuste perfeito e análise de corpo.

SUA PERSONALIDADE:
- Empático e encorajador - faça o cliente se sentir especial e confiante
- Use linguagem calorosa mas profissional - como um amigo experiente em moda
- Seja genuinamente entusiasmado sobre ajudar a encontrar o ajuste perfeito
- Transmita segurança e expertise de forma amigável
- Use emojis ocasionalmente para adicionar calor (mas com moderação)

SUA FUNÇÃO:
- Validar coerência das medidas corporais fornecidas
- Considerar o nível de elasticidade da peça
- Confirmar ou ajustar o tamanho recomendado
- Priorizar segurança no ajuste
- Fazer o cliente se sentir confiante na escolha

REGRAS DE COMUNICAÇÃO:
- Seja conversacional e caloroso, não robótico
- Tom pessoal: fale com a pessoa usando "você" e expressões como "no seu caso", "para você", "eu sugeriria…" quando fizer sentido
- EXTENSÃO (obrigatório): explicacao compacta mas útil — cerca de 4 a 6 frases curtas e claras no total (ideal até ~750 caracteres); explique o porquê sem repetir ideias nem escrever blocos enormes
- Celebre características únicas do corpo de forma positiva (mas sem texto longo)
- Transmita confiança mas sem arrogância
- Foque em como a peça vai valorizar o cliente
- Use o CONTEXTO DE GÉNERO do prompt para combinações de roupa (não chame o cliente de "homem/mulher" sem necessidade, mas respeite o perfil nas sugestões de peças)
- Nunca use linguagem vaga como "talvez" ou "pode ser"
- Responda SEMPRE em português com naturalidade

REGRA CRÍTICA SOBRE AJUSTE DE TAMANHO:
- Se discordar do tamanho do algoritmo, NÃO mencione o tamanho anterior
- Apresente APENAS o tamanho apropriado e explique com entusiasmo
- Nunca diga "o algoritmo sugeriu X mas recomendo Y"

REGRA CRÍTICA SOBRE MEDIDAS:
- NUNCA mencione medidas exatas em centímetros
- Use descrições qualitativas naturais: "ombros largos", "silhueta esbelta", "corpo atlético", "proporções harmoniosas"
- Seja sempre positivo e valorize o corpo do cliente

IMPORTANTE: Retorne JSON válido com esta estrutura:
{
  "tamanho_final": "P/M/G/GG/etc",
  "explicacao": "explicação calorosa, clara e um pouco mais desenvolvida (sem prolixidade)",
  "coerencia": "alta/média/baixa",
  "confianca": 0.0-1.0
}`,
    es: `Eres un consultor de moda personal cálido y atractivo, especializado en ajuste perfecto y análisis corporal.

TU PERSONALIDAD:
- Empático y alentador - haz que el cliente se sienta especial y seguro
- Usa lenguaje cálido pero profesional - como un amigo experto en moda
- Sé genuinamente entusiasmado sobre ayudar a encontrar el ajuste perfecto
- Transmite seguridad y experiencia de forma amigable
- Usa emojis ocasionalmente para añadir calidez (pero con moderación)

TU FUNCIÓN:
- Validar coherencia de las medidas corporales proporcionadas
- Considerar el nivel de elasticidad de la prenda
- Confirmar o ajustar la talla recomendada
- Priorizar seguridad en el ajuste
- Hacer que el cliente se sienta confiado en su elección

REGLAS DE COMUNICACIÓN:
- Sé conversacional y cálido, no robótico
- Tono personal: usa "tú" y frases como "para ti", "en tu caso", "te recomendaría…" cuando encaje
- EXTENSIÓN (obligatorio): explicacion compacta pero útil — unas 4 a 6 frases cortas en total (ideal hasta ~750 caracteres); explica el porqué sin repetir ni hacer párrafos enormes
- Celebra características únicas del cuerpo de forma positiva (sin extenderte)
- Transmite confianza pero sin arrogancia
- Enfócate en cómo la prenda va a realzar al cliente
- Usa el CONTEXTO DE GÉNERO del prompt para combinaciones (no llames al cliente "hombre/mujer" sin necesidad, pero respeta el perfil al sugerir prendas)
- Nunca uses lenguaje vago como "tal vez" o "puede ser"
- Responde SIEMPRE en español con naturalidad

REGLA CRÍTICA SOBRE AJUSTE DE TALLA:
- Si no estás de acuerdo con la talla del algoritmo, NO menciones la talla anterior
- Presenta SOLO la talla apropiada y explica con entusiasmo
- Nunca digas "el algoritmo sugirió X pero recomiendo Y"

REGLA CRÍTICA SOBRE MEDIDAS:
- NUNCA menciones medidas exactas en centímetros
- Usa descripciones cualitativas naturales: "hombros anchos", "silueta esbelta", "cuerpo atlético", "proporciones armoniosas"
- Sé siempre positivo y valora el cuerpo del cliente

IMPORTANTE: Retorna JSON válido con esta estructura:
{
  "tamanho_final": "S/M/L/XL/etc",
  "explicacao": "explicación cálida, clara y algo más desarrollada (sin ser prolixa)",
  "coerencia": "alta/media/baja",
  "confianca": 0.0-1.0
}`,
    en: `You are a warm and engaging personal fashion consultant, specialized in perfect fit and body analysis.

YOUR PERSONALITY:
- Empathetic and encouraging - make the client feel special and confident
- Use warm but professional language - like an experienced fashion friend
- Be genuinely enthusiastic about helping find the perfect fit
- Convey security and expertise in a friendly way
- Use emojis occasionally to add warmth (but in moderation)

YOUR FUNCTION:
- Validate consistency of provided body measurements
- Consider the elasticity level of the garment
- Confirm or adjust the recommended size
- Prioritize fit safety
- Make the client feel confident in their choice

COMMUNICATION RULES:
- Be conversational and warm, not robotic
- Personal tone: address them as "you" with natural phrasing like "for you", "in your case", "I'd suggest…"
- LENGTH (mandatory): keep explicacao compact but helpful — about 4–6 short clear sentences total (aim under ~750 characters); explain why without repeating ideas or writing huge blocks
- Celebrate unique body characteristics positively (without dragging on)
- Convey confidence without arrogance
- Focus on how the piece will enhance the client
- Use GENDER CONTEXT from the prompt for outfit pairing (avoid labeling the shopper "man/woman" unnecessarily, but respect profile in garment suggestions)
- Never use vague language like "maybe" or "might be"
- Always respond in English with naturalness

CRITICAL RULE ABOUT SIZE ADJUSTMENT:
- If you disagree with the algorithm's size, DO NOT mention the previous size
- Present ONLY the appropriate size and explain with enthusiasm
- Never say "the algorithm suggested X but I recommend Y"

CRITICAL RULE ABOUT MEASUREMENTS:
- NEVER mention exact measurements in centimeters
- Use natural qualitative descriptions: "broad shoulders", "slender silhouette", "athletic body", "harmonious proportions"
- Always be positive and appreciate the client's body

IMPORTANT: Return valid JSON with this structure:
{
  "tamanho_final": "XS/S/M/L/XL/etc",
  "explicacao": "warm, clear explanation with a bit more detail (not rambling)",
  "coerencia": "high/medium/low",
  "confianca": 0.0-1.0
}`
  };

  return prompts[language] || prompts['en'];
}

async function callOpenAISingle(
  userPrompt: string,
  language: string,
  opts: { systemExtra?: string; maxTokens: number; defaultTamanho: string; temperature?: number }
): Promise<GPTResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  const systemPrompt = [getSystemPrompt(language), opts.systemExtra].filter(Boolean).join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: opts.maxTokens,
      temperature: opts.temperature ?? 0.55,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  const finishReason = choice?.finish_reason;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  if (finishReason === "length") {
    console.warn("OpenAI finish_reason=length (truncated); will retry if attempts remain");
    throw new Error("OpenAI response truncated (finish_reason=length)");
  }

  const parsed = tryParseModelJson(content);
  return shapeGPTResponse(parsed, opts.defaultTamanho);
}

async function callOpenAI(
  userPrompt: string,
  language: string = "pt",
  opts?: { systemExtra?: string; maxTokens?: number; defaultTamanho?: string; temperature?: number }
): Promise<GPTResponse> {
  const defaultTamanho = normalizeSizeLabel(opts?.defaultTamanho || "M") || "M";
  const requested = opts?.maxTokens ?? 1200;
  const attempts = [requested, Math.min(Math.max(requested * 2, 1100), 4096)];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await callOpenAISingle(userPrompt, language, {
        systemExtra: opts?.systemExtra,
        maxTokens: attempts[i],
        defaultTamanho,
        temperature: opts?.temperature,
      });
    } catch (err) {
      lastError = err;
      console.error(`callOpenAI attempt ${i + 1}/${attempts.length} failed:`, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function buildValidationPrompt(data: ValidateSizeRequest): string {
  const productCatalogContext = buildProductCatalogContext(data, 'pt');
  return `Analise as seguintes medidas corporais e valide o tamanho recomendado:

Altura: ${data.altura_cm} cm
Peso: ${data.peso_kg} kg
Peito: ${data.peito_cm} cm
Cintura: ${data.cintura_cm} cm
Quadril: ${data.quadril_cm} cm

Categoria da peça: ${data.categoria}
Elasticidade: ${data.elasticidade}
Tamanho calculado pelo algoritmo: ${data.tamanho_calculado_algoritmo}
${productCatalogContext}

Valide a coerência das medidas e confirme ou ajuste o tamanho recomendado.`;
}

function buildComplementaryPrompt(data: ValidateSizeRequest, language: string): string {
  const product = data.complementary_product;
  const storeContext = data.shop_name ? ` da ${data.shop_name}` : '';
  const productCatalogContext = buildProductCatalogContext(data, language);
  const genderCtx = buildGenderContextForStylist(data, language);

  if (!product) {
    return `${genderCtx}
Com base no perfil do usuário (Altura: ${data.altura_cm}cm, tamanho ${data.tamanho_calculado_algoritmo}), sugira uma peça complementar${storeContext} em texto objetivo (~4–5 frases curtas): por que combina no corpo/corte/ocasião + convite leve ao próximo passo.${data.shop_name ? ` Pode mencionar "${data.shop_name}" se couber.` : ''}
${productCatalogContext}`;
  }

  return `${genderCtx}
Com base no perfil do usuário (Altura: ${data.altura_cm}cm, tamanho ${data.tamanho_calculado_algoritmo} em ${data.categoria}), analise esta peça complementar${storeContext}:

Produto: ${product.name}
Categoria: ${product.category}
${productCatalogContext}

Explique em texto claro e um pouco mais desenvolvido (~4–6 frases curtas, até ~650 caracteres): por que esta peça combina no corpo/corte/ocasião; convite discreto a explorar ou ao carrinho.${data.shop_name ? ` Pode mencionar "${data.shop_name}" se couber.` : ''}

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "sua explicação sobre a combinação",
  "coerencia": "alta",
  "confianca": 0.95
}`;
}

/** Legenda curta pós 2.º try-on no chat (produto sugerido sobre resultado anterior). */
function buildSecondaryTryOnCaptionPrompt(data: ValidateSizeRequest, language: string): string {
  const anchor = String(data.anchor_product_name || '').trim();
  const tried = String(data.product_name || '').trim();
  const size = String(data.tamanho_calculado_algoritmo || 'M').trim();
  const shop = data.shop_name ? String(data.shop_name).trim() : '';

  const anchorLabel =
    anchor ||
    (language === 'es'
      ? 'la pieza principal del look'
      : language === 'en'
        ? 'your main outfit piece'
        : 'a peça principal do look');
  const triedLabel =
    tried ||
    (language === 'es'
      ? 'la segunda prenda probada'
      : language === 'en'
        ? 'the garment you just tried on'
        : 'a segunda peça experimentada');

  if (language === 'es') {
    return `Segundo resultado del probador virtual (cadena): el cliente ya probó ${anchorLabel} como base y ahora ve ${triedLabel} combinando con esa base en la misma imagen.
${shop ? `Tienda: ${shop}.` : ''}

Redacta en español para el chat del cliente:
- 2–4 frases, tono consultor cercano y positivo.
- CENTRA el mensaje en la DUPLA: cómo ${triedLabel} armoniza con ${anchorLabel} en silueta, color u ocasión (solo ropa; sin calzado ni accesorios).
- NO menciones talla, tamaño, medidas ni números/letras de talla en ningún sitio del texto al cliente.
- Cierra invitando con naturalidad a añadir al carrito si le convence el conjunto.
- Sin medidas corporales en cm. Sin listar catálogo ni URLs.

El campo JSON "tamanho_final" debe ser exactamente "${size}" (solo para sistemas internos); ese dato NO puede aparecer en "explicacion".

Devuelve JSON:
{"tamanho_final":"${size}","explicacao":"...","coerencia":"alta","confianca":0.92}`;
  }

  if (language === 'en') {
    return `Second virtual try-on (chain): the shopper tried ${anchorLabel} first as the anchor piece and now sees ${triedLabel} styled with that anchor in the same mirror shot.
${shop ? `Store: ${shop}.` : ''}

Write for the shopper chat:
- 2–4 short sentences, warm stylist tone.
- Lead with the PAIRING: how ${triedLabel} works with ${anchorLabel} for silhouette, color, or occasion (clothing only—no shoes or accessories push).
- Do NOT mention size, fit sizing, measurements, or size letters/numbers anywhere in the customer-facing text.
- Close with a natural nudge to add to cart if they love the combo.
- No body measurements in cm. No catalog dumps.

The JSON field "tamanho_final" must be exactly "${size}" (internal use only); it must NOT appear in "explicacao".

Return JSON:
{"tamanho_final":"${size}","explicacao":"...","coerencia":"high","confianca":0.92}`;
  }

  return `Segundo resultado do provador virtual (em cadeia): o cliente já experimentou ${anchorLabel} como base do look e agora vê ${triedLabel} combinando com essa base na mesma imagem.
${shop ? `Loja: ${shop}.` : ''}

Escreva em português para o chat do cliente:
- 2–4 frases, tom de consultor próximo e positivo.
- Enfatize a DUPLA: como ${triedLabel} harmoniza com ${anchorLabel} em silhueta, cor ou ocasião (só vestuário).
- NÃO mencione tamanho, medidas ou letras/números de numeração de tamanho em lugar nenhum do texto ao cliente.
- Feche convidando com naturalidade a adicionar ao carrinho se curtir o conjunto.
- Sem medidas corporais em cm. Sem listar catálogo nem URLs.

O campo JSON "tamanho_final" deve ser exatamente "${size}" (uso interno); essa informação NÃO pode aparecer na "explicacao".

Devolva JSON:
{"tamanho_final":"${size}","explicacao":"...","coerencia":"alta","confianca":0.92}`;
}

function fallbackSecondaryTryOnCaption(data: ValidateSizeRequest, language: string): GPTResponse {
  const anchor = String(data.anchor_product_name || '').trim();
  const tried = String(data.product_name || '').trim();
  const size = normalizeSizeLabel(data.tamanho_calculado_algoritmo || 'M');
  if (language === 'es') {
    return {
      tamanho_final: size,
      explicacao:
        `¡Qué bien queda ${tried || 'esta prenda'} junto a ${anchor || 'tu pieza principal'} en el probador! Si te encaja el conjunto, añádelo al carrito.`,
      coerencia: 'alta',
      confianca: 0.72,
    };
  }
  if (language === 'en') {
    return {
      tamanho_final: size,
      explicacao: `${tried || 'This piece'} pairs nicely with ${anchor || 'your main piece'} in the mirror—add to cart whenever you're ready.`,
      coerencia: 'high',
      confianca: 0.72,
    };
  }
  return {
    tamanho_final: size,
    explicacao: `${tried || 'Esta peça'} combina muito bem com ${anchor || 'a sua peça principal'} no espelho. Se estiver alinhado ao seu estilo, siga para o carrinho.`,
    coerencia: 'alta',
    confianca: 0.72,
  };
}

const GENERIC_PRODUCT_NAMES = new Set([
  "produto",
  "product",
  "producto",
  "item",
  "peça",
  "peca",
  "esta peça",
  "esta peca",
  "this item",
  "esta prenda",
  "produto da página",
  "produto da pagina",
]);

function isGenericProductName(name: string | null | undefined): boolean {
  const n = String(name || "").trim();
  if (!n) return true;
  return GENERIC_PRODUCT_NAMES.has(n.toLowerCase());
}

function resolveDisplayProductName(...candidates: Array<string | null | undefined>): string {
  for (const c of candidates) {
    const n = String(c || "").trim();
    if (n && !isGenericProductName(n)) return n;
  }
  return "";
}

function normalizeColorHex(hex: string | null | undefined): string {
  const raw = String(hex || "").trim().replace(/^#/, "").toLowerCase();
  if (!raw) return "";
  if (raw.length === 3) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  if (raw.length === 6 && /^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  return "";
}

function isColorHexValue(value: string | null | undefined): boolean {
  return Boolean(normalizeColorHex(value));
}

function hexToApproxColorLabel(hex: string | null | undefined, language: string): string {
  const n = normalizeColorHex(hex);
  if (!n) return "";
  const h = n.slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const palette: Array<{ hex: string; pt: string; es: string; en: string }> = [
    { hex: "#000000", pt: "preto", es: "negro", en: "black" },
    { hex: "#ffffff", pt: "branco", es: "blanco", en: "white" },
    { hex: "#808080", pt: "cinza", es: "gris", en: "gray" },
    { hex: "#800000", pt: "marrom", es: "marrón", en: "brown" },
    { hex: "#ff0000", pt: "vermelho", es: "rojo", en: "red" },
    { hex: "#0000ff", pt: "azul", es: "azul", en: "blue" },
    { hex: "#008000", pt: "verde", es: "verde", en: "green" },
    { hex: "#ffc0cb", pt: "rosa", es: "rosa", en: "pink" },
    { hex: "#f5f5dc", pt: "bege", es: "beige", en: "beige" },
    { hex: "#deb887", pt: "bege", es: "beige", en: "beige" },
    { hex: "#c4bcae", pt: "bege", es: "beige", en: "beige" },
    { hex: "#d2b48c", pt: "bege", es: "beige", en: "beige" },
    { hex: "#000080", pt: "azul marinho", es: "azul marino", en: "navy" },
  ];
  let best = palette[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const entry of palette) {
    const eh = entry.hex.slice(1);
    const er = parseInt(eh.slice(0, 2), 16);
    const eg = parseInt(eh.slice(2, 4), 16);
    const eb = parseInt(eh.slice(4, 6), 16);
    const dist = Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  if (language === "es") return best.es;
  if (language === "en") return best.en;
  return best.pt;
}

function resolveSelectedColorLabel(data: ValidateSizeRequest, language: string): string {
  const explicit = String(data.selected_color || "").trim();
  if (explicit && !isColorHexValue(explicit)) return explicit;
  const hex = normalizeColorHex(data.selected_color_hex || data.selected_color);
  const catalog = (data.available_colors || []).map(String).filter(Boolean);
  const namedCatalog = catalog.filter((c) => !isColorHexValue(c));
  if (namedCatalog.length === 1) return namedCatalog[0];
  const fromHex = hexToApproxColorLabel(hex, language);
  if (fromHex) return fromHex;
  if (namedCatalog.length > 0) return namedCatalog[0];
  return "";
}

function normalizeRequestDisplayFields(data: ValidateSizeRequest): ValidateSizeRequest {
  const language = data.language === "es" || data.language === "en" ? data.language : "pt";
  const productName = resolveDisplayProductName(data.product_name);
  const colorLabel = resolveSelectedColorLabel(data, language);
  const hex =
    normalizeColorHex(data.selected_color_hex) ||
    (isColorHexValue(data.selected_color) ? normalizeColorHex(data.selected_color) : "");
  return {
    ...data,
    product_name: productName || undefined,
    selected_color: colorLabel || data.selected_color,
    selected_color_hex: hex || data.selected_color_hex,
  };
}

function sanitizeExplicacaoDisplayLabels(
  text: string,
  data: ValidateSizeRequest,
  language: string
): string {
  let body = String(text || "");
  const colorLabel = resolveSelectedColorLabel(data, language);
  if (colorLabel) {
    body = body.replace(/#[0-9a-f]{3,8}\b/gi, colorLabel);
    body = body.replace(
      new RegExp(`\\bcor\\s+${escapeRegexSegment(colorLabel)}\\s+da\\s+peça\\b`, "gi"),
      `cor ${colorLabel}`
    );
  }
  const pn = resolveDisplayProductName(data.product_name);
  if (pn) {
    body = body.replace(/\b(?:para|com|de)\s+Produto\b/gi, (m) => m.replace(/Produto/i, pn));
    body = body.replace(/\bProduto\b/g, pn);
  }
  return body.trim();
}

function buildProductCatalogContext(data: ValidateSizeRequest, language: string): string {
  const sizes = (data.available_sizes || []).filter(Boolean);
  const colors = (data.available_colors || []).filter(Boolean).filter((c) => !isColorHexValue(String(c)));
  const selectedColor = resolveSelectedColorLabel(data, language);
  const variantCount = Array.isArray(data.variant_catalog) ? data.variant_catalog.length : 0;

  const sizeText = sizes.length > 0 ? sizes.join(', ') : (language === 'es' ? 'no informado' : language === 'en' ? 'not informed' : 'não informado');
  const colorText = colors.length > 0 ? colors.join(', ') : (language === 'es' ? 'no informado' : language === 'en' ? 'not informed' : 'não informado');
  const selectedColorText = selectedColor || (language === 'es' ? 'no informado' : language === 'en' ? 'not informed' : 'não informado');

  if (language === 'es') {
    return `Catálogo del producto visto:
- Tallas disponibles: ${sizeText}
- Colores disponibles: ${colorText}
- Color seleccionado en el try-on: ${selectedColorText}
- Variantes recibidas: ${variantCount}
IMPORTANTE: basea la recomendación y el discurso comercial en estas tallas/colores reales del producto actual.`;
  }

  if (language === 'en') {
    return `Catalog of current product:
- Available sizes: ${sizeText}
- Available colors: ${colorText}
- Color selected in try-on: ${selectedColorText}
- Variants received: ${variantCount}
IMPORTANT: base recommendation and sales message on these real sizes/colors from the current product.`;
  }

  return `Catálogo do produto visualizado:
- Tamanhos disponíveis: ${sizeText}
- Cores disponíveis: ${colorText}
- Cor selecionada no try-on: ${selectedColorText}
- Variantes recebidas: ${variantCount}
IMPORTANTE: baseie a recomendação e a fala comercial nesses tamanhos/cores reais do produto atual.
NUNCA cite códigos hex (#RRGGBB) na explicacao — use apenas o nome da cor (ex.: bege, azul marinho).`;
}

function buildCatalogHardRules(data: ValidateSizeRequest, language: string): string {
  const sizes = (data.available_sizes || []).filter(Boolean);
  const colors = (data.available_colors || []).filter(Boolean);
  const hasCatalog = sizes.length > 0 || colors.length > 0;

  if (language === 'es') {
    if (hasCatalog) {
      return `REGLA CRÍTICA DE CATÁLOGO:
- Ya tienes datos reales de catálogo (tallas/colores). Úsalos de forma explícita en la respuesta.
- NO digas frases como "no tenemos información exacta" o similares.
- Si el usuario pregunta por colores/tallas, cita las opciones disponibles del catálogo recibido.`;
    }
    return `REGLA DE CATÁLOGO:
- Si no hay tallas/colores en el payload, informa de forma breve que esa información no vino en el catálogo de esta solicitud, sin inventar datos.`;
  }

  if (language === 'en') {
    if (hasCatalog) {
      return `CRITICAL CATALOG RULE:
- You already have real catalog data (sizes/colors). Use it explicitly in your answer.
- DO NOT say phrases like "we don't have exact information" or similar.
- If user asks about colors/sizes, list the available options from the received catalog.`;
    }
    return `CATALOG RULE:
- If sizes/colors are missing in payload, briefly state that this information was not provided in this request catalog, and do not invent data.`;
  }

  if (hasCatalog) {
    return `REGRA CRÍTICA DE CATÁLOGO:
- Você já tem dados reais de catálogo (tamanhos/cores). Use-os explicitamente na resposta.
- NÃO diga frases como "não temos informação exata" ou similares.
- Se o usuário perguntar sobre cores/tamanhos, cite as opções disponíveis do catálogo recebido.`;
  }
  return `REGRA DE CATÁLOGO:
- Se não houver tamanhos/cores no payload, informe brevemente que essa informação não veio no catálogo desta requisição, sem inventar dados.`;
}

function getStylistSystemExtra(language: string): string {
  const blocks: Record<string, string> = {
    pt: `MODO CONSULTOR DE MODA (catálogo limitado — você é a inteligência principal):
- Você decide quais peças recomendar: analise a mensagem do cliente, o histórico do chat, CONTEXTO ESTRUTURADO e cada linha de CANDIDATOS (título, preço, tags match). A ordem da lista NÃO é ranking final — tags match são só pistas.
- Tom caloroso e pessoal ("para você", "no seu caso"): claro e estruturado — nem telegráfico nem prolixo.
- NOME DO PRODUTO: use sempre o nome real do produto no contexto — nunca escreva "Produto" genérico.
- COR: use o nome legível da cor selecionada (ex.: bege, off-white). PROIBIDO citar códigos hex (#C4BCAE etc.).
- TAMANHO (obrigatório): primeira frase exatamente: "Para o/a NOME_DA_PEÇA, seu tamanho ideal é TAMANHO_FINAL." (use "o" ou "a" conforme o nome — ex.: "o Suéter …", "a Calça …".) Depois, mais 3–5 frases objetivas (silhueta, proporções, cor, ocasião, por que o complemento funciona) — não repita o tamanho; limite prático ~900 caracteres no total em explicacao.
- PEÇA JÁ ESCOLHIDA: na 2.ª frase, diga explicitamente que o cliente já está com essa peça (nome igual ao produto em contexto) e que as sugestões são complementos do look — não inverta: não comece só pela peça candidata.
- Só mencione produtos cujo "handle" está em CANDIDATOS. Nunca invente URLs ou peças fora da lista.
- Se houver CONTEXTO ESTRUTURADO (stylist_brief), use-o para priorizar ocasião, feedback (ex.: mais barato, outra opção) e perfil da loja; preços na lista são referência — não invente valores.
- Critérios (cite só o essencial): cor/silhueta/ocasião vs categoria upper/lower/full.
- Pode sugerir calçados e acessórios (óculos, relógio, bolsa, cinto, joias, boné, etc.) se estiverem em CANDIDATOS; na explicacao, convide a adicionar ao carrinho para esses itens (o cliente não os experimenta no provador de roupa).
- GÉNERO: siga CONTEXTO DE GÉNERO e regras de combinação (perfil masculino: sem saias/vestidos).
- Escolha 1–3 handles que melhor respondem ao pedido atual; rationale em suggested_products: até ~130 caracteres por item, uma frase clara com o porquê da escolha.
- Se o cliente mudar de ideia, reavalie CANDIDATOS; se nada servir, diga em uma frase — sem inventar.
- JSON OBRIGATÓRIO inclui "suggested_products": array com 1–3 itens {"handle":"handle-exato-da-lista","rationale":"..."} — use só handles de CANDIDATOS; nunca omita este campo quando a lista não estiver vazia.`,
    es: `MODO ESTILISTA (catálogo limitado — tú eres la inteligencia principal):
- Tú decides qué piezas recomendar: analiza el mensaje, el historial, el CONTEXTO ESTRUCTURADO y cada línea de CANDIDATOS (título, precio, tags match). El orden de la lista NO es ranking final — los tags match son pistas.
- Tono cálido y personal ("para ti", "en tu caso"): claro y estructurado — ni telegráfico ni prolijo.
- TALLA (obligatorio): primera frase exactamente: "Para el/la NOMBRE, tu talla ideal es TALLA." (elige "el" o "la" según el nombre.) Luego, 3–5 frases objetivas (silueta, proporciones, color, ocasión, por qué encaja el complemento) — no repitas la talla; límite práctico ~900 caracteres en explicacion en total.
- PRENDA YA ELEGIDA: en la 2.ª frase, deja claro que el cliente ya lleva esa prenda (mismo nombre que el producto en contexto) y que las ideas son complementos del look — no empieces solo por la pieza candidata.
- Solo handles de CANDIDATOS. Sin inventar.
- Usa CONTEXTO ESTRUCTURADO para priorizar ocasión, feedback (más barato, otra opción) y perfil de tienda.
- Criterios (solo lo esencial): color/silueta/ocasión vs upper/lower/full.
- Puedes sugerir calzado y accesorios (gafas, reloj, bolso, cinturón, bisutería, gorra, etc.) si están en CANDIDATOS; en explicacion, invita a añadir al carrito para esos ítems (no se prueban en el probador de ropa).
- GÉNERO: respeta CONTEXTO DE GÉNERO (perfil masculino: sin faldas/vestidos).
- Elige 1–3 handles que mejor respondan al pedido; rationale por ítem: hasta ~130 caracteres, una frase clara con el porqué.
- Si no encaja nada, dilo en una frase.
- JSON OBLIGATORIO incluye "suggested_products": array de 1–3 {"handle":"handle-exacto","rationale":"..."} — solo handles de CANDIDATOS; no omitas el campo si la lista no está vacía.`,
    en: `STYLIST MODE (limited catalog — you are the primary intelligence):
- You decide which pieces to recommend: analyze the shopper message, chat history, STRUCTURED CONTEXT, and each CANDIDATES line (title, price, match tags). List order is NOT the final ranking — match tags are hints only.
- Warm personal tone ("for you", "in your case"): clear and structured — not telegraphic, not rambling.
- SIZE (mandatory): first sentence exactly: "For PRODUCT_NAME, your ideal size is SIZE." Then add 3–5 purposeful sentences (silhouette, proportions, color, occasion, why the complement works) — do not repeat the size; practical cap ~900 characters total for explicacao.
- ALREADY-CHOSEN GARMENT: in the 2nd sentence, state clearly the shopper is already wearing that product (same name) and suggestions complete the look — do not open only with the candidate item.
- Only handles from CANDIDATES. Never invent items.
- Use STRUCTURED CONTEXT to prioritize occasion, shopper feedback (cheaper, something else), and store profile.
- Criteria (state only essentials): color/silhouette/occasion vs upper/lower/full.
- You may suggest footwear and accessories (sunglasses, watch, bag, belt, jewelry, hat, etc.) when they appear in CANDIDATES; in explicacao, nudge add to cart for those items (they are not tried in the clothing mirror).
- GENDER: follow GENDER CONTEXT (male profile: no skirts/dresses).
- Pick 1–3 handles that best match the current request; per-item rationale up to ~130 characters with clear why.
- If nothing fits, say so in one sentence.
- JSON MUST include "suggested_products": array of 1–3 {"handle":"exact-handle-from-list","rationale":"..."} — never omit when CANDIDATES is non-empty.`,
  };
  return blocks[language] || blocks.en;
}

function normalizeGenderToken(v: string): string {
  const s = String(v || "").trim().toLowerCase();
  if (s === "m" || s === "man" || s === "men" || s === "homem" || s === "hombre" || s === "masculino") return "male";
  if (s === "f" || s === "woman" || s === "women" || s === "mulher" || s === "mujer" || s === "feminino") return "female";
  if (s === "unisex" || s === "neutro") return "unisex";
  return s || "unspecified";
}

/** Perfil efectivo para combinações (lojista > cliente > unissex). */
function resolveEffectiveTargetGender(data: ValidateSizeRequest): "male" | "female" | "unisex" {
  const scope = String(data.chart_gender_scope || "both").trim().toLowerCase();
  if (scope === "male" || scope === "female") return scope;
  const shopper = normalizeGenderToken(String(data.genero || ""));
  if (shopper === "male" || shopper === "female") return shopper;
  return "unisex";
}

const FEMALE_GARMENT_IN_EXPLICACAO =
  /\b(saia?s?|skirts?|vestidos?|dresses?|faldas?|maxi\s+skirts?|midi\s+skirts?)\b/i;
const MALE_GARMENT_IN_EXPLICACAO = /\b(gravatas?|smokings?)\b/i;

function genderOutfitRulesAppendix(target: "male" | "female" | "unisex", language: string): string {
  if (target === "unisex") return "";
  if (language === "es") {
    if (target === "male") {
      return `\nREGLAS DE COMBINACIÓN EN explicacao (OBLIGATORIO — perfil masculino):
- PROHIBIDO mencionar o sugerir: falda, faldas, vestido, vestidos, skirt, skirts, dress, dresses.
- SÍ puedes sugerir: pantalón vaquero, pantalón de vestir, chino, bermuda, shorts, sudadera, cazadora.
- Nunca digas que la prenda "queda bien con faldas" ni combinaciones equivalentes femeninas.\n`;
    }
    return `\nREGLAS DE COMBINACIÓN EN explicacao (OBLIGATORIO — perfil femenino):
- PROHIBIDO sugerir piezas típicamente masculinas exclusivas (ej. corbata formal de hombre) salvo contexto unisex.
- SÍ puedes sugerir: falda, vestido, pantalón, jeans, blazer, top, etc. coherentes con perfil femenino.\n`;
  }
  if (language === "en") {
    if (target === "male") {
      return `\nOUTFIT RULES FOR explicacao (MANDATORY — male profile):
- FORBIDDEN to mention or suggest: skirt, skirts, dress, dresses.
- DO suggest: jeans, dress pants, chinos, bermuda shorts, joggers, jackets; footwear/accessories from CANDIDATES when they complete the look.
- Never say the piece "looks great with skirts" or similar feminine-only pairings.\n`;
    }
    return `\nOUTFIT RULES FOR explicacao (MANDATORY — female profile):
- Avoid male-only formal pieces (e.g. men's tie) unless clearly unisex.
- You may suggest skirts, dresses, trousers, jeans, blazers, tops, etc.\n`;
  }
  if (target === "male") {
    return `\nREGRAS DE COMBINAÇÃO NA explicacao (OBRIGATÓRIO — perfil masculino):
- PROIBIDO mencionar ou sugerir: saia, saias, vestido, vestidos, skirt, skirts, dress, dresses.
- PODE sugerir: calça jeans, calça de alfaitarada/chino, bermuda, shorts, moletom, casaco; calçados e acessórios dos CANDIDATOS quando completarem o look.
- Nunca diga que a peça "fica incrível com saias" nem combinações equivalentes femininas.\n`;
  }
  return `\nREGRAS DE COMBINAÇÃO NA explicacao (OBRIGATÓRIO — perfil feminino):
- Evite peças tipicamente masculinas exclusivas (ex.: gravata de alfaiataria masculina) salvo contexto unissex.
- Pode sugerir saia, vestido, calça, jeans, blazer, top, etc. coerentes com perfil feminino.\n`;
}

function sanitizeExplicacaoForGender(
  explicacao: string,
  target: "male" | "female" | "unisex",
  language: string,
  productName?: string
): string {
  const text = String(explicacao || "").trim();
  if (!text || target === "unisex") return text;

  const sentences = text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length > 0);
  const filtered = sentences.filter((s) => {
    if (target === "male" && FEMALE_GARMENT_IN_EXPLICACAO.test(s)) return false;
    if (target === "female" && MALE_GARMENT_IN_EXPLICACAO.test(s)) return false;
    return true;
  });

  if (filtered.length > 0) {
    return filtered.join(" ").trim();
  }

  const pn = productName || (language === "es" ? "esta prenda" : language === "en" ? "this item" : "esta peça");
  if (language === "es") {
    return target === "male"
      ? `¡${pn} es muy versátil! Combínalo con vaqueros para un look casual o con pantalón de vestir para algo más elegante. El negro combina con todo — ¡añádelo al carrito cuando quieras!`
      : `¡${pn} queda genial en tu estilo! Combínalo con piezas de abajo que te favorezcan (vaquero, falda o vestido según la ocasión).`;
  }
  if (language === "en") {
    return target === "male"
      ? `${pn} is very versatile! Pair it with jeans for a casual look or dress pants for something sharper. Black goes with everything — add it to cart when you are ready.`
      : `${pn} will look great on you! Pair it with bottoms that suit your style (jeans, skirt, or dress depending on the occasion).`;
  }
  return target === "male"
    ? `Esse ${pn} é super versátil! Combine com calça jeans para um look casual ou com calça de alfaitarada para um visual mais elegante. O preto combina com tudo — adicione ao carrinho quando quiser.`
    : `Essa ${pn} valoriza o seu estilo! Combine com a calça ou saia que preferir, conforme a ocasião.`;
}

function sanitizeExplicacaoForClothingOnly(
  explicacao: string,
  language: string,
  productName?: string
): string {
  let text = scrubInvitationAccessoryTails(String(explicacao || '').trim(), language);
  text = scrubAsideAccessoryBlocks(text, language);
  if (!text) return text;
  const sentences = text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length > 0);
  const cleaned = sentences
    .map((s) => stripAccessoryInsertionsFromSentence(s))
    .filter((s) => s.length > 0 && !sentenceMentionsNonGarmentFolded(s));
  if (cleaned.length > 0) return cleaned.join(' ').trim();

  const pn =
    productName ||
    (language === 'es' ? 'esta prenda' : language === 'en' ? 'this garment' : 'esta peça');
  if (language === 'es') {
    return `Para combinar, quédate solo con prendas de vestir (parte de arriba y abajo) de los candidatos de la lista — sin calzado ni accesorios. ${pn} admite looks casuales o más arreglados según la base que elijas.`;
  }
  if (language === 'en') {
    return `Stick to clothing pieces (tops and bottoms) from the candidate list — no footwear or accessories. ${pn} works for both casual and dressier outfits depending on what you pair it with.`;
  }
  return `Combine só vestuário (partes de cima e de baixo) entre os candidatos — sem calçados nem acessórios. ${pn} funciona em looks mais casuais ou mais arrumados conforme a base que escolher.`;
}

/** Contexto de género para o consultor (evita sugestões incoerentes, ex.: saia para perfil masculino). */
function buildGenderContextForStylist(data: ValidateSizeRequest, language: string): string {
  const target = resolveEffectiveTargetGender(data);
  const shopper = normalizeGenderToken(String(data.genero || ""));
  const scopeRaw = String(data.chart_gender_scope || "both").trim().toLowerCase();
  const scope =
    scopeRaw === "male" || scopeRaw === "female" || scopeRaw === "both" ? scopeRaw : "both";
  const outfitRules = genderOutfitRulesAppendix(target, language);

  if (language === "es") {
    const perfil =
      shopper === "male"
        ? "masculino (hombre)"
        : shopper === "female"
          ? "femenino (mujer)"
          : shopper === "unisex"
            ? "unisex"
            : "no especificado";
    const tienda =
      scope === "male"
        ? "masculino: el comerciante configuró la guía de tallas de esta línea/colección para público masculino."
        : scope === "female"
          ? "femenino: el comerciante configuró la guía de tallas para público femenino."
          : "ambos: la tienda admite tallas para hombre y mujer en esta línea; el perfil concreto viene de lo elegido en el probador.";
    return `CONTEXTO DE GÉNERO (obligatorio para combinar prendas sugeridas):\n- Perfil elegido por el cliente en el probador: ${perfil} (valor técnico: ${shopper}).\n- Alcance de la guía de tallas configurado por el comerciante (colección/producto): ${tienda}\n- Perfil efectivo para combinar (prioridad): ${target}.\n- Reglas: solo recomienda candidatos coherentes con este perfil; no propongas prendas típicamente femeninas a un perfil masculino ni al revés de forma incoherente; con unisex prioriza piezas neutras/unisex salvo que el título indique claramente validez para todos.${outfitRules}`;
  }

  if (language === "en") {
    const profile =
      shopper === "male"
        ? "male"
        : shopper === "female"
          ? "female"
          : shopper === "unisex"
            ? "unisex"
            : "not specified";
    const store =
      scope === "male"
        ? "male: the merchant configured the size chart for this line/collection for a male audience."
        : scope === "female"
          ? "female: the merchant configured the size chart for a female audience."
          : "both: the store supports male and female sizing on this line; the shopper’s chosen profile in the fitting flow is authoritative.";
    return `GENDER CONTEXT (mandatory for suggested pairings):\n- Shopper profile selected in the try-on flow: ${profile} (raw: ${shopper}).\n- Merchant size-chart scope (collection/product): ${store}\n- Effective profile for pairing (priority): ${target}.\n- Rules: only recommend candidates that fit this profile; do not suggest typically women-only garments to a male profile or incoherent men-only pieces to a female profile; for unisex prefer neutral/unisex items unless titles clearly show inclusive styling.${outfitRules}`;
  }

  const perfil =
    shopper === "male"
      ? "masculino (homem)"
      : shopper === "female"
        ? "feminino (mulher)"
        : shopper === "unisex"
          ? "unissex"
          : "não especificado";
  const loja =
    scope === "male"
      ? "masculino — o lojista definiu a tabela de medidas desta linha/coleção para o público masculino."
      : scope === "female"
        ? "feminino — o lojista definiu a tabela de medidas para o público feminino."
        : "ambos — a loja admite medidas para homem e mulher nesta linha; o perfil efectivo é o que o cliente escolheu no provador.";
  return `CONTEXTO DE GÉNERO (obrigatório para combinar peças sugeridas):\n- Perfil que o cliente indicou no provador: ${perfil} (valor técnico: ${shopper}).\n- Âmbito da tabela de medidas configurado pelo lojista (coleção/produto): ${loja}\n- Perfil efectivo para combinar (prioridade): ${target}.\n- Regras: só recomende candidatos coerentes com este perfil; não sugira peças tipicamente femininas a perfil masculino nem o contrário de forma incoerente; com unissex prefira peças neutras/unissex salvo o título do candidato deixar claro que serve para todos.${outfitRules}`;
}

function stylistUserUtterancePlaceholder(language: string): string {
  if (language === "es") {
    return "(Sin mensaje de texto: el cliente acaba de ver el resultado del probador; sugiere una combinación entre los candidatos (ropa, calzado o accesorios de la lista).)";
  }
  if (language === "en") {
    return "(No text message: the shopper just saw the try-on result; suggest a pairing from the candidates (apparel, footwear, or accessories on the list).)";
  }
  return "(Sem mensagem de texto: o cliente acabou de ver o resultado do provador; sugira uma combinação entre os candidatos (vestuário, calçado ou acessórios da lista).)";
}

function formatCandidatePriceLine(
  c: NonNullable<ValidateSizeRequest["candidate_products"]>[number]
): string {
  const amount = c?.price_amount;
  if (amount == null || !Number.isFinite(Number(amount))) return "";
  const cur = String(c.currency_code || "").trim();
  return ` | price: ${Number(amount)}${cur ? ` ${cur}` : ""}`;
}

function buildStylistBriefContextForPrompt(
  data: ValidateSizeRequest,
  language: string
): string {
  const b = data.stylist_brief;
  if (!b || typeof b !== "object") return "";

  const occasions = Array.isArray(b.active_occasions)
    ? b.active_occasions.map((o) => String(o?.label || o?.id || "").trim()).filter(Boolean)
    : [];
  const tags = Array.isArray(b.garment_constraints_tags)
    ? b.garment_constraints_tags.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const boost = Array.isArray(b.search_terms_boost)
    ? b.search_terms_boost.map((t) => String(t).trim()).filter(Boolean)
    : [];
  const fb = b.feedback && typeof b.feedback === "object" ? b.feedback : undefined;
  const fbType = String(fb?.type || "none");
  const styleKw = Array.isArray(fb?.styleKeywords)
    ? fb.styleKeywords.map((k) => String(k).trim()).filter(Boolean)
    : [];

  if (language === "es") {
    return `\nCONTEXTO ESTRUCTURADO (catálogo recuperado — stock/género ya filtrados; no inventes handles):\n- Temporada: ${String(b.season || "")} (${String(b.season_label_pt || b.season || "")}).\n- Ocasiones activas: ${occasions.join(", ") || "(ninguna)"}.\n- Perfil tienda: ${String(b.store_audience || "")}; destinatario regalo: ${String(b.gift_recipient || "self")}.\n- Feedback cliente: ${fbType}${fb?.sortPriceAsc ? " (priorizar precio más bajo entre candidatos)" : ""}${fb?.excludePreviousSuggestions ? " (evitar repetir sugerencias anteriores)" : ""}${styleKw.length ? `; estilo: ${styleKw.join(", ")}` : ""}.\n- Restricciones: ${tags.join("; ") || "(ninguna)"}.\n- Tú eliges los mejores 1–3 handles de CANDIDATOS según el mensaje; tags match son pistas, no orden obligatorio.\n`;
  }
  if (language === "en") {
    return `\nSTRUCTURED CONTEXT (retrieved catalog — stock/gender pre-filtered; do not invent handles):\n- Season: ${String(b.season || "")} (${String(b.season_label_pt || b.season || "")}).\n- Active occasions: ${occasions.join(", ") || "(none)"}.\n- Store profile: ${String(b.store_audience || "")}; gift recipient: ${String(b.gift_recipient || "self")}.\n- Shopper feedback: ${fbType}${fb?.sortPriceAsc ? " (prefer lower price among candidates)" : ""}${fb?.excludePreviousSuggestions ? " (avoid repeating prior suggestions)" : ""}${styleKw.length ? `; style: ${styleKw.join(", ")}` : ""}.\n- Constraints: ${tags.join("; ") || "(none)"}.\n- You pick the best 1–3 handles from CANDIDATES for this message; match tags are hints, not mandatory order.\n`;
  }
  return `\nCONTEXTO ESTRUTURADO (catálogo recuperado — stock/género já filtrados; não invente handles):\n- Estação: ${String(b.season || "")} (${String(b.season_label_pt || b.season || "")}).\n- Ocasiões ativas: ${occasions.join(", ") || "(nenhuma)"}.\n- Perfil da loja: ${String(b.store_audience || "")} (faixa ${String(b.price_band || "unknown")}); destinatário presente: ${String(b.gift_recipient || "self")}.\n- Feedback do cliente: ${fbType}${fb?.sortPriceAsc ? " (priorizar preço mais baixo entre candidatos)" : ""}${fb?.excludePreviousSuggestions ? " (evitar repetir sugestões anteriores)" : ""}${styleKw.length ? `; estilo: ${styleKw.join(", ")}` : ""}.\n- Restrições: ${tags.join("; ") || "(nenhuma)"}${boost.length ? `; termos de busca: ${boost.join(", ")}` : ""}.\n- Você escolhe os melhores 1–3 handles em CANDIDATOS conforme o pedido; tags match são pistas, não ordem obrigatória.\n`;
}

function buildStylistConsultantPrompt(data: ValidateSizeRequest, language: string): string {
  const candidates = Array.isArray(data.candidate_products) ? data.candidate_products : [];
  const lines = candidates
    .map((c) => {
      const base = `- handle: ${String(c.handle || "").trim()} | title: ${String(c.title || "").trim()}${formatCandidatePriceLine(c)}`;
      const tags = Array.isArray(c.score_reason_tags)
        ? c.score_reason_tags.map((t) => String(t).trim()).filter(Boolean)
        : [];
      return tags.length ? `${base} | match: ${tags.join(", ")}` : base;
    })
    .join("\n");
  const briefCtx = buildStylistBriefContextForPrompt(data, language);

  const productCatalogContext = buildProductCatalogContext(data, language);
  const genderCtx = buildGenderContextForStylist(data, language);
  const chatHistory = Array.isArray(data.chat_history) ? data.chat_history : [];
  const chatHistoryText = chatHistory.length > 0
    ? `\nCONVERSATION CONTEXT:\n${chatHistory
        .slice(-12)
        .map((m) => `- ${m.role}: ${String(m.content || "").trim()}`)
        .join("\n")}\n`
    : "";

  const storeContext = data.shop_name ? ` Store: ${data.shop_name}.` : "";
  const msg = String(data.custom_message || "").trim() || stylistUserUtterancePlaceholder(language);
  const cat = String(data.categoria || "upper");
  const catHintPt =
    cat === "lower"
      ? "(lower = peça de baixo; harmonize com o que combina por cima / conjunto.)"
      : cat === "full"
        ? "(full = corpo inteiro; equilibre proporções e ocasião.)"
        : "(upper = peça de cima; pense na base (calça, saia…) para silhueta e cor.)";
  const catHintEs =
    cat === "lower"
      ? "(lower = parte inferior; armoniza con lo de arriba / conjunto.)"
      : cat === "full"
        ? "(full = cuerpo entero; equilibra proporción y ocasión.)"
        : "(upper = parte superior; piensa en la base (vaquero, falda…) para silueta y color.)";
  const catHintEn =
    cat === "lower"
      ? "(lower = bottoms; balance with tops / outfit cohesion.)"
      : cat === "full"
        ? "(full = full-body garment; balance proportion and occasion.)"
        : "(upper = tops; think bottoms (jeans, trousers…) for silhouette and color.)";

  if (language === "es") {
    return `El cliente escribió:\n"${msg}"\n\nPrenda que está probando: ${data.product_name || "producto actual"}\nCategoría (colección / silueta): ${data.categoria} ${catHintEs}\nTalla recomendada (contexto): ${data.tamanho_calculado_algoritmo}${storeContext}\n${genderCtx}${productCatalogContext}\n${chatHistoryText}${briefCtx}\nCANDIDATOS (solo puedes recomendar estos handles):\n${lines || "(vacío)"}\n\nTú decides la curación: elige los 1–3 handles que mejor respondan al mensaje (el orden de la lista no es ranking final).\n\nResponda como estilista ("tú", "para ti", "en tu caso"); explicacion clara — unas 5 a 7 frases cortas en total (incluida la primera obligatoria); evite superar ~850 caracteres.\nOBLIGATORIO — primera frase de explicacao: debe ser exactamente del tipo: "Para el/la NOMBRE_DEL_PRODUCTO, tu talla ideal es TALLA" (elige "el" o "la" según el nombre) usando el nombre del producto del contexto y exactamente el valor tamanho_final (debe coincidir con la talla recomendada del contexto).\nOBLIGATORIO — texto tras esa primera frase: la siguiente frase debe dejar claro que el cliente ya lleva esa prenda (nombre del producto en contexto) y solo entonces sugerir 1–3 complementos de los CANDIDATOS (ropa, calzado o accesorios de la lista); para calzado/accesorios invita a añadir al carrito.\nRespeta el perfil de género (ej.: perfil masculino — nunca menciones faldas/vestidos; sugiere vaqueros, pantalón de vestir, bermuda).\nOBLIGATORIO en el JSON: "suggested_products" debe ser un array con 1 a 3 objetos {"handle":"...","rationale":"..."} usando SOLO handles exactos de CANDIDATOS (nunca vacío si la lista tiene ítems).\nDevuelve JSON con tamanho_final, explicacao, coerencia, confianca y suggested_products.`;
  }
  if (language === "en") {
    return `The shopper wrote:\n"${msg}"\n\nProduct: ${data.product_name || "current product"}\nCollection category (silhouette context): ${data.categoria} ${catHintEn}\nRecommended size (context): ${data.tamanho_calculado_algoritmo}${storeContext}\n${genderCtx}${productCatalogContext}\n${chatHistoryText}${briefCtx}\nCANDIDATES (you may ONLY recommend these handles):\n${lines || "(empty)"}\n\nYou own the curation: pick the 1–3 handles that best match the message (list order is not the final ranking).\n\nReply as a stylist ("you", "for you", "in your case"); keep explicacao clear — about 5–7 short sentences total (including the mandatory opening); stay under ~850 characters.\nMANDATORY — first sentence of explicacao: must follow exactly: "For PRODUCT_NAME, your ideal size is SIZE" using the product name from context and exactly tamanho_final (must match recommended size in context).\nMANDATORY — text after that first sentence: the next sentence must state clearly the shopper is already wearing that product (same name), then suggest 1–3 complements from CANDIDATES (apparel, footwear, or accessories on the list); for footwear/accessories nudge add to cart.\nRespect the gender profile (e.g. male profile — never mention skirts/dresses; suggest jeans, dress pants, bermuda shorts).\nMANDATORY in JSON: "suggested_products" must be an array of 1–3 items {"handle":"...","rationale":"..."} using ONLY exact handles from CANDIDATES (never empty if the list has items).\nReturn JSON with tamanho_final, explicacao, coerencia, confianca, suggested_products.`;
  }
  return `O cliente escreveu:\n"${msg}"\n\nProduto: ${data.product_name || "produto atual"}\nCategoria (coleção / silhueta): ${data.categoria} ${catHintPt}\nTamanho recomendado (contexto): ${data.tamanho_calculado_algoritmo}${storeContext}\n${genderCtx}${productCatalogContext}\n${chatHistoryText}${briefCtx}\nCANDIDATOS (só pode recomendar estes handles):\n${lines || "(vazio)"}\n\nVocê faz a curadoria: escolha os 1–3 handles que melhor atendem ao pedido (a ordem da lista não é ranking final).\n\nResponda como estilista com tom pessoal ("você", "para você", "no seu caso"); explicacao clara — cerca de 5 a 7 frases curtas no total (incluindo a primeira obrigatória); evite ultrapassar ~850 caracteres.\nOBRIGATÓRIO — primeira frase da explicacao: deve seguir exatamente o formato: "Para o/a NOME_DO_PRODUTO, seu tamanho ideal é TAMANHO" (use "o" ou "a" antes do nome, conforme for natural — ex.: "o Suéter …", "a Calça …") usando o nome do produto do contexto e exatamente tamanho_final (deve coincidir com o tamanho recomendado no contexto).\nOBRIGATÓRIO — texto após essa primeira frase: a seguinte frase deve deixar claro que o cliente já está com essa peça (nome do produto) e só então sugerir 1–3 complementos dos CANDIDATOS (vestuário, calçado ou acessórios da lista); para calçado/acessório convide a adicionar ao carrinho.\nRespeite o perfil de género (ex.: perfil masculino — nunca mencione saias/vestidos; sugira calça jeans, alfaitarada, bermuda).\nOBRIGATÓRIO no JSON: "suggested_products" tem de ser um array com 1 a 3 objetos {"handle":"...","rationale":"..."} usando APENAS handles exatos dos CANDIDATOS (nunca vazio se a lista tiver itens).\nDevolva JSON com tamanho_final, explicacao, coerencia, confianca e suggested_products.`;
}

async function validateUserMessage(message: string, language: string): Promise<{ is_appropriate: boolean; response_message: string }> {
  const validationPrompt = {
    pt: `Analise a seguinte mensagem do usuário e determine se é apropriada para um contexto de compra de roupas:

Mensagem: "${message}"

A mensagem é INADEQUADA se contém:
- Palavrões ou linguagem ofensiva
- Conteúdo sexual ou inapropriado
- Tópicos completamente fora do contexto de moda/roupas/tamanhos

A mensagem é APROPRIADA se:
- É uma pergunta sobre tamanho, ajuste, tecido, estilo
- É um comentário sobre a roupa ou experiência
- É uma dúvida relacionada ao produto

Retorne JSON:
{
  "is_appropriate": true/false,
  "response_message": "Se inadequada, escreva uma mensagem educada encerrando a conversa. Se apropriada, deixe vazio."
}`,
    es: `Analiza el siguiente mensaje del usuario y determina si es apropiado para un contexto de compra de ropa:

Mensaje: "${message}"

El mensaje es INADECUADO si contiene:
- Palabrotas o lenguaje ofensivo
- Contenido sexual o inapropiado
- Temas completamente fuera del contexto de moda/ropa/tallas

El mensaje es APROPIADO si:
- Es una pregunta sobre talla, ajuste, tejido, estilo
- Es un comentario sobre la ropa o experiencia
- Es una duda relacionada al producto

Retorna JSON:
{
  "is_appropriate": true/false,
  "response_message": "Si es inadecuado, escribe un mensaje educado finalizando la conversación. Si es apropiado, deja vacío."
}`,
    en: `Analyze the following user message and determine if it's appropriate for a clothing shopping context:

Message: "${message}"

The message is INAPPROPRIATE if it contains:
- Profanity or offensive language
- Sexual or inappropriate content
- Topics completely out of fashion/clothing/sizing context

The message is APPROPRIATE if:
- It's a question about size, fit, fabric, style
- It's a comment about the clothing or experience
- It's a product-related doubt

Return JSON:
{
  "is_appropriate": true/false,
  "response_message": "If inappropriate, write a polite message ending the conversation. If appropriate, leave empty."
}`
  };

  try {
    if (!OPENAI_API_KEY) {
      return { is_appropriate: true, response_message: "" };
    }
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a content moderation assistant." },
          { role: "user", content: validationPrompt[language as keyof typeof validationPrompt] || validationPrompt['en'] },
        ],
        max_tokens: 90,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      return { is_appropriate: true, response_message: "" };
    }
    const mod = tryParseModelJson(content) as Record<string, unknown>;
    return {
      is_appropriate: mod.is_appropriate !== false,
      response_message: String(mod.response_message ?? ""),
    };
  } catch (error) {
    console.error("Error validating message:", error);
    // Em caso de erro, permitir a mensagem
    return { is_appropriate: true, response_message: "" };
  }
}

function buildCustomMessagePrompt(data: ValidateSizeRequest, language: string): string {
  const storeContext = data.shop_name ? ` da ${data.shop_name}` : '';
  const productInfo = data.product_name ? `\n- Produto: ${data.product_name}` : '';
  const productDesc = data.product_description ? `\n- Descrição do produto: ${data.product_description}` : '';
  const productCatalogContext = buildProductCatalogContext(data, language);
  const genderCtx = buildGenderContextForStylist(data, language);
  const catalogHardRules = buildCatalogHardRules(data, language);
  const chatHistory = Array.isArray(data.chat_history) ? data.chat_history : [];
  const chatHistoryText = chatHistory.length > 0
    ? `\nHISTÓRICO DA CONVERSA (para contexto):\n${chatHistory
        .slice(-12)
        .map((m) => `- ${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${String(m.content || '').trim()}`)
        .join('\n')}\n`
    : '';

  const messages: Record<string, string> = {
    pt: `O usuário fez a seguinte pergunta sobre o produto${storeContext}:

"${data.custom_message}"

Contexto:
- Tamanho recomendado: ${data.tamanho_calculado_algoritmo}
- Categoria: ${data.categoria}
- Elasticidade: ${data.elasticidade}${data.shop_name ? `\n- Marca/Loja: ${data.shop_name}` : ''}${productInfo}${productDesc}
${genderCtx}${productCatalogContext}
${chatHistoryText}

REGRAS IMPORTANTES:
1. Use o contexto acima para responder de forma útil (produto, descrição, catálogo)
2. Se mencionar tamanho: APENAS UMA VEZ no início; depois não volte a citar o valor
3. EXTENSÃO: explicacao com ~4–6 frases curtas no total (ideal até ~650 caracteres); explique o motivo sem divagar
4. Tom pessoal ("você", "no seu caso"); convite breve ao carrinho ou próximo passo no final (uma frase)
5. Se fizer sentido, mencione a loja/marca do contexto de forma breve e positiva
6. Respeite o CONTEXTO DE GÉNERO (perfil masculino: nunca mencione saias/vestidos na explicacao)
7. Priorize o produto atual (nome no contexto): ancoral o conselho nele antes de só destacar outras peças.
8. Só vestuário na explicacao: não sugira calçados nem acessórios (óculos, relógio, bolsa, cinto, boné, etc.).
9. ${catalogHardRules}

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "resposta curta e persuasiva à pergunta",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `El usuario hizo la siguiente pregunta sobre el producto${storeContext}/talla:

"${data.custom_message}"

Contexto:
- Talla recomendada: ${data.tamanho_calculado_algoritmo}
- Categoría: ${data.categoria}
- Elasticidad: ${data.elasticidade}${data.shop_name ? `\n- Tienda: ${data.shop_name}` : ''}
${genderCtx}${productCatalogContext}
${chatHistoryText}

REGLAS IMPORTANTES:
1. Si mencionas la talla, hazlo SOLO UNA VEZ al inicio de la respuesta
2. Después continúa naturalmente SIN repetir la talla${data.shop_name ? ` (puedes mencionar la tienda "${data.shop_name}" de forma breve si es relevante)` : ''}
3. Desarrollo moderado: máximo ~4–6 frases cortas en explicacion (ideal hasta ~650 caracteres); explica el motivo sin divagar
4. Mantén el foco en ayudar al usuario a decidir
5. Respeta el CONTEXTO DE GÉNERO en las combinaciones (perfil masculino: nunca menciones faldas/vestidos en explicacao)
6. Prioriza el producto actual (nombre en contexto): ancla el consejo en él antes de destacar solo otras prendas.
7. Solo ropa en explicacao: no sugieras calzado ni accesorios (gafas, reloj, bolso, cinturón, gorra, etc.).
8. ${catalogHardRules}

Retorna en formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "tu respuesta a la pregunta del usuario (talla solo al inicio si es necesario)",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    en: `The user asked the following question about the product${storeContext}/size:

"${data.custom_message}"

Context:
- Recommended size: ${data.tamanho_calculado_algoritmo}
- Category: ${data.categoria}
- Elasticity: ${data.elasticidade}${data.shop_name ? `\n- Store: ${data.shop_name}` : ''}
${genderCtx}${productCatalogContext}
${chatHistoryText}

IMPORTANT RULES:
1. If you mention the size, do it ONLY ONCE at the beginning of your response
2. Then continue naturally WITHOUT repeating the size${data.shop_name ? ` (mention "${data.shop_name}" briefly if relevant)` : ''}
3. Personal tone with moderate detail: at most ~4–6 short sentences total in explicacao (aim under ~650 characters); explain why without rambling
4. Keep focus on helping the user decide
5. Follow GENDER CONTEXT for outfit pairings (male profile: never mention skirts/dresses in explicacao)
6. Prioritize the current product (name in context): anchor advice on it before only highlighting other pieces.
7. Clothing only in explicacao: do not suggest footwear or accessories (sunglasses, watch, bag, belt, hat, etc.).
8. ${catalogHardRules}

Return in JSON format:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "your answer to the user's question (size only at the beginning if needed)",
  "coerencia": "alta",
  "confianca": 1.0
}`
  };

  return messages[language] || messages['en'];
}

/** Abertura pós provador para lojas Growth+ sem candidatos de catálogo — tom consultor, não vendedor agressivo. */
function buildGrowthConsultantOpeningPrompt(data: ValidateSizeRequest, language: string): string {
  const storeNameContext = data.shop_name ? ` da ${data.shop_name}` : '';
  const productInfo = data.product_name ? `\n- Produto: ${data.product_name}` : '';
  const productDesc = data.product_description ? `\n- Descrição: ${data.product_description}` : '';
  const productCatalogContext = buildProductCatalogContext(data, language);
  const genderCtx = buildGenderContextForStylist(data, language);
  const catalogHardRules = buildCatalogHardRules(data, language);

  const messages: Record<string, string> = {
    pt: `O cliente acabou de ver o resultado do provador virtual${storeNameContext}. Você é consultor de moda (NÃO vendedor agressivo).

${genderCtx}
CONTEXTO:
- Tamanho recomendado pelo sistema: ${data.tamanho_calculado_algoritmo}
- Categoria: ${data.categoria}
- Elasticidade: ${data.elasticidade}${productInfo}${productDesc}${data.shop_name ? `\n- Marca/Loja: ${data.shop_name}` : ''}
${productCatalogContext}

OBJETIVO: mensagem de boas-vindas pós provador no chat.
ESTRUTURA (explicacao):
1. Primeira frase: "Para o/a NOME_DO_PRODUTO, seu tamanho ideal é ${data.tamanho_calculado_algoritmo}." (ajuste o/a conforme o nome.)
2. 2–4 frases: por que o corte/tecido valoriza a silhueta do cliente (qualitativo, sem cm); mencione o produto pelo nome.
3. Convide a perguntar no chat por combinações de look com outras peças da loja (ex.: "me sugere uma calça", "o que combina com isso?").
4. Pode mencionar carrinho só de forma leve e opcional (ex.: "se curtir, pode levar no carrinho") — PROIBIDO urgência ("agora", "não perca", "última chance").

PROIBIDO:
- Tom de telemarketing ou pressão forte ao carrinho
- Repetir o tamanho após a primeira frase
- Medidas em centímetros
- Sugerir calçados/acessórios nesta abertura (só vestuário; combinações virão depois no chat)
- ${catalogHardRules.replace('fala comercial', 'tom consultor')}

Retorne JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "abertura consultor",
  "coerencia": "alta",
  "confianca": 0.95
}`,
    es: `El cliente acaba de ver el probador virtual${storeNameContext}. Eres consultor de moda (NO vendedor agresivo).

${genderCtx}
CONTEXTO:
- Talla recomendada: ${data.tamanho_calculado_algoritmo}
- Categoría: ${data.categoria}
- Elasticidad: ${data.elasticidade}${productInfo}${productDesc}
${productCatalogContext}

OBJETIVO: mensaje de bienvenida post probador en el chat.
ESTRUCTURA (explicacion):
1. Primera frase: "Para el/la NOMBRE, tu talla ideal es ${data.tamanho_calculado_algoritmo}."
2. 2–4 frases sobre silueta/estilo del producto (sin cm).
3. Invita a pedir combinaciones de look en el chat.
4. Carrito solo de forma suave y opcional — sin urgencia.

PROHIBIDO: televenta, repetir talla, cm, calzado/accesorios en esta apertura.

Devuelve JSON con tamanho_final, explicacion, coerencia, confianca.`,
    en: `The shopper just finished the virtual try-on${storeNameContext}. You are a fashion consultant (NOT an aggressive salesperson).

${genderCtx}
CONTEXT:
- Recommended size: ${data.tamanho_calculado_algoritmo}
- Category: ${data.categoria}
- Elasticity: ${data.elasticidade}${productInfo}${productDesc}
${productCatalogContext}

GOAL: post try-on welcome message in chat.
STRUCTURE (explicacion):
1. First sentence: "For PRODUCT_NAME, your ideal size is ${data.tamanho_calculado_algoritmo}."
2. 2–4 sentences on silhouette/style (qualitative, no cm).
3. Invite them to ask in chat for outfit pairing ideas from the store.
4. Cart mention only soft/optional — no urgency.

FORBIDDEN: hard-sell, repeating size, cm, footwear/accessories in this opening.

Return JSON with tamanho_final, explicacion, coerencia, confianca.`,
  };

  return messages[language] || messages.en;
}

function buildAddToCartPrompt(data: ValidateSizeRequest, language: string): string {
  const storeNameContext = data.shop_name ? ` da ${data.shop_name}` : '';
  const productInfo = data.product_name ? `\n- Produto: ${data.product_name}` : '';
  const productDesc = data.product_description ? `\n- Descrição: ${data.product_description}` : '';
  const productCatalogContext = buildProductCatalogContext(data, language);
  const genderCtx = buildGenderContextForStylist(data, language);

  const messages: Record<string, string> = {
    pt: `Você precisa criar uma mensagem persuasiva incentivando o usuário a adicionar o produto${storeNameContext} ao carrinho.

${genderCtx}
CONTEXTO DO USUÁRIO:
- Altura: ${data.altura_cm} cm
- Peso: ${data.peso_kg} kg
- Peito: ${data.peito_cm} cm
- Cintura: ${data.cintura_cm} cm
- Quadril: ${data.quadril_cm} cm
- Tipo de corpo: ${data.tipo_corpo || 'regular'}
- Ajuste preferido: ${data.ajuste_preferido || 'regular'}

CONTEXTO DO PRODUTO:
- Tamanho recomendado: ${data.tamanho_calculado_algoritmo}
- Categoria: ${data.categoria}
- Elasticidade: ${data.elasticidade}${productInfo}${productDesc}${data.shop_name ? `\n- Marca/Loja: ${data.shop_name}` : ''}
${productCatalogContext}

ESTRUTURA DA MENSAGEM (clara, um pouco desenvolvida):
- Abra com o tamanho ideal (única menção ao tamanho) + uma ou duas frases qualitativas (silhueta/proporções/corte — sem cm).
- Mais 2–3 frases com benefício/tom pessoal e contexto de uso.
- Feche com indução ao carrinho (uma frase).

REGRAS CRÍTICAS (NÃO IGNORE!):
1. A palavra "tamanho" ou o valor "${data.tamanho_calculado_algoritmo}" deve aparecer APENAS UMA VEZ em toda a mensagem
2. Coloque o tamanho SOMENTE no início (primeira frase)
3. Na abertura, explique de forma qualitativa o motivo (ex.: proporções, silhueta)
4. NUNCA mencione medidas em centímetros - use descrições qualitativas
5. Total ~4–6 frases curtas (~650 caracteres) na explicacao; tom conversacional
6. Não use asteriscos, negrito ou formatação especial
7. Sempre induza ao carrinho no final

EXEMPLO CORRETO:
"Seu tamanho ideal é M, perfeito para suas proporções harmoniosas! ${data.product_name ? `Este ${data.product_name}` : 'Esta peça'} vai valorizar seu estilo - adicione ao carrinho agora!"

EXEMPLO ERRADO (NÃO FAÇA ISSO):
"Seu tamanho ideal é M! O tamanho M oferece ajuste perfeito. Adicione o tamanho M ao carrinho."

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "mensagem persuasiva com motivo qualitativo + indução ao carrinho",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `Necesitas crear un mensaje persuasivo incentivando al usuario a agregar el producto${storeNameContext} al carrito.

${genderCtx}
CONTEXTO:
- Talla recomendada: ${data.tamanho_calculado_algoritmo}
${productCatalogContext}

REGLAS CRÍTICAS (¡NO IGNORES!):
1. La palabra "talla" o el valor "${data.tamanho_calculado_algoritmo}" debe aparecer SOLO UNA VEZ en todo el mensaje
2. Coloca la talla SOLAMENTE al inicio (primera frase o primer párrafo; ejemplo: "¡Tu talla ideal es ${data.tamanho_calculado_algoritmo}!")
3. Después, NUNCA MÁS menciones la talla o números de talla
4. Continúa con beneficios en frases cortas (unas 4–6 en total; ideal hasta ~650 caracteres)${data.shop_name ? `. Puedes mencionar "${data.shop_name}" brevemente si aplica` : ''}
5. No uses asteriscos, negrita o formato especial
6. Tono conversacional, persuasivo y profesional; cierra invitando al carrito

EJEMPLO CORRECTO:
"¡Tu talla ideal es M! Experimenta virtualmente y agrégalo al carrito con total confianza en el ajuste perfecto."

EJEMPLO ERRADO (NO HAGAS ESTO):
"¡Tu talla ideal es M! La talla M ofrece ajuste perfecto. Agrega la talla M al carrito."

Retorna en formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "mensaje persuasivo (talla solo en la primera frase!)",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    en: `You need to create a persuasive message encouraging the user to add the product${storeNameContext} to cart.

${genderCtx}
CONTEXT:
- Recommended size: ${data.tamanho_calculado_algoritmo}
${productCatalogContext}

CRITICAL RULES (DO NOT IGNORE!):
1. The word "size" or the value "${data.tamanho_calculado_algoritmo}" must appear ONLY ONCE in the entire message
2. Put the size ONLY at the opening (first sentence or short first paragraph; example: "Your ideal size is ${data.tamanho_calculado_algoritmo}!")
3. After that, NEVER mention the size or size numbers again
4. Continue with benefits in short sentences (~4–6 total; aim under ~650 characters)${data.shop_name ? `. Mention "${data.shop_name}" briefly if relevant` : ''}
5. Don't use asterisks, bold or special formatting
6. Conversational, persuasive, professional tone; close by nudging toward cart

CORRECT EXAMPLE:
"Your ideal size is M! Try it virtually and add to cart with total confidence in the perfect fit."

WRONG EXAMPLE (DON'T DO THIS):
"Your ideal size is M! Size M offers perfect fit. Add size M to cart."

Return in JSON format:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "persuasive message (size only in first sentence!)",
  "coerencia": "alta",
  "confianca": 1.0
}`
  };

  return messages[language] || messages['en'];
}

function buildGuaranteedFallbackResponse(data: Partial<ValidateSizeRequest>, language: string): GPTResponse {
  const productName = data.product_name || (language === 'es' ? 'esta prenda' : language === 'en' ? 'this item' : 'esta peça');
  const sizes = (data.available_sizes || []).filter(Boolean);
  const colors = (data.available_colors || []).filter(Boolean);
  const sizeHint = data.tamanho_calculado_algoritmo || sizes[0] || 'M';

  // Resposta quando o assistente falhou mas o usuário perguntou algo (ex.: combinações) — evita repetir o mesmo texto de “adicione ao carrinho” + catálogo.
  if (
    data.intencao_usuario === "induzir_adicionar_carrinho" &&
    (data.interaction_count ?? 0) === 0
  ) {
    if (language === "es") {
      return {
        tamanho_final: sizeHint,
        explicacao: `Para ${productName}, tu talla ideal es ${sizeHint}. El corte te favorece en el probador — si quieres ideas de look, pregúntame en el chat.`,
        coerencia: "alta",
        confianca: 0.85,
      };
    }
    if (language === "en") {
      return {
        tamanho_final: sizeHint,
        explicacao: `For ${productName}, your ideal size is ${sizeHint}. The fit looks great in the mirror — ask me in chat for pairing ideas.`,
        coerencia: "high",
        confianca: 0.85,
      };
    }
    return {
      tamanho_final: sizeHint,
      explicacao: `Para ${productName}, seu tamanho ideal é ${sizeHint}. O caimento ficou ótimo no provador — se quiser ideias de look, é só perguntar aqui no chat.`,
      coerencia: "alta",
      confianca: 0.85,
    };
  }

  if (data.intencao_usuario === "custom_message") {
    if (language === "es") {
      return {
        tamanho_final: sizeHint,
        explicacao:
          `Talla sugerida para ${productName}: ${sizeHint}. Equilibra con una base más clara o denim. ¿Ocasión trabajo o día a día?`,
        coerencia: "alta",
        confianca: 0.72,
      };
    }
    if (language === "en") {
      return {
        tamanho_final: sizeHint,
        explicacao:
          `Suggested size for ${productName}: ${sizeHint}. Balance with lighter bottoms or denim. Work or casual?`,
        coerencia: "high",
        confianca: 0.72,
      };
    }
    return {
      tamanho_final: sizeHint,
      explicacao:
        `Tamanho sugerido para ${productName}: ${sizeHint}. Equilibre com calça mais clara ou jeans. Ocasião: trabalho ou dia a dia?`,
      coerencia: "alta",
      confianca: 0.72,
    };
  }

  if (language === 'es') {
    const colorLine = colors.length > 0 ? ` Colores: ${colors.join(', ')}.` : '';
    const sizeLine = sizes.length > 0 ? ` Tallas: ${sizes.join(', ')}.` : '';
    return {
      tamanho_final: sizeHint,
      explicacao: `Tu talla sugerida es ${sizeHint}.${colorLine}${sizeLine} Si te gusta, al carrito.`,
      coerencia: "alta",
      confianca: 0.92,
    };
  }

  if (language === 'en') {
    const colorLine = colors.length > 0 ? ` Colors: ${colors.join(', ')}.` : '';
    const sizeLine = sizes.length > 0 ? ` Sizes: ${sizes.join(', ')}.` : '';
    return {
      tamanho_final: sizeHint,
      explicacao: `Your suggested size is ${sizeHint}.${colorLine}${sizeLine} Add to cart if you like it.`,
      coerencia: "high",
      confianca: 0.92,
    };
  }

  const colorLine = colors.length > 0 ? ` Cores: ${colors.join(', ')}.` : '';
  const sizeLine = sizes.length > 0 ? ` Tamanhos: ${sizes.join(', ')}.` : '';
  return {
    tamanho_final: sizeHint,
    explicacao: `Tamanho sugerido: ${sizeHint}.${colorLine}${sizeLine} Adicione ao carrinho se curtir.`,
    coerencia: "alta",
    confianca: 0.92,
  };
}

/** Garante texto da pergunta atual e intenção coerente (evita cair no prompt de carrinho quando o cliente já perguntou algo). */
function normalizeUserQuestion(data: ValidateSizeRequest): void {
  const intent = String(data.intencao_usuario || "").trim();
  if (
    intent === "sugerir_combinacoes" ||
    intent === "legenda_tryon_secundario" ||
    intent === "consultor_outfit_inicial" ||
    intent === "induzir_adicionar_carrinho"
  ) {
    return;
  }

  let msg = String(data.custom_message ?? "").trim();
  if (!msg) {
    const hist = Array.isArray(data.chat_history) ? data.chat_history : [];
    const lastUser = [...hist].reverse().find((m) => m.role === "user");
    if (lastUser?.content) {
      msg = String(lastUser.content).trim();
      if (msg && !isInternalStylistSystemMessage(msg)) {
        data.custom_message = msg;
      } else {
        msg = "";
      }
    }
  }
  if (msg && !isInternalStylistSystemMessage(msg)) {
    data.intencao_usuario = "custom_message";
    data.custom_message = msg;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let requestData: ValidateSizeRequest | null = null;

  try {
    let data: ValidateSizeRequest = normalizeRequestDisplayFields(await req.json());
    requestData = data;

    console.log('📦 DADOS RECEBIDOS EM VALIDATE-SIZE:');
    console.log('   • shop_name:', data.shop_name || 'não fornecido');
    console.log('   • shop_domain:', data.shop_domain || 'não fornecido');
    console.log('   • altura_cm:', data.altura_cm);
    console.log('   • peso_kg:', data.peso_kg);
    console.log('   • tamanho_calculado:', data.tamanho_calculado_algoritmo);
    console.log('   • intencao_usuario:', data.intencao_usuario || 'validar tamanho');
    console.log('   • custom_message:', data.custom_message || 'não fornecido');
    console.log('   • genero (cliente):', data.genero || 'não fornecido');
    console.log('   • chart_gender_scope (loja):', data.chart_gender_scope || 'não fornecido');
    console.log('   • session_id:', data.session_id || 'não fornecido');
    console.log('   • interaction_count:', data.interaction_count || 0);
    console.log('   • available_sizes:', Array.isArray(data.available_sizes) ? data.available_sizes.length : 0, data.available_sizes || []);
    console.log('   • available_colors:', Array.isArray(data.available_colors) ? data.available_colors.length : 0, data.available_colors || []);
    console.log('   • variant_catalog:', Array.isArray(data.variant_catalog) ? data.variant_catalog.length : 0);
    if (Array.isArray(data.variant_catalog) && data.variant_catalog.length > 0) {
      console.log('   • variant_catalog sample (first 5):', data.variant_catalog.slice(0, 5));
    }
    console.log('   • selected_color:', data.selected_color || 'não fornecido');
    console.log('   • selected_image:', data.selected_image ? `${String(data.selected_image).substring(0, 120)}...` : 'não fornecido');

    // Mantemos contador apenas para telemetria/UX, sem bloquear respostas.
    const interactionCount = data.interaction_count || 0;
    if (!data.tamanho_calculado_algoritmo) {
      data.tamanho_calculado_algoritmo = 'M';
    }

    normalizeUserQuestion(data);

    const language = data.language || "pt";
    const shopPlan = await fetchShopBillingPlan(data.shop_domain);
    const growthPlusPlan = hasStylistConsultantPlan(shopPlan);

    if (isStylistConsultantRequest(data)) {
      if (!growthPlusPlan) {
        console.log(
          "[validate-size] stylist consultant blocked — plan:",
          shopPlan || "unknown",
          "shop:",
          data.shop_domain || "n/a"
        );
        const blocked = buildStylistPlanBlockedResponse(data, language);
        const availableSizes = (data.available_sizes || []).filter(Boolean).map(String);
        const algorithmSizeNormalized = normalizeSizeLabel(data.tamanho_calculado_algoritmo || "M");
        const algorithmSizeWithinCatalog =
          availableSizes.length > 0
            ? pickClosestAvailableSize(algorithmSizeNormalized, availableSizes)
            : algorithmSizeNormalized;
        const algorithmCanonical = resolveCanonicalSizeLabel(
          algorithmSizeWithinCatalog,
          availableSizes
        );
        const finalBlocked = enforceSizeFirstMessage(
          {
            ...enforceAvailableSizes(
              { ...blocked, tamanho_final: algorithmCanonical },
              data
            ),
          },
          data,
          { stylistMode: false }
        );
        return new Response(
          JSON.stringify({
            success: true,
            data: finalBlocked,
            interaction_count: interactionCount + 1,
            meta: { assistant_source: "plan_gate", stylist_mode: false },
            _validate_size_rev: "2026-05-16-stylist-growth-plan-gate-v1",
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    const hasCandidateProducts =
      Array.isArray(data.candidate_products) && data.candidate_products.length > 0;

    // Construir prompt baseado na intenção
    let userPrompt: string;
    console.log('🧠 Prompt language:', language);

    if (data.intencao_usuario === "legenda_tryon_secundario") {
      userPrompt = buildSecondaryTryOnCaptionPrompt(data, language);
    } else if (
      data.intencao_usuario === "consultor_outfit_inicial" ||
      (data.intencao_usuario === "custom_message" && data.custom_message)
    ) {
      if (data.intencao_usuario !== "consultor_outfit_inicial" && !shouldSkipUserMessageValidation(data)) {
        const validationResult = await validateUserMessage(data.custom_message, language);
        if (!validationResult.is_appropriate) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                tamanho_final: data.tamanho_calculado_algoritmo,
                explicacao: validationResult.response_message,
                coerencia: "alta",
                confianca: 1.0,
                should_end_conversation: true
              },
              interaction_count: 5
            }),
            {
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
      }
      userPrompt = hasCandidateProducts
        ? buildStylistConsultantPrompt(data, language)
        : data.intencao_usuario === "consultor_outfit_inicial"
          ? buildGrowthConsultantOpeningPrompt(data, language)
          : buildCustomMessagePrompt(data, language);
    } else if (data.intencao_usuario === "sugerir_combinacoes") {
      userPrompt = buildComplementaryPrompt(data, language);
    } else if (data.intencao_usuario === "induzir_adicionar_carrinho") {
      if (hasCandidateProducts) {
        userPrompt = buildStylistConsultantPrompt(data, language);
      } else if (growthPlusPlan) {
        userPrompt = buildGrowthConsultantOpeningPrompt(data, language);
      } else {
        userPrompt = buildAddToCartPrompt(data, language);
      }
    } else {
      if (hasCandidateProducts) {
        userPrompt = buildStylistConsultantPrompt(data, language);
      } else if (growthPlusPlan) {
        userPrompt = buildGrowthConsultantOpeningPrompt(data, language);
      } else {
        userPrompt = buildAddToCartPrompt(data, language);
      }
    }

    // Chamar OpenAI
    console.log('🚀 Enviando prompt para OpenAI. Intenção:', data.intencao_usuario || 'validar_tamanho');

    /** Respostas de consultor de outfit no chat: vale mesmo sem lista de candidatos (ex.: catalog-search vazio). */
    const consultantOutfitReply =
      data.intencao_usuario === "custom_message" ||
      data.intencao_usuario === "consultor_outfit_inicial" ||
      data.intencao_usuario === "sugerir_combinacoes" ||
      (growthPlusPlan &&
        data.intencao_usuario === "induzir_adicionar_carrinho" &&
        (data.interaction_count ?? 0) === 0);

    /** Consultor outfit / combinações — candidatos no payload OU intents de conversa estilo consultor. */
    const stylistOutfitLead = consultantOutfitReply || hasCandidateProducts;

    const isSecondaryCaption = data.intencao_usuario === "legenda_tryon_secundario";

    const targetGender = resolveEffectiveTargetGender(data);
    const genderSystemExtra =
      targetGender !== "unisex" ? genderOutfitRulesAppendix(targetGender, language) : "";
    const stylistSystemExtra = hasCandidateProducts ? getStylistSystemExtra(language) : "";
    const combinedSystemExtra = isSecondaryCaption
      ? getSecondaryCaptionSystemExtra(language)
      : [stylistSystemExtra, genderSystemExtra].filter(Boolean).join("\n\n");

    let gptResponse: GPTResponse;
    let assistantSource: "openai" | "fallback_openai" = "openai";
    try {
      gptResponse = await callOpenAI(userPrompt, language, {
        systemExtra: combinedSystemExtra || undefined,
        maxTokens: isSecondaryCaption ? 340 : stylistOutfitLead ? 1024 : 480,
        defaultTamanho: data.tamanho_calculado_algoritmo || "M",
        temperature:
          stylistOutfitLead && hasCandidateProducts && !isSecondaryCaption ? 0.58 : undefined,
      });
    } catch (aiErr) {
      console.error("OpenAI unavailable:", aiErr);
      assistantSource = "fallback_openai";
      if (hasCandidateProducts) {
        const lang = language;
        const emptyHint =
          lang === "es"
            ? "Sin coincidencias claras en esta búsqueda. Reformula o mira más productos."
            : lang === "en"
              ? "No strong matches in this search. Try rephrasing or browse."
              : "Sem boas coincidências nesta busca. Reformule ou veja mais produtos.";
        gptResponse = {
          tamanho_final: normalizeSizeLabel(data.tamanho_calculado_algoritmo || "M"),
          explicacao: emptyHint,
          coerencia: "alta",
          confianca: 0.5,
          suggested_products: [],
        };
      } else if (data.intencao_usuario === "legenda_tryon_secundario") {
        gptResponse = fallbackSecondaryTryOnCaption(data, language);
      } else {
        console.error("OpenAI indisponível ou resposta inválida; usando fallback por intenção:", aiErr);
        gptResponse = buildGuaranteedFallbackResponse(data, language);
      }
    }

    if (hasCandidateProducts && data.candidate_products) {
      let suggested = sanitizeSuggestedProducts(
        gptResponse.suggested_products,
        data.candidate_products
      );
      if (suggested.length === 0) {
        suggested = inferSuggestedFromExplicacao(
          gptResponse.explicacao,
          data.candidate_products
        );
      }
      if (suggested.length === 0) {
        suggested = defaultSuggestedFromCandidates(data.candidate_products, language);
      }
      gptResponse = {
        ...gptResponse,
        suggested_products: suggested,
      };
    }

    if (targetGender !== "unisex") {
      gptResponse = {
        ...gptResponse,
        explicacao: sanitizeExplicacaoForGender(
          gptResponse.explicacao,
          targetGender,
          language,
          data.product_name
        ),
      };
    }

    // Garantir que o tamanho final exista no catálogo real do produto selecionado.
    // Exemplo: se o algoritmo sugerir "GG", mas o produto só tem P..G, corrigimos para um tamanho existente.
    const availableSizes = (data.available_sizes || []).filter(Boolean).map(String);
    const algorithmSizeNormalized = normalizeSizeLabel(data.tamanho_calculado_algoritmo || 'M');
    const algorithmSizeWithinCatalog = availableSizes.length > 0
      ? pickClosestAvailableSize(algorithmSizeNormalized, availableSizes)
      : algorithmSizeNormalized;
    const algorithmCanonical = resolveCanonicalSizeLabel(algorithmSizeWithinCatalog, availableSizes);

    // Regra: a mensagem inicial (e qualquer mensagem) deve refletir o tamanho do algoritmo (payload),
    // não um tamanho "inventado" pelo GPT. O GPT pode ajustar o discurso, mas o tamanho é do sistema.
    const gptWithForcedSize: GPTResponse = {
      ...gptResponse,
      tamanho_final: algorithmCanonical,
    };

    const constrainedResponse = enforceAvailableSizes(gptWithForcedSize, data);
    const sanitizedExplicacao = sanitizeExplicacaoDisplayLabels(
      constrainedResponse.explicacao,
      data,
      language
    );
    const finalResponse = enforceSizeFirstMessage(
      { ...constrainedResponse, explicacao: sanitizedExplicacao },
      data,
      {
      stylistMode: stylistOutfitLead && data.intencao_usuario !== 'legenda_tryon_secundario',
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: finalResponse,
        interaction_count: interactionCount + 1,
        meta: {
          assistant_source: assistantSource,
          stylist_mode: stylistOutfitLead && data.intencao_usuario !== "legenda_tryon_secundario",
          growth_plus_plan: growthPlusPlan,
        },
        _validate_size_rev: "2026-05-16-growth-consultant-opening-v1",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in validate-size function:", error);
    const fallbackLanguage = requestData?.language === 'es' || requestData?.language === 'en' || requestData?.language === 'pt'
      ? requestData.language
      : 'pt';
    // Fallback determinístico para nunca quebrar a experiência do chat.
    const fallbackResponse = buildGuaranteedFallbackResponse(requestData || {}, fallbackLanguage);

    return new Response(
      JSON.stringify({
        success: true,
        data: fallbackResponse,
        interaction_count: (requestData?.interaction_count || 0) + 1,
        meta: { assistant_source: "error_fallback" as const },
        _validate_size_rev: "2026-05-16-secondary-caption-no-size-v2",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
