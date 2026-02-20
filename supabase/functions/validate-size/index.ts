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
  should_end_conversation?: boolean;
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

REGRA CRÍTICA SOBRE MEDIDAS:
- NUNCA mencione medidas exatas em centímetros (ex: "peito de 110cm", "cintura de 85cm").
- Use SEMPRE descrições qualitativas naturais como: "peito largo", "peito estreito", "cintura fina", "cintura larga", "quadril amplo", "quadril estreito", "corpo atlético", "corpo esbelto", etc.
- Seja natural e conversacional, como um consultor de moda falaria.

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

REGLA CRÍTICA SOBRE MEDIDAS:
- NUNCA menciones medidas exactas en centímetros (ej: "pecho de 110cm", "cintura de 85cm").
- Usa SIEMPRE descripciones cualitativas naturales como: "pecho ancho", "pecho estrecho", "cintura fina", "cintura ancha", "cadera amplia", "cadera estrecha", "cuerpo atlético", "cuerpo esbelto", etc.
- Sé natural y conversacional, como hablaría un consultor de moda.

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

CRITICAL RULE ABOUT MEASUREMENTS:
- NEVER mention exact measurements in centimeters (e.g., "110cm chest", "85cm waist").
- ALWAYS use natural qualitative descriptions like: "broad chest", "narrow chest", "slim waist", "wide waist", "wide hips", "narrow hips", "athletic body", "slender body", etc.
- Be natural and conversational, as a fashion consultant would speak.

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
    return JSON.parse(content);
  } catch (error) {
    console.error("Error validating message:", error);
    // Em caso de erro, permitir a mensagem
    return { is_appropriate: true, response_message: "" };
  }
}

function buildCustomMessagePrompt(data: ValidateSizeRequest, language: string): string {
  const messages: Record<string, string> = {
    pt: `O usuário fez a seguinte pergunta sobre o produto/tamanho:

"${data.custom_message}"

Contexto:
- Tamanho recomendado: ${data.tamanho_calculado_algoritmo}
- Categoria: ${data.categoria}
- Elasticidade: ${data.elasticidade}

Responda a pergunta de forma útil, profissional e breve (máximo 3-4 linhas).
Se a pergunta for sobre tamanho, reforce a recomendação do tamanho ${data.tamanho_calculado_algoritmo}.
Mantenha o foco em ajudar o usuário a tomar a decisão de compra.

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "sua resposta à pergunta do usuário",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `El usuario hizo la siguiente pregunta sobre el producto/talla:

"${data.custom_message}"

Contexto:
- Talla recomendada: ${data.tamanho_calculado_algoritmo}
- Categoría: ${data.categoria}
- Elasticidad: ${data.elasticidade}

Responde la pregunta de forma útil, profesional y breve (máximo 3-4 líneas).
Si la pregunta es sobre talla, refuerza la recomendación de la talla ${data.tamanho_calculado_algoritmo}.
Mantén el foco en ayudar al usuario a tomar la decisión de compra.

Retorna en formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "tu respuesta a la pregunta del usuario",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    en: `The user asked the following question about the product/size:

"${data.custom_message}"

Context:
- Recommended size: ${data.tamanho_calculado_algoritmo}
- Category: ${data.categoria}
- Elasticity: ${data.elasticidade}

Answer the question in a helpful, professional and brief way (max 3-4 lines).
If the question is about size, reinforce the recommendation of size ${data.tamanho_calculado_algoritmo}.
Keep focus on helping the user make the purchase decision.

Return in JSON format:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "your answer to the user's question",
  "coerencia": "alta",
  "confianca": 1.0
}`
  };

  return messages[language] || messages['en'];
}

function buildAddToCartPrompt(data: ValidateSizeRequest, language: string): string {
  const messages: Record<string, string> = {
    pt: `O tamanho recomendado é ${data.tamanho_calculado_algoritmo}.

Crie uma mensagem persuasiva e amigável incentivando o usuário a adicionar o produto ao carrinho.
Seja breve (máximo 2-3 linhas), use um tom conversacional e profissional.
Mencione benefícios como: confiança no tamanho, experiência try-on, ajuste perfeito, etc.

IMPORTANTE: Se você considera que um tamanho diferente de ${data.tamanho_calculado_algoritmo} seria mais adequado, informe o tamanho ideal no campo "tamanho_final". Não use asteriscos ou formatação especial ao mencionar o tamanho - apenas escreva o tamanho naturalmente no texto.

Retorne no formato JSON:
{
  "tamanho_final": "tamanho que você considera ideal (pode ser diferente do calculado)",
  "explicacao": "mensagem persuasiva para adicionar ao carrinho",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `La talla recomendada es ${data.tamanho_calculado_algoritmo}.

Crea un mensaje persuasivo y amigable incentivando al usuario a agregar el producto al carrito.
Sé breve (máximo 2-3 líneas), usa un tono conversacional y profesional.
Menciona beneficios como: confianza en la talla, experiencia try-on, ajuste perfecto, etc.

IMPORTANTE: Si consideras que una talla diferente de ${data.tamanho_calculado_algoritmo} sería más adecuada, informa la talla ideal en el campo "tamanho_final". No uses asteriscos ni formato especial al mencionar la talla - solo escribe la talla naturalmente en el texto.

Retorna en formato JSON:
{
  "tamanho_final": "talla que consideras ideal (puede ser diferente de la calculada)",
  "explicacao": "mensaje persuasivo para agregar al carrito",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    en: `The recommended size is ${data.tamanho_calculado_algoritmo}.

Create a persuasive and friendly message encouraging the user to add the product to cart.
Be brief (max 2-3 lines), use a conversational and professional tone.
Mention benefits like: size confidence, try-on experience, perfect fit, etc.

IMPORTANT: If you think a different size than ${data.tamanho_calculado_algoritmo} would be more appropriate, inform the ideal size in the "tamanho_final" field. Don't use asterisks or special formatting when mentioning the size - just write the size naturally in the text.

Return in JSON format:
{
  "tamanho_final": "size you consider ideal (can be different from calculated)",
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
      userPrompt = buildCustomMessagePrompt(data, language);
    } else if (data.intencao_usuario === "sugerir_combinacoes") {
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
