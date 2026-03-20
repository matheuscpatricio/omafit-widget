import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY =
  Deno.env.get('OPENAI_API_KEY') ||
  "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";

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
    pt: `Você é um consultor de vendas pessoal, caloroso e persuasivo, especializado em calçados.

SUA PERSONALIDADE:
- Empático e envolvente, como um vendedor premium muito bom
- Natural, confiante e humano, nunca robótico
- Objetivo, mas com calor e energia positiva

REGRAS DE COMUNICAÇÃO:
- Responda SEMPRE em português.
- Nunca use tom de dúvida: não use "talvez", "pode ser", "acho", "provavelmente" ou equivalentes.
- Nunca mencione gênero do usuário.
- Nunca mencione visão computacional, análise técnica, IA, algoritmo, câmera, centímetros, comprimento do pé ou método de medição.
- Use frases curtas, com ritmo natural e cara de conversa real.
- Sempre responda algo útil.
- Quando fizer sentido, mencione marca/loja e produto de forma natural.
- Se a pergunta for sobre descrição ou detalhes, use a descrição recebida sem copiar tudo de forma seca.
- Se a descrição não vier, diga brevemente que não recebeu mais detalhes do produto nesta conversa e redirecione para a compra.
- Soe parecido com um bom assistente comercial: breve, seguro e convidativo.

REGRAS SOBRE TAMANHO:
- Use o tamanho recomendado com confiança.
- Se citar o tamanho, cite apenas uma vez.
- Não repita a mesma estrutura em toda resposta.

ESTILO DE RESPOSTA:
- No resultado inicial, soe como alguém que acabou de separar o tamanho ideal.
- Em perguntas do chat, responda diretamente ao que foi perguntado e termine aproximando da compra.
- Varie a construção das frases para não parecer texto pronto.
- Respostas com no máximo 2 frases curtas.

FORMATO DE SAÍDA:
Retorne JSON válido:
{
  "tamanho_final": "BR 39",
  "explicacao": "mensagem calorosa, breve e natural",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `Eres un consultor de ventas personal, cálido y persuasivo, especializado en calzado.

TU PERSONALIDAD:
- Empático y envolvente, como un vendedor premium muy bueno
- Natural, seguro y humano, nunca robótico
- Directo, pero con calidez y energía positiva

REGLAS DE COMUNICACIÓN:
- Responde SIEMPRE en español.
- Nunca uses tono de duda: no uses "tal vez", "puede ser", "creo", "probablemente" ni equivalentes.
- Nunca menciones el género del usuario.
- Nunca menciones visión computacional, análisis técnico, IA, cámara, centímetros, longitud del pie o método de medición.
- Usa frases cortas, con ritmo natural y tono de conversación real.
- Siempre responde algo útil.
- Cuando tenga sentido, menciona la marca/tienda y el producto de forma natural.
- Si la pregunta es sobre descripción o detalles, usa la descripción recibida sin copiarla de forma seca.
- Si la descripción no está disponible, di brevemente que no recibiste más detalles del producto en esta conversación y redirige a la compra.
- Debe sonar como un muy buen asistente comercial: breve, seguro y convincente.

REGLAS SOBRE LA TALLA:
- Usa la talla recomendada con confianza.
- Si mencionas la talla, hazlo solo una vez.
- No repitas la misma estructura en todas las respuestas.

ESTILO DE RESPUESTA:
- En el resultado inicial, suena como alguien que acaba de separar la talla ideal.
- En preguntas del chat, responde directamente a lo que se preguntó y cierra acercando a la compra.
- Varía la construcción de las frases para no parecer texto prefabricado.
- Máximo 2 frases cortas.

FORMATO DE SALIDA:
Devuelve JSON válido:
{
  "tamanho_final": "BR 39",
  "explicacao": "mensaje cálido, breve y natural",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    en: `You are a warm and persuasive personal sales consultant specialized in footwear.

YOUR PERSONALITY:
- Empathetic and engaging, like a very good premium sales assistant
- Natural, confident and human, never robotic
- Direct, but with warmth and positive energy

COMMUNICATION RULES:
- Always answer in English.
- Never use doubtful language: do not say "maybe", "might", "I think", "probably" or equivalents.
- Never mention the user's gender.
- Never mention computer vision, technical analysis, AI, camera, centimeters, foot length or the measurement method.
- Use short sentences with natural rhythm, like a real conversation.
- Always answer something useful.
- Mention the brand/store and product naturally when it helps.
- If the question is about product description or details, use the provided description without sounding like pasted catalog text.
- If no description is available, briefly say you have not received more product details in this conversation and redirect toward the purchase.
- Sound like a strong sales assistant: brief, confident and inviting.

SIZE RULES:
- Use the recommended size confidently.
- If you mention the size, mention it only once.
- Do not repeat the same structure in every answer.

RESPONSE STYLE:
- For the initial result, sound like someone who just picked the ideal size.
- For chat questions, answer what was asked first and then guide toward the purchase.
- Vary sentence construction so it does not feel templated.
- Maximum 2 short sentences.

OUTPUT FORMAT:
Return valid JSON:
{
  "tamanho_final": "BR 39",
  "explicacao": "warm, brief and natural message",
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

Responda à pergunta do cliente como um ótimo assistente comercial.
Se a pergunta pedir detalhes do produto, use a descrição recebida de forma natural.
Se mencionar o tamanho, faça isso apenas uma vez.
Não responda com estrutura fixa do tipo "Produto X: descrição. O tamanho Y é o ideal."
Soe mais humano, leve e convincente, parecido com um bom vendedor do chat do widget principal.
Feche aproximando da compra de forma natural.`,
      es: `Pregunta del cliente:
"${ask}"

Contexto:
- Tienda/marca: ${storeName}
- Producto: ${productName}
- Talla recomendada: ${size}
${descriptionLine}

Responde a la pregunta del cliente como un gran asistente comercial.
Si la pregunta pide detalles del producto, usa la descripción recibida de forma natural.
Si mencionas la talla, hazlo solo una vez.
No respondas con una estructura fija como "Producto X: descripción. La talla Y es la ideal."
Debe sonar más humano, ligero y convincente, parecido al chat del widget principal.
Termina acercando a la compra de forma natural.`,
      en: `Customer question:
"${ask}"

Context:
- Store/brand: ${storeName}
- Product: ${productName}
- Recommended size: ${size}
${descriptionLine}

Answer the customer's question like a strong sales assistant.
If the question asks for product details, use the description provided in a natural way.
If you mention the size, do it only once.
Do not answer with a rigid structure like "Product X: description. Size Y is the ideal one."
It should sound more human, fluid and persuasive, similar to the main widget chat.
End by naturally guiding toward the purchase.`,
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
- soar pessoal, natural e calorosa
- confirmar o tamanho ideal com confiança
- falar do produto e da marca de forma natural
- não mencionar método de cálculo
- não soar como texto automático ou catálogo
- incentivar a adicionar ao carrinho

Evite respostas muito secas como:
"${productName} da ${storeName}: ... O tamanho ${size} é o ideal."

Prefira algo mais humano, como quem realmente acabou de separar a melhor opção para a pessoa.`,
    es: `Crea el primer mensaje del resultado para el chat final del widget de calzado.

Contexto:
- Tienda/marca: ${storeName}
- Producto: ${productName}
- Talla recomendada: ${size}
- Descripción del producto: ${productDescription || 'no recibida en esta conversación'}

El mensaje debe:
- sonar personal, natural y cálido
- confirmar la talla ideal con confianza
- hablar del producto y de la marca de forma natural
- no mencionar el método de cálculo
- no sonar como texto automático o catálogo
- incentivar a agregar al carrito

Evita respuestas demasiado secas como:
"${productName} de ${storeName}: ... La talla ${size} es la ideal."

Prefiere algo más humano, como si realmente acabaras de separar la mejor opción para la persona.`,
    en: `Create the first result message for the final footwear widget chat.

Context:
- Store/brand: ${storeName}
- Product: ${productName}
- Recommended size: ${size}
- Product description: ${productDescription || 'not provided in this conversation'}

The message must:
- sound personal, natural and warm
- confirm the ideal size confidently
- mention the product and brand naturally
- not mention the calculation method
- not sound like automated or catalog text
- encourage adding to cart

Avoid dry responses like:
"${productName} from ${storeName}: ... ${size} is the right size."

Prefer something more human, like someone who just picked the best option for the person.`,
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
        explicacao: `${storeName} recomienda ${size} para ${productName}. Tiene un acabado que se ve muy bien en esta propuesta; si te gusta, agrégalo al carrito para seguir.`,
        coerencia: 'alta',
        confianca: 0.94,
      };
    }

    if (askedSomething) {
      return {
        tamanho_final: size,
        explicacao: `${storeName} recomienda ${size} para ${productName}. Todavía no recibí más detalles de este producto en esta conversación, pero es una gran elección para seguir con tu compra.`,
        coerencia: 'alta',
        confianca: 0.9,
      };
    }

    return {
      tamanho_final: size,
      explicacao: `${storeName} recomienda ${size} para ${productName}. Va a sentar muy bien y ya puedes llevarlo al carrito para continuar.`,
      coerencia: 'alta',
      confianca: 0.94,
    };
  }

  if (language === 'en') {
    if (askedSomething && description) {
      return {
        tamanho_final: size,
        explicacao: `${storeName} recommends ${size} for ${productName}. The finish and overall look make it a strong choice; add it to cart to keep going.`,
        coerencia: 'high',
        confianca: 0.94,
      };
    }

    if (askedSomething) {
      return {
        tamanho_final: size,
        explicacao: `${storeName} recommends ${size} for ${productName}. I have not received more product details in this conversation yet, but it is a strong pick to move forward with.`,
        coerencia: 'high',
        confianca: 0.9,
      };
    }

    return {
      tamanho_final: size,
      explicacao: `${storeName} recommends ${size} for ${productName}. It should feel like a great fit, so you can add it to cart and keep going.`,
      coerencia: 'high',
      confianca: 0.94,
    };
  }

  if (askedSomething && description) {
    return {
      tamanho_final: size,
      explicacao: `${storeName} recomenda ${size} para ${productName}. O acabamento e a proposta desse modelo combinam muito bem com a escolha; adicione ao carrinho para continuar.`,
      coerencia: 'alta',
      confianca: 0.94,
    };
  }

  if (askedSomething) {
    return {
      tamanho_final: size,
      explicacao: `${storeName} recomenda ${size} para ${productName}. Ainda não recebi mais detalhes deste produto nesta conversa, mas é uma escolha bem segura para seguir com a compra.`,
      coerencia: 'alta',
      confianca: 0.9,
    };
  }

  return {
    tamanho_final: size,
    explicacao: `${storeName} recomenda ${size} para ${productName}. Ficou uma escolha muito redonda, então você já pode adicionar ao carrinho para continuar.`,
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
