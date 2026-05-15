import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

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
  }>;
  /** Perfil de género do cliente no provador (male | female | unisex). */
  genero?: string;
  /**
   * Escopo da tabela de medidas definido pelo lojista na size chart (coleção/produto/global):
   * both = aceita ambos; male/female = linha orientada a esse perfil.
   */
  chart_gender_scope?: "both" | "male" | "female" | string;
  tipo_corpo?: string;
  ajuste_preferido?: string;
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
  const rawSuggested = o.suggested_products;
  let suggested_products: GPTResponse["suggested_products"];
  if (Array.isArray(rawSuggested)) {
    suggested_products = rawSuggested
      .filter((x) => x && typeof x === "object")
      .map((x) => {
        const h = String((x as { handle?: string }).handle || "").trim();
        const rationale = String((x as { rationale?: string }).rationale || "").trim();
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
      ? "Buena combinación con lo que tienes en el probador."
      : language === "en"
        ? "Pairs nicely with your try-on piece."
        : "Combina bem com a peça que está a experimentar no provador.";
  return candidates
    .slice(0, 3)
    .map((c) => ({ handle: String(c.handle || "").trim(), rationale }))
    .filter((x) => x.handle);
}

function sanitizeSuggestedProducts(
  raw: unknown,
  candidates: NonNullable<ValidateSizeRequest["candidate_products"]>
): Array<{ handle: string; rationale?: string }> {
  const allowed = new Set(
    (candidates || []).map((c) => String(c?.handle || "").trim().toLowerCase()).filter(Boolean)
  );
  if (!Array.isArray(raw)) return [];
  const out: Array<{ handle: string; rationale?: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const h = String((item as { handle?: string }).handle || "").trim();
    if (!h || !allowed.has(h.toLowerCase())) continue;
    const rationale = String((item as { rationale?: string }).rationale || "").trim();
    out.push({
      handle: h,
      ...(rationale ? { rationale: rationale.slice(0, 220) } : {}),
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
  // O pós-processamento (enforceSizeFirstMessage) já vai garantir que o tamanho apareça apenas na 1ª frase,
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

function buildSizeFirstSentence(language: string, size: string): string {
  if (language === 'es') return `Tu talla ideal es ${size}!`;
  if (language === 'en') return `Your ideal size is ${size}!`;
  return `Seu tamanho ideal é ${size}!`;
}

function enforceSizeFirstMessage(
  gptResponse: GPTResponse,
  data: ValidateSizeRequest
): GPTResponse {
  const size = normalizeSizeLabel(gptResponse.tamanho_final || data.tamanho_calculado_algoritmo || 'M');

  // 1) Limpa linhas de catálogo para evitar que "tamanhos/cores disponíveis" dominem a mensagem.
  const withoutCatalog = stripCatalogLines(gptResponse.explicacao || '');

  // Não injeta texto automático. Mantém somente a resposta do GPT,
  // apenas sanitizando ruído de catálogo e garantindo tamanho_final coerente.
  const cleanedBody = withoutCatalog.trim();

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
      explicacao: `¡Hola! Tu talla ideal para ${productName} es ${canonicalSize}, te quedará genial. ¿Lo añadimos al carrito?`,
      coerencia: 'alta',
      confianca: 0.98,
    };
  }

  if (language === 'en') {
    return {
      tamanho_final: canonicalSize,
      explicacao: `Hi! Your ideal size for ${productName} is ${canonicalSize} — it will look great on you. Want to add it to cart?`,
      coerencia: 'high',
      confianca: 0.98,
    };
  }

  return {
    tamanho_final: canonicalSize,
    explicacao: `Olá! Seu tamanho ideal para o ${productName} é ${canonicalSize}, vai ficar ótimo nas suas proporções. Que tal adicionar ao carrinho?`,
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
- Pode desenvolver a resposta com o detalhe necessário; não se prenda a respostas artificialmente curtas
- Celebre características únicas do corpo de forma positiva
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
  "explicacao": "explicação calorosa, confiante e envolvente",
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
- Puedes desarrollar la respuesta con el detalle que haga falta; no te limites a respuestas artificialmente cortas
- Celebra características únicas del cuerpo de forma positiva
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
  "explicacao": "explicación cálida, confiada y atractiva",
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
- Take the space you need to be genuinely helpful; do not force artificially short replies
- Celebrate unique body characteristics in a positive way
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
  "explicacao": "warm, confident and engaging explanation",
  "coerencia": "high/medium/low",
  "confianca": 0.0-1.0
}`
  };

  return prompts[language] || prompts['en'];
}

async function callOpenAISingle(
  userPrompt: string,
  language: string,
  opts: { systemExtra?: string; maxTokens: number; defaultTamanho: string }
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
      temperature: 0.7,
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
  opts?: { systemExtra?: string; maxTokens?: number; defaultTamanho?: string }
): Promise<GPTResponse> {
  const defaultTamanho = normalizeSizeLabel(opts?.defaultTamanho || "M") || "M";
  const requested = opts?.maxTokens ?? 1200;
  const attempts = [requested, Math.min(Math.max(requested * 2, 1800), 4096)];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await callOpenAISingle(userPrompt, language, {
        systemExtra: opts?.systemExtra,
        maxTokens: attempts[i],
        defaultTamanho,
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
Com base no perfil do usuário (Altura: ${data.altura_cm}cm, tamanho ${data.tamanho_calculado_algoritmo}), sugira um tipo de peça complementar${storeContext} que combinaria bem e explique o porquê da combinação com tom pessoal ("para você", "no seu caso").${data.shop_name ? ` Você pode mencionar a loja "${data.shop_name}" de forma natural se for relevante.` : ''}
${productCatalogContext}`;
  }

  return `${genderCtx}
Com base no perfil do usuário (Altura: ${data.altura_cm}cm, tamanho ${data.tamanho_calculado_algoritmo} em ${data.categoria}), analise esta peça complementar${storeContext}:

Produto: ${product.name}
Categoria: ${product.category}
${productCatalogContext}

Explique de forma clara e pessoal por que esta peça combina bem com o perfil do usuário e crie um texto persuasivo mas profissional para incentivá-lo a conhecer o produto; desenvolva o quanto fizer sentido.${data.shop_name ? ` Você pode mencionar a loja "${data.shop_name}" de forma natural se for relevante.` : ''}

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "sua explicação sobre a combinação",
  "coerencia": "alta",
  "confianca": 0.95
}`;
}

function buildProductCatalogContext(data: ValidateSizeRequest, language: string): string {
  const sizes = (data.available_sizes || []).filter(Boolean);
  const colors = (data.available_colors || []).filter(Boolean);
  const selectedColor = data.selected_color || '';
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
IMPORTANTE: baseie a recomendação e a fala comercial nesses tamanhos/cores reais do produto atual.`;
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
    pt: `MODO CONSULTOR DE MODA (catálogo limitado):
- Você é um estilista profissional da loja: tom caloroso, claro e pessoal ("para você", "no seu caso"); use o espaço que precisar, sem tom de "vendedor genérico" ou jargão vazio.
- Só pode mencionar produtos cujo "handle" apareça na lista CANDIDATOS abaixo. Nunca invente URLs, nomes ou peças fora da lista.
- Critérios de styling (use os que fizerem sentido): harmonia de cor (contraste ou tonalidade intencional); proporção e silhueta em relação ao tipo de peça em try-on (categoria: upper/lower/full); ocasião (mais casual vs mais arrumado); coerência entre categorias (ex.: topo escuro + base mais clara quando adequado).
- GÉNERO (obrigatório): siga o bloco CONTEXTO DE GÉNERO e as REGRAS DE COMBINAÇÃO NA explicacao. Para perfil masculino é PROIBIDO na explicacao mencionar saias, vestidos ou equivalentes — só calças, bermudas, shorts, etc.
- Explique de forma clara POR QUE a peça combina antes de citar o nome.
- Se o cliente pedir outro tipo de peça ou estilo diferente das sugestões anteriores (ex.: casaco em vez de calça), acolha a preferência: os CANDIDATOS já foram renovados pelo sistema — escolha só entre eles; não insista no que deixou de fazer sentido.
- Se a lista não tiver o que o cliente pediu, seja honesto: diga que nesta busca não apareceu e sugira reformular ou explorar a loja — sem inventar produtos.
- Responda em JSON válido incluindo "suggested_products": array (0 a 3 itens) com {"handle":"...","rationale":"opcional, em tom pessoal"} — apenas handles da lista.`,
    es: `MODO ESTILISTA (catálogo limitado):
- Eres un/a estilista profesional de la tienda: tono cálido, claro y personal ("para ti", "en tu caso"); usa el espacio que necesites; evita tono de "vendedor genérico".
- Solo puedes mencionar productos cuyo "handle" esté en CANDIDATOS. Nunca inventes URLs ni prendas fuera de la lista.
- Criterios: armonía de color (contraste o tonalidad); proporción y silueta según la prenda en prueba (categoría upper/lower/full); ocasión (casual vs más arreglada); coherencia entre categorías.
- GÉNERO (obligatorio): respeta el perfil del cliente y el alcance de la tienda en el bloque "CONTEXTO DE GÉNERO". No sugieras prendas típicamente femeninas (p. ej., falda, vestido) a un perfil masculino, ni lo contrario de forma incoherente; con perfil unisex prioriza piezas neutras/unisex salvo que el título del candidato indique claramente apropiación para todos.
- Explica con claridad POR QUÉ combina antes de nombrar.
- Si el cliente pide otra categoría o estilo (ej. abrigo en vez de pantalón), acoge la preferencia: los CANDIDATOS ya se actualizaron — elige solo entre ellos.
- Si no hay nada adecuado en la lista, dilo con honestidad — sin inventar.
- JSON válido con "suggested_products": 0–3 elementos {"handle":"...","rationale":"..."} solo de la lista.`,
    en: `STYLIST MODE (limited catalog):
- You are a professional in-store stylist: warm, clear, and personal ("for you", "in your case"); take the room you need. Avoid generic "salesy" tone.
- You may ONLY mention products whose "handle" is in CANDIDATES. Never invent URLs or items outside the list.
- Criteria: color harmony (contrast or intentional tone); proportion and silhouette vs the try-on garment category (upper/lower/full); occasion (casual vs dressier); sensible category pairing.
- GENDER (mandatory): follow the shopper profile and the store scope in the "GENDER CONTEXT" block. Do not suggest typically women's-only items (e.g. skirts, dresses) to a male profile, or incoherent men's-only pieces to a female profile; for unisex profile prefer neutral/unisex candidates unless a title clearly signals inclusive styling.
- Explain clearly WHY pieces work before naming them.
- If the shopper asks for a different category or vibe (e.g. coat instead of pants), embrace it: CANDIDATES were refreshed — pick only from the current list.
- If nothing matches, say so honestly — do not invent products.
- Valid JSON with "suggested_products": 0–3 items {"handle":"...","rationale":"..."} from the list only.`,
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
- DO suggest: jeans, dress pants, chinos, bermuda shorts, joggers, jackets, sneakers.
- Never say the piece "looks great with skirts" or similar feminine-only pairings.\n`;
    }
    return `\nOUTFIT RULES FOR explicacao (MANDATORY — female profile):
- Avoid male-only formal pieces (e.g. men's tie) unless clearly unisex.
- You may suggest skirts, dresses, trousers, jeans, blazers, tops, etc.\n`;
  }
  if (target === "male") {
    return `\nREGRAS DE COMBINAÇÃO NA explicacao (OBRIGATÓRIO — perfil masculino):
- PROIBIDO mencionar ou sugerir: saia, saias, vestido, vestidos, skirt, skirts, dress, dresses.
- PODE sugerir: calça jeans, calça de alfaitarada/chino, bermuda, shorts, moletom, casaco, tênis.
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

function buildStylistConsultantPrompt(data: ValidateSizeRequest, language: string): string {
  const candidates = Array.isArray(data.candidate_products) ? data.candidate_products : [];
  const lines = candidates
    .map((c) => `- handle: ${String(c.handle || "").trim()} | title: ${String(c.title || "").trim()}`)
    .join("\n");

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
  const msg = String(data.custom_message || "").trim();
  const cat = String(data.categoria || "upper");
  const catHintPt =
    cat === "lower"
      ? "(lower = peça de baixo; harmonize com o que combina por cima / conjunto.)"
      : cat === "full"
        ? "(full = corpo inteiro; equilibre proporções e ocasião.)"
        : "(upper = peça de cima; pense em base/acessórios para silhueta e cor.)";
  const catHintEs =
    cat === "lower"
      ? "(lower = parte inferior; armoniza con lo de arriba / conjunto.)"
      : cat === "full"
        ? "(full = cuerpo entero; equilibra proporción y ocasión.)"
        : "(upper = parte superior; piensa en base/accesorios para silueta y color.)";
  const catHintEn =
    cat === "lower"
      ? "(lower = bottoms; balance with tops / outfit cohesion.)"
      : cat === "full"
        ? "(full = full-body garment; balance proportion and occasion.)"
        : "(upper = tops; think bottoms/accessories for silhouette and color.)";

  if (language === "es") {
    return `El cliente escribió:\n"${msg}"\n\nPrenda que está probando (try-on): ${data.product_name || "producto actual"}\nCategoría (colección / silueta): ${data.categoria} ${catHintEs}\nTalla recomendada (contexto): ${data.tamanho_calculado_algoritmo}${storeContext}\n${genderCtx}${productCatalogContext}\n${chatHistoryText}\nCANDIDATOS (solo puedes recomendar estos handles):\n${lines || "(vacío)"}\n\nResponde al cliente como estilista con tono personal ("tú", "para ti", "en tu caso"); desarrolla lo que haga falta en explicacao.\nOBLIGATORIO en explicacao: respeta el perfil de género (ej.: perfil masculino — nunca menciones faldas/vestidos; sugiere vaqueros, pantalón de vestir, bermuda).\nOBLIGATORIO en el JSON: "suggested_products" debe ser un array con 1 a 3 objetos {"handle":"...","rationale":"..."} usando SOLO handles exactos de CANDIDATOS (nunca vacío si la lista tiene ítems).\nDevuelve JSON con tamanho_final, explicacao, coerencia, confianca y suggested_products.`;
  }
  if (language === "en") {
    return `The shopper wrote:\n"${msg}"\n\nGarment in try-on: ${data.product_name || "current product"}\nCollection category (silhouette context): ${data.categoria} ${catHintEn}\nRecommended size (context): ${data.tamanho_calculado_algoritmo}${storeContext}\n${genderCtx}${productCatalogContext}\n${chatHistoryText}\nCANDIDATES (you may ONLY recommend these handles):\n${lines || "(empty)"}\n\nReply as a stylist with a personal tone ("you", "for you", "in your case"); use the space you need in explicacao.\nMANDATORY in explicacao: respect the gender profile (e.g. male profile — never mention skirts/dresses; suggest jeans, dress pants, bermuda shorts).\nMANDATORY in JSON: "suggested_products" must be an array of 1–3 items {"handle":"...","rationale":"..."} using ONLY exact handles from CANDIDATES (never empty if the list has items).\nReturn JSON with tamanho_final, explicacao, coerencia, confianca, suggested_products.`;
  }
  return `O cliente escreveu:\n"${msg}"\n\nPeça em try-on: ${data.product_name || "produto atual"}\nCategoria (coleção / silhueta): ${data.categoria} ${catHintPt}\nTamanho recomendado (contexto): ${data.tamanho_calculado_algoritmo}${storeContext}\n${genderCtx}${productCatalogContext}\n${chatHistoryText}\nCANDIDATOS (só pode recomendar estes handles):\n${lines || "(vazio)"}\n\nResponda como estilista com tom pessoal ("você", "para você", "no seu caso"); desenvolva o que precisar em explicacao.\nOBRIGATÓRIO na explicacao: respeite o perfil de género (ex.: perfil masculino — nunca mencione saias/vestidos; sugira calça jeans, alfaitarada, bermuda).\nOBRIGATÓRIO no JSON: "suggested_products" tem de ser um array com 1 a 3 objetos {"handle":"...","rationale":"..."} usando APENAS handles exatos dos CANDIDATOS (nunca vazio se a lista tiver itens).\nDevolva JSON com tamanho_final, explicacao, coerencia, confianca e suggested_products.`;
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
        max_tokens: 150,
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
1. Se a pergunta for sobre o produto/descrição, use as informações acima para responder de forma útil
2. Se mencionar o tamanho, faça APENAS UMA VEZ no início da resposta
3. Depois continue naturalmente SEM repetir o tamanho
4. Se a pergunta for sobre a marca/loja, mencione "${data.shop_name}" de forma natural e positiva
5. Tom pessoal: "você", "no seu caso", "para você" quando fizer sentido; desenvolva o quanto precisar para ser útil e persuasivo
6. Sempre induza à compra de forma sutil ao final
7. Mantenha o foco em ajudar o usuário a tomar a decisão de compra
8. Respeite o CONTEXTO DE GÉNERO nas sugestões de combinação (perfil masculino: nunca mencione saias/vestidos na explicacao)
9. ${catalogHardRules}

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "sua resposta persuasiva à pergunta do usuário",
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
2. Después continúa naturalmente SIN repetir la talla${data.shop_name ? ` (puedes mencionar la tienda "${data.shop_name}" de forma natural si es relevante)` : ''}
3. Tono personal: "tú", "para ti", "en tu caso" cuando encaje; desarrolla lo que haga falta para ser útil y persuasivo
4. Mantén el foco en ayudar al usuario a tomar la decisión de compra
5. Respeta el CONTEXTO DE GÉNERO en las combinaciones (perfil masculino: nunca menciones faldas/vestidos en explicacao)
6. ${catalogHardRules}

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
2. Then continue naturally WITHOUT repeating the size${data.shop_name ? ` (you can mention the store "${data.shop_name}" naturally if relevant)` : ''}
3. Personal tone: "you", "for you", "in your case" when natural; take the space you need to be helpful and persuasive
4. Keep focus on helping the user make the purchase decision
5. Follow GENDER CONTEXT for outfit pairings (male profile: never mention skirts/dresses in explicacao)
6. ${catalogHardRules}

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

ESTRUTURA DA MENSAGEM:
- Abra confirmando o tamanho ideal (única menção ao tamanho no texto) e o motivo em linguagem qualitativa (proporções, silhueta, tipo de corpo — sem cm).
- Continue com benefícios e tom pessoal ("para você", "no seu caso"); pode usar quantas frases forem necessárias.
- Feche induzindo ao carrinho.

REGRAS CRÍTICAS (NÃO IGNORE!):
1. A palavra "tamanho" ou o valor "${data.tamanho_calculado_algoritmo}" deve aparecer APENAS UMA VEZ em toda a mensagem
2. Coloque o tamanho SOMENTE no início (primeira frase ou primeiro parágrafo)
3. Na abertura, explique de forma qualitativa o motivo (ex: "combina com suas proporções", "ideal para seu tipo de corpo atlético", "perfeito para sua silhueta")
4. NUNCA mencione medidas em centímetros - use descrições qualitativas
5. Tom conversacional, persuasivo e pessoal; não se limite artificialmente a poucas linhas
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
4. Continúa con beneficios y tono personal ("para ti", "en tu caso"): confianza, experiencia try-on, ajuste perfecto; usa las frases que necesites${data.shop_name ? `. Puedes mencionar la tienda "${data.shop_name}" de forma natural si es relevante` : ''}
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
4. Continue with benefits and a personal tone ("for you", "in your case"): confidence, try-on experience, perfect fit; use as many sentences as you need${data.shop_name ? `. You can mention the store "${data.shop_name}" naturally if relevant` : ''}
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
  if (data.intencao_usuario === "custom_message") {
    if (language === "es") {
      return {
        tamanho_final: sizeHint,
        explicacao:
          `Tu talla sugerida para ${productName} es ${sizeHint}. Con esta prenda puedes equilibrar el look con una base más clara, denim o textura distinta (camisa, chaqueta ligera). Dime la ocasión (trabajo, día a día, salir) y lo afinamos.`,
        coerencia: "alta",
        confianca: 0.72,
      };
    }
    if (language === "en") {
      return {
        tamanho_final: sizeHint,
        explicacao:
          `Your suggested size for ${productName} is ${sizeHint}. You can balance the outfit with lighter bottoms, denim, or a different texture (shirt, light jacket). Tell me the occasion (work, everyday, going out) and I will narrow it down.`,
        coerencia: "high",
        confianca: 0.72,
      };
    }
    return {
      tamanho_final: sizeHint,
      explicacao:
        `Para o ${productName}, o tamanho sugerido para você é ${sizeHint}. No seu caso costuma funcionar equilibrar o preto com calça mais clara, jeans ou uma camada com textura diferente (camisa, jaqueta leve). Se disser a ocasião — trabalho, dia a dia, sair à noite — afunilo melhor as ideias.`,
      coerencia: "alta",
      confianca: 0.72,
    };
  }

  if (language === 'es') {
    const colorLine = colors.length > 0 ? ` Colores disponibles: ${colors.join(', ')}.` : '';
    const sizeLine = sizes.length > 0 ? ` Tallas disponibles: ${sizes.join(', ')}.` : '';
    return {
      tamanho_final: sizeHint,
      explicacao: `Para ${productName}, tu talla sugerida es ${sizeHint}. Te queda excelente para el estilo que buscas.${colorLine}${sizeLine} Si te gusta, agrégalo al carrito ahora para no perderlo.`,
      coerencia: "alta",
      confianca: 0.92,
    };
  }

  if (language === 'en') {
    const colorLine = colors.length > 0 ? ` Available colors: ${colors.join(', ')}.` : '';
    const sizeLine = sizes.length > 0 ? ` Available sizes: ${sizes.join(', ')}.` : '';
    return {
      tamanho_final: sizeHint,
      explicacao: `For ${productName}, your suggested size is ${sizeHint}. It is a great match for your look.${colorLine}${sizeLine} If you like it, add it to cart now so you do not miss it.`,
      coerencia: "high",
      confianca: 0.92,
    };
  }

  const colorLine = colors.length > 0 ? ` Cores disponíveis: ${colors.join(', ')}.` : '';
  const sizeLine = sizes.length > 0 ? ` Tamanhos disponíveis: ${sizes.join(', ')}.` : '';
  return {
    tamanho_final: sizeHint,
    explicacao: `Para o ${productName}, o tamanho sugerido para o seu perfil é ${sizeHint}. A peça combina com o estilo que você procura.${colorLine}${sizeLine} Se gostou, adicione ao carrinho agora para garantir.`,
    coerencia: "alta",
    confianca: 0.92,
  };
}

/** Garante texto da pergunta atual e intenção coerente (evita cair no prompt de carrinho quando o cliente já perguntou algo). */
function normalizeUserQuestion(data: ValidateSizeRequest): void {
  let msg = String(data.custom_message ?? "").trim();
  if (!msg) {
    const hist = Array.isArray(data.chat_history) ? data.chat_history : [];
    const lastUser = [...hist].reverse().find((m) => m.role === "user");
    if (lastUser?.content) {
      msg = String(lastUser.content).trim();
      if (msg) data.custom_message = msg;
    }
  }
  if (msg && data.intencao_usuario !== "sugerir_combinacoes") {
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
    const data: ValidateSizeRequest = await req.json();
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

    // Construir prompt baseado na intenção
    let userPrompt: string;
    const language = data.language || 'pt';
    console.log('🧠 Prompt language:', language);

    // Se for mensagem customizada, validar conteúdo antes
    if (data.intencao_usuario === "custom_message" && data.custom_message) {
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
      // Se for apropriado, construir prompt para responder a pergunta
      const hasCandidates = Array.isArray(data.candidate_products) && data.candidate_products.length > 0;
      userPrompt = hasCandidates
        ? buildStylistConsultantPrompt(data, language)
        : buildCustomMessagePrompt(data, language);
    } else if (data.intencao_usuario === "sugerir_combinacoes") {
      userPrompt = buildComplementaryPrompt(data, language);
    } else if (data.intencao_usuario === "induzir_adicionar_carrinho") {
      userPrompt = buildAddToCartPrompt(data, language);
    } else {
      userPrompt = buildAddToCartPrompt(data, language);
    }

    // Chamar OpenAI
    console.log('🚀 Enviando prompt para OpenAI. Intenção:', data.intencao_usuario || 'validar_tamanho');
    const hasStylistCandidates =
      data.intencao_usuario === "custom_message" &&
      Array.isArray(data.candidate_products) &&
      data.candidate_products.length > 0;

    const targetGender = resolveEffectiveTargetGender(data);
    const genderSystemExtra =
      targetGender !== "unisex" ? genderOutfitRulesAppendix(targetGender, language) : "";
    const stylistSystemExtra = hasStylistCandidates ? getStylistSystemExtra(language) : "";
    const combinedSystemExtra = [stylistSystemExtra, genderSystemExtra].filter(Boolean).join("\n\n");

    let gptResponse: GPTResponse;
    let assistantSource: "openai" | "fallback_openai" = "openai";
    try {
      gptResponse = await callOpenAI(userPrompt, language, {
        systemExtra: combinedSystemExtra || undefined,
        maxTokens: hasStylistCandidates ? 1800 : 1400,
        defaultTamanho: data.tamanho_calculado_algoritmo || "M",
      });
    } catch (aiErr) {
      console.error("OpenAI unavailable:", aiErr);
      assistantSource = "fallback_openai";
      if (hasStylistCandidates) {
        const lang = language;
        const emptyHint =
          lang === "es"
            ? "No encontré sugerencias en el catálogo filtrado para esta búsqueda. Prueba reformular o explora la tienda."
            : lang === "en"
              ? "I could not find strong matches in this catalog search. Try rephrasing or browse the store."
              : "Não encontrei sugestões fortes nesta busca do catálogo. Tente reformular ou explore a loja.";
        gptResponse = {
          tamanho_final: normalizeSizeLabel(data.tamanho_calculado_algoritmo || "M"),
          explicacao: emptyHint,
          coerencia: "alta",
          confianca: 0.5,
          suggested_products: [],
        };
      } else {
        console.error("OpenAI indisponível ou resposta inválida; usando fallback por intenção:", aiErr);
        gptResponse = buildGuaranteedFallbackResponse(data, language);
      }
    }

    if (hasStylistCandidates && data.candidate_products) {
      let suggested = sanitizeSuggestedProducts(
        gptResponse.suggested_products,
        data.candidate_products
      );
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
    const finalResponse = enforceSizeFirstMessage(constrainedResponse, data);

    return new Response(
      JSON.stringify({
        success: true,
        data: finalResponse,
        interaction_count: interactionCount + 1,
        meta: { assistant_source: assistantSource },
        _validate_size_rev: "2026-05-15-gender-explicacao",
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
        _validate_size_rev: "2026-05-15-gender-explicacao",
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
