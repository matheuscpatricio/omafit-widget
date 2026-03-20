import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

interface FootwearChatRequest {
  recommended_size: string;
  intent?: 'initial_result' | 'custom_message';
  user_message?: string;
  session_id?: string;
  interaction_count?: number;
  shop_name?: string;
  shop_domain?: string;
  language?: 'pt' | 'es' | 'en' | string;
  product_name?: string;
  product_description?: string;
  collection_handle?: string;
}

interface GPTResponse {
  tamanho_final: string;
  explicacao: string;
  coerencia: string;
  confianca: number;
}

function getSystemPrompt(language: string): string {
  const prompts: Record<string, string> = {
    pt: `Você é um assistente de vendas especializado em calçados.

OBJETIVO:
- Ajudar a fechar a compra com respostas curtas, pessoais e claras.
- Falar de forma humana, simpática e segura.

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português.
- Nunca use tom de dúvida: não use "talvez", "pode ser", "acho", "provavelmente" ou equivalentes.
- Nunca mencione gênero do usuário.
- Nunca mencione visão computacional, análise técnica, IA, algoritmo, câmera, centímetros, comprimento do pé ou qualquer método de medição.
- Se a pergunta for sobre descrição/detalhes do produto, use a descrição recebida quando existir.
- Se a descrição não vier, diga brevemente que você ainda não recebeu mais detalhes do produto nesta conversa, sem inventar informações.
- Sempre responda algo útil, mesmo se a pergunta for vaga.
- Sempre mantenha foco em produto, tamanho ideal, confiança na escolha e compra.
- Sempre mencione a marca/loja e o produto de forma natural quando fizer sentido.
- A resposta deve ter no máximo 2 frases curtas.
- Induza a adicionar ao carrinho de forma natural no final.

REGRAS SOBRE TAMANHO:
- Use o tamanho recomendado com confiança.
- Se citar o tamanho, cite apenas uma vez.

FORMATO DE SAÍDA:
Retorne JSON válido:
{
  "tamanho_final": "BR 39",
  "explicacao": "mensagem curta, pessoal e amigável",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `Eres un asistente de ventas especializado en calzado.

OBJETIVO:
- Ayudar a cerrar la compra con respuestas cortas, personales y claras.
- Hablar de forma humana, simpática y segura.

REGLAS OBLIGATORIAS:
- Responde SIEMPRE en español.
- Nunca uses tono de duda: no uses "tal vez", "puede ser", "creo", "probablemente" ni equivalentes.
- Nunca menciones el género del usuario.
- Nunca menciones visión computacional, análisis técnico, IA, cámara, centímetros, longitud del pie ni el método de medición.
- Si la pregunta es sobre descripción/detalles del producto, usa la descripción recibida cuando exista.
- Si la descripción no está disponible, di brevemente que todavía no recibiste más detalles del producto en esta conversación, sin inventar información.
- Siempre responde algo útil, incluso si la pregunta es vaga.
- Mantén siempre el foco en el producto, la talla ideal, la confianza en la elección y la compra.
- Menciona la marca/tienda y el producto de forma natural cuando tenga sentido.
- La respuesta debe tener un máximo de 2 frases cortas.
- Invita a agregar al carrito de forma natural al final.

REGLAS SOBRE LA TALLA:
- Usa la talla recomendada con confianza.
- Si mencionas la talla, hazlo solo una vez.

FORMATO DE SALIDA:
Devuelve JSON válido:
{
  "tamanho_final": "BR 39",
  "explicacao": "mensaje corto, personal y amigable",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    en: `You are a sales assistant specialized in footwear.

GOAL:
- Help close the purchase with short, personal and clear answers.
- Sound human, friendly and confident.

MANDATORY RULES:
- Always answer in English.
- Never use doubtful language: do not say "maybe", "might", "I think", "probably" or equivalents.
- Never mention the user's gender.
- Never mention computer vision, technical analysis, AI, camera, centimeters, foot length or the measurement method.
- If the question is about product description/details, use the description provided when available.
- If no description is available, briefly say you have not received more product details in this conversation yet, without inventing information.
- Always answer something useful, even if the question is vague.
- Keep the focus on the product, the ideal size, confidence in the choice and purchase.
- Mention the brand/store and product naturally when it makes sense.
- The answer must be at most 2 short sentences.
- Naturally encourage adding to cart at the end.

SIZE RULES:
- Use the recommended size confidently.
- If you mention the size, mention it only once.

OUTPUT FORMAT:
Return valid JSON:
{
  "tamanho_final": "BR 39",
  "explicacao": "short, personal and friendly message",
  "coerencia": "high",
  "confianca": 1.0
}`,
  };

  return prompts[language] || prompts.en;
}

function buildPrompt(data: FootwearChatRequest, language: string): string {
  const productName = data.product_name || (language === 'es' ? 'este calzado' : language === 'en' ? 'this footwear' : 'este calçado');
  const storeName = data.shop_name || 'Omafit';
  const productDescription = data.product_description?.trim() || '';
  const size = data.recommended_size || 'BR 39';

  if (data.intent === 'custom_message' && data.user_message?.trim()) {
    const ask = data.user_message.trim();
    const descriptionLine = productDescription
      ? language === 'es'
        ? `- Descripción del producto: ${productDescription}`
        : language === 'en'
          ? `- Product description: ${productDescription}`
          : `- Descrição do produto: ${productDescription}`
      : language === 'es'
        ? '- Descripción del producto: no recibida en esta conversación'
        : language === 'en'
          ? '- Product description: not provided in this conversation'
          : '- Descrição do produto: não recebida nesta conversa';

    const prompts: Record<string, string> = {
      pt: `Pergunta do cliente:
"${ask}"

Contexto:
- Loja/marca: ${storeName}
- Produto: ${productName}
- Tamanho recomendado: ${size}
${descriptionLine}

Responda à pergunta do cliente de forma curta, pessoal e segura.
Se a pergunta pedir detalhes do produto, use a descrição recebida.
Se a descrição não trouxer a resposta exata, diga brevemente que você ainda não recebeu mais detalhes deste produto nesta conversa e redirecione para a compra.
Feche incentivando o carrinho.`,
      es: `Pregunta del cliente:
"${ask}"

Contexto:
- Tienda/marca: ${storeName}
- Producto: ${productName}
- Talla recomendada: ${size}
${descriptionLine}

Responde a la pregunta del cliente de forma corta, personal y segura.
Si la pregunta pide detalles del producto, usa la descripción recibida.
Si la descripción no trae la respuesta exacta, di brevemente que todavía no recibiste más detalles de este producto en esta conversación y redirige a la compra.
Termina incentivando el carrito.`,
      en: `Customer question:
"${ask}"

Context:
- Store/brand: ${storeName}
- Product: ${productName}
- Recommended size: ${size}
${descriptionLine}

Answer the customer's question in a short, personal and confident way.
If the question asks for product details, use the description provided.
If the description does not contain the exact answer, briefly say you have not received more details about this product in this conversation yet and redirect toward the purchase.
End by encouraging the cart.`,
    };

    return prompts[language] || prompts.en;
  }

  const prompts: Record<string, string> = {
    pt: `Crie a primeira mensagem do resultado para o chat final do widget de calçados.

Contexto:
- Loja/marca: ${storeName}
- Produto: ${productName}
- Tamanho recomendado: ${size}
- Descrição do produto: ${productDescription || 'não recebida nesta conversa'}

A mensagem deve:
- soar pessoal e amigável
- confirmar o tamanho ideal com confiança
- falar do produto e da marca de forma natural
- não mencionar método de cálculo
- incentivar a adicionar ao carrinho`,
    es: `Crea el primer mensaje del resultado para el chat final del widget de calzado.

Contexto:
- Tienda/marca: ${storeName}
- Producto: ${productName}
- Talla recomendada: ${size}
- Descripción del producto: ${productDescription || 'no recibida en esta conversación'}

El mensaje debe:
- sonar personal y amigable
- confirmar la talla ideal con confianza
- hablar del producto y de la marca de forma natural
- no mencionar el método de cálculo
- incentivar a agregar al carrito`,
    en: `Create the first result message for the final footwear widget chat.

Context:
- Store/brand: ${storeName}
- Product: ${productName}
- Recommended size: ${size}
- Product description: ${productDescription || 'not provided in this conversation'}

The message must:
- sound personal and friendly
- confirm the ideal size confidently
- mention the product and brand naturally
- not mention the calculation method
- encourage adding to cart`,
  };

  return prompts[language] || prompts.en;
}

async function callOpenAI(userPrompt: string, language: string): Promise<GPTResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
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
        { role: "system", content: getSystemPrompt(language) },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 220,
      temperature: 0.5,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty content');
  }

  return JSON.parse(content);
}

function buildFallbackResponse(data: FootwearChatRequest, language: string): GPTResponse {
  const size = data.recommended_size || 'BR 39';
  const productName = data.product_name || (language === 'es' ? 'este calzado' : language === 'en' ? 'this footwear' : 'este calçado');
  const storeName = data.shop_name || 'Omafit';
  const description = data.product_description?.trim() || '';
  const askedSomething = Boolean(data.user_message?.trim());

  if (language === 'es') {
    if (askedSomething && description) {
      return {
        tamanho_final: size,
        explicacao: `${productName} de ${storeName}: ${description} La talla ${size} es la indicada. Agrégalo al carrito para continuar con tu compra.`,
        coerencia: 'alta',
        confianca: 0.94,
      };
    }

    if (askedSomething) {
      return {
        tamanho_final: size,
        explicacao: `${storeName} recomienda ${size} para ${productName}. Todavía no recibí más detalles de este producto en esta conversación; agrégalo al carrito para continuar con tu compra.`,
        coerencia: 'alta',
        confianca: 0.9,
      };
    }

    return {
      tamanho_final: size,
      explicacao: `${storeName} recomienda ${size} para ${productName}. Va a quedar muy bien; agrégalo al carrito para continuar con tu compra.`,
      coerencia: 'alta',
      confianca: 0.94,
    };
  }

  if (language === 'en') {
    if (askedSomething && description) {
      return {
        tamanho_final: size,
        explicacao: `${productName} from ${storeName}: ${description} ${size} is the right size. Add it to cart to continue your purchase.`,
        coerencia: 'high',
        confianca: 0.94,
      };
    }

    if (askedSomething) {
      return {
        tamanho_final: size,
        explicacao: `${storeName} recommends ${size} for ${productName}. I have not received more product details in this conversation yet; add it to cart to continue your purchase.`,
        coerencia: 'high',
        confianca: 0.9,
      };
    }

    return {
      tamanho_final: size,
      explicacao: `${storeName} recommends ${size} for ${productName}. It should fit really well; add it to cart to continue your purchase.`,
      coerencia: 'high',
      confianca: 0.94,
    };
  }

  if (askedSomething && description) {
    return {
      tamanho_final: size,
      explicacao: `${productName} da ${storeName}: ${description} O tamanho ${size} é o ideal. Adicione ao carrinho para continuar sua compra.`,
      coerencia: 'alta',
      confianca: 0.94,
    };
  }

  if (askedSomething) {
    return {
      tamanho_final: size,
      explicacao: `${storeName} recomenda ${size} para ${productName}. Ainda não recebi mais detalhes deste produto nesta conversa; adicione ao carrinho para continuar sua compra.`,
      coerencia: 'alta',
      confianca: 0.9,
    };
  }

  return {
    tamanho_final: size,
    explicacao: `${storeName} recomenda ${size} para ${productName}. Vai ficar muito bom; adicione ao carrinho para continuar sua compra.`,
    coerencia: 'alta',
    confianca: 0.94,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  let requestData: FootwearChatRequest | null = null;

  try {
    const data: FootwearChatRequest = await req.json();
    requestData = data;

    const language =
      data.language === 'es' || data.language === 'en' || data.language === 'pt'
        ? data.language
        : 'pt';

    const userPrompt = buildPrompt(data, language);
    const gptResponse = await callOpenAI(userPrompt, language);

    return new Response(
      JSON.stringify({
        success: true,
        data: gptResponse,
        interaction_count: (data.interaction_count || 0) + 1,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('Error in validate-footwear-chat:', error);

    const language =
      requestData?.language === 'es' || requestData?.language === 'en' || requestData?.language === 'pt'
        ? requestData.language
        : 'pt';

    return new Response(
      JSON.stringify({
        success: true,
        data: buildFallbackResponse(requestData || { recommended_size: 'BR 39' }, language),
        interaction_count: (requestData?.interaction_count || 0) + 1,
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
