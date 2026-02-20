import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = "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";

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
  language?: string;
  complementary_product?: {
    name: string;
    category: string;
    image_url: string;
  };
}

interface GPTResponse {
  tamanho_final: string;
  explicacao: string;
  coerencia: string;
  confianca: number;
}

function getSystemPrompt(language: string): string {
  const prompts: Record<string, string> = {
    pt: `Você é um assistente técnico especializado em ajuste de roupas e análise corporal.
Sua função é:

- Validar coerência das medidas corporais fornecidas.
- Considerar o nível de elasticidade da peça.
- Confirmar ou ajustar o tamanho recomendado pelo algoritmo.
- Priorizar segurança no ajuste.
- Nunca inventar dados.
- Nunca extrapolar além das informações fornecidas.
- Não usar linguagem vaga como "talvez" ou "pode ser".
- Manter resposta objetiva, clara e profissional.
- Responder SEMPRE em português.

REGRA CRÍTICA SOBRE AJUSTE DE TAMANHO:
- Se você discordar do tamanho sugerido pelo algoritmo, NÃO mencione o tamanho anterior calculado.
- Apresente APENAS o tamanho que você considera apropriado e explique o motivo dessa recomendação.
- Nunca diga "o algoritmo sugeriu X mas recomendo Y" - apenas diga "recomendo Y porque..."

IMPORTANTE: Sua resposta deve ser um JSON válido com esta estrutura exata:
{
  "tamanho_final": "P/M/G/GG/etc",
  "explicacao": "explicação concisa e profissional",
  "coerencia": "alta/média/baixa",
  "confianca": 0.0-1.0
}`,
    es: `Eres un asistente técnico especializado en ajuste de prendas y análisis corporal.
Tu función es:

- Validar la coherencia de las medidas corporales proporcionadas.
- Considerar el nivel de elasticidad de la prenda.
- Confirmar o ajustar la talla recomendada por el algoritmo.
- Priorizar la seguridad en el ajuste.
- Nunca inventar datos.
- Nunca extrapolar más allá de la información proporcionada.
- No usar lenguaje vago como "tal vez" o "puede ser".
- Mantener respuesta objetiva, clara y profesional.
- Responder SIEMPRE en español.

REGLA CRÍTICA SOBRE AJUSTE DE TALLA:
- Si no estás de acuerdo con la talla sugerida por el algoritmo, NO menciones la talla anterior calculada.
- Presenta SOLO la talla que consideras apropiada y explica el motivo de esa recomendación.
- Nunca digas "el algoritmo sugirió X pero recomiendo Y" - solo di "recomiendo Y porque..."

IMPORTANTE: Tu respuesta debe ser un JSON válido con esta estructura exacta:
{
  "tamanho_final": "S/M/L/XL/etc",
  "explicacao": "explicación concisa y profesional",
  "coerencia": "alta/media/baja",
  "confianca": 0.0-1.0
}`,
    en: `You are a technical assistant specialized in clothing fit and body analysis.
Your function is:

- Validate consistency of provided body measurements.
- Consider the elasticity level of the garment.
- Confirm or adjust the size recommended by the algorithm.
- Prioritize fit safety.
- Never invent data.
- Never extrapolate beyond the information provided.
- Don't use vague language like "maybe" or "might be".
- Keep response objective, clear and professional.
- Always respond in English.

CRITICAL RULE ABOUT SIZE ADJUSTMENT:
- If you disagree with the size suggested by the algorithm, DO NOT mention the previous calculated size.
- Present ONLY the size you consider appropriate and explain the reason for that recommendation.
- Never say "the algorithm suggested X but I recommend Y" - just say "I recommend Y because..."

IMPORTANT: Your response must be valid JSON with this exact structure:
{
  "tamanho_final": "XS/S/M/L/XL/etc",
  "explicacao": "concise and professional explanation",
  "coerencia": "high/medium/low",
  "confianca": 0.0-1.0
}`
  };

  return prompts[language] || prompts['en'];
}

async function callOpenAI(userPrompt: string, language: string = 'pt'): Promise<GPTResponse> {
  try {
    const systemPrompt = getSystemPrompt(language);

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
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const parsed = JSON.parse(content);
    return parsed as GPTResponse;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw error;
  }
}

function buildValidationPrompt(data: ValidateSizeRequest): string {
  return `Analise as seguintes medidas corporais e valide o tamanho recomendado:

Altura: ${data.altura_cm} cm
Peso: ${data.peso_kg} kg
Peito: ${data.peito_cm} cm
Cintura: ${data.cintura_cm} cm
Quadril: ${data.quadril_cm} cm

Categoria da peça: ${data.categoria}
Elasticidade: ${data.elasticidade}
Tamanho calculado pelo algoritmo: ${data.tamanho_calculado_algoritmo}

Valide a coerência das medidas e confirme ou ajuste o tamanho recomendado.`;
}

function buildComplementaryPrompt(data: ValidateSizeRequest): string {
  const product = data.complementary_product;
  if (!product) {
    return `Com base no perfil do usuário (Altura: ${data.altura_cm}cm, tamanho ${data.tamanho_calculado_algoritmo}), sugira um tipo de peça complementar que combinaria bem e explique brevemente o porquê da combinação.`;
  }

  return `Com base no perfil do usuário (Altura: ${data.altura_cm}cm, tamanho ${data.tamanho_calculado_algoritmo} em ${data.categoria}), analise esta peça complementar:

Produto: ${product.name}
Categoria: ${product.category}

Explique em poucas palavras por que esta peça combina bem com o perfil do usuário e crie um texto persuasivo mas profissional para incentivá-lo a conhecer o produto.

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "sua explicação sobre a combinação",
  "coerencia": "alta",
  "confianca": 0.95
}`;
}

function buildAddToCartPrompt(data: ValidateSizeRequest, language: string): string {
  const messages: Record<string, string> = {
    pt: `O usuário confirmou o tamanho ${data.tamanho_calculado_algoritmo}.

Crie uma mensagem persuasiva e amigável incentivando-o a adicionar o produto ao carrinho.
Seja breve (máximo 2-3 linhas), use um tom conversacional e profissional.
Mencione benefícios como: confiança no tamanho, experiência try-on, etc.

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "mensagem persuasiva para adicionar ao carrinho",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `El usuario confirmó la talla ${data.tamanho_calculado_algoritmo}.

Crea un mensaje persuasivo y amigable incentivándolo a agregar el producto al carrito.
Sé breve (máximo 2-3 líneas), usa un tono conversacional y profesional.
Menciona beneficios como: confianza en la talla, experiencia try-on, etc.

Retorna en formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "mensaje persuasivo para agregar al carrito",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    en: `The user confirmed size ${data.tamanho_calculado_algoritmo}.

Create a persuasive and friendly message encouraging them to add the product to cart.
Be brief (max 2-3 lines), use a conversational and professional tone.
Mention benefits like: size confidence, try-on experience, etc.

Return in JSON format:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "persuasive message to add to cart",
  "coerencia": "alta",
  "confianca": 1.0
}`
  };

  return messages[language] || messages['en'];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const data: ValidateSizeRequest = await req.json();

    // Validar dados obrigatórios
    if (!data.altura_cm || !data.peso_kg || !data.tamanho_calculado_algoritmo) {
      return new Response(
        JSON.stringify({
          error: "Dados obrigatórios faltando",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Limitar a 5 interações por sessão
    const interactionCount = data.interaction_count || 0;
    if (interactionCount >= 5) {
      return new Response(
        JSON.stringify({
          error: "Limite de interações atingido",
          message: "Você atingiu o limite de 5 interações por sessão.",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Construir prompt baseado na intenção
    let userPrompt: string;
    const language = data.language || 'pt';

    if (data.intencao_usuario === "sugerir_combinacoes") {
      userPrompt = buildComplementaryPrompt(data);
    } else if (data.intencao_usuario === "induzir_adicionar_carrinho") {
      userPrompt = buildAddToCartPrompt(data, language);
    } else {
      userPrompt = buildValidationPrompt(data);
    }

    // Chamar OpenAI
    const gptResponse = await callOpenAI(userPrompt, language);

    return new Response(
      JSON.stringify({
        success: true,
        data: gptResponse,
        interaction_count: interactionCount + 1,
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

    return new Response(
      JSON.stringify({
        error: "Erro ao processar validação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
