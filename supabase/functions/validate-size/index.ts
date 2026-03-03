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
- Use frases curtas e diretas com energia positiva
- Celebre características únicas do corpo de forma positiva e NEUTRA (sem mencionar gênero)
- Transmita confiança mas sem arrogância
- Foque em como a peça vai valorizar o cliente
- NUNCA mencione gênero específico (masculino, feminino, homem, mulher, etc)
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
- Usa frases cortas y directas con energía positiva
- Celebra características únicas del cuerpo de forma positiva y NEUTRA (sin mencionar género)
- Transmite confianza pero sin arrogancia
- Enfócate en cómo la prenda va a realzar al cliente
- NUNCA menciones género específico (masculino, femenino, hombre, mujer, etc)
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
- Use short, direct phrases with positive energy
- Celebrate unique body characteristics in a positive and NEUTRAL way (without mentioning gender)
- Convey confidence without arrogance
- Focus on how the piece will enhance the client
- NEVER mention specific gender (male, female, man, woman, etc)
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

  if (!product) {
    return `Com base no perfil do usuário (Altura: ${data.altura_cm}cm, tamanho ${data.tamanho_calculado_algoritmo}), sugira um tipo de peça complementar${storeContext} que combinaria bem e explique brevemente o porquê da combinação.${data.shop_name ? ` Você pode mencionar a loja "${data.shop_name}" de forma natural se for relevante.` : ''}
${productCatalogContext}`;
  }

  return `Com base no perfil do usuário (Altura: ${data.altura_cm}cm, tamanho ${data.tamanho_calculado_algoritmo} em ${data.categoria}), analise esta peça complementar${storeContext}:

Produto: ${product.name}
Categoria: ${product.category}
${productCatalogContext}

Explique em poucas palavras por que esta peça combina bem com o perfil do usuário e crie um texto persuasivo mas profissional para incentivá-lo a conhecer o produto.${data.shop_name ? ` Você pode mencionar a loja "${data.shop_name}" de forma natural se for relevante.` : ''}

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
  const storeContext = data.shop_name ? ` da ${data.shop_name}` : '';
  const productInfo = data.product_name ? `\n- Produto: ${data.product_name}` : '';
  const productDesc = data.product_description ? `\n- Descrição do produto: ${data.product_description}` : '';
  const productCatalogContext = buildProductCatalogContext(data, language);

  const messages: Record<string, string> = {
    pt: `O usuário fez a seguinte pergunta sobre o produto${storeContext}:

"${data.custom_message}"

Contexto:
- Tamanho recomendado: ${data.tamanho_calculado_algoritmo}
- Categoria: ${data.categoria}
- Elasticidade: ${data.elasticidade}${data.shop_name ? `\n- Marca/Loja: ${data.shop_name}` : ''}${productInfo}${productDesc}
${productCatalogContext}

REGRAS IMPORTANTES:
1. Se a pergunta for sobre o produto/descrição, use as informações acima para responder de forma útil
2. Se mencionar o tamanho, faça APENAS UMA VEZ no início da resposta
3. Depois continue naturalmente SEM repetir o tamanho
4. Se a pergunta for sobre a marca/loja, mencione "${data.shop_name}" de forma natural e positiva
5. Responda de forma útil, persuasiva mas MUITO breve (máximo 2-3 linhas)
6. Sempre induza à compra de forma sutil ao final
7. Mantenha o foco em ajudar o usuário a tomar a decisão de compra

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "sua resposta curta e persuasiva à pergunta do usuário",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `El usuario hizo la siguiente pregunta sobre el producto${storeContext}/talla:

"${data.custom_message}"

Contexto:
- Talla recomendada: ${data.tamanho_calculado_algoritmo}
- Categoría: ${data.categoria}
- Elasticidad: ${data.elasticidade}${data.shop_name ? `\n- Tienda: ${data.shop_name}` : ''}
${productCatalogContext}

REGLAS IMPORTANTES:
1. Si mencionas la talla, hazlo SOLO UNA VEZ al inicio de la respuesta
2. Después continúa naturalmente SIN repetir la talla${data.shop_name ? ` (puedes mencionar la tienda "${data.shop_name}" de forma natural si es relevante)` : ''}
3. Responde de forma útil, profesional y breve (máximo 3-4 líneas)
4. Mantén el foco en ayudar al usuario a tomar la decisión de compra

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
${productCatalogContext}

IMPORTANT RULES:
1. If you mention the size, do it ONLY ONCE at the beginning of your response
2. Then continue naturally WITHOUT repeating the size${data.shop_name ? ` (you can mention the store "${data.shop_name}" naturally if relevant)` : ''}
3. Answer in a helpful, professional and brief way (max 3-4 lines)
4. Keep focus on helping the user make the purchase decision

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

  const messages: Record<string, string> = {
    pt: `Você precisa criar uma mensagem persuasiva incentivando o usuário a adicionar o produto${storeNameContext} ao carrinho.

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

ESTRUTURA DA MENSAGEM (OBRIGATÓRIA):
1ª FRASE: Confirme o tamanho ideal e explique BREVEMENTE o motivo baseado nas medidas/corpo
2ª FRASE: Mencione benefício do produto e induza ao carrinho

REGRAS CRÍTICAS (NÃO IGNORE!):
1. A palavra "tamanho" ou o valor "${data.tamanho_calculado_algoritmo}" deve aparecer APENAS UMA VEZ em toda a mensagem
2. Coloque o tamanho SOMENTE na primeira frase
3. Na primeira frase, explique de forma BREVE e QUALITATIVA o motivo (ex: "combina com suas proporções", "ideal para seu tipo de corpo atlético", "perfeito para sua silhueta")
4. NUNCA mencione medidas em centímetros - use descrições qualitativas
5. Seja MUITO breve e direto: máximo 2-3 linhas no total
6. Não use asteriscos, negrito ou formatação especial
7. Use tom conversacional, persuasivo mas profissional
8. Sempre induza ao carrinho na última frase

EXEMPLO CORRETO:
"Seu tamanho ideal é M, perfeito para suas proporções harmoniosas! ${data.product_name ? `Este ${data.product_name}` : 'Esta peça'} vai valorizar seu estilo - adicione ao carrinho agora!"

EXEMPLO ERRADO (NÃO FAÇA ISSO):
"Seu tamanho ideal é M! O tamanho M oferece ajuste perfeito. Adicione o tamanho M ao carrinho."

Retorne no formato JSON:
{
  "tamanho_final": "${data.tamanho_calculado_algoritmo}",
  "explicacao": "mensagem persuasiva com motivo breve + indução ao carrinho",
  "coerencia": "alta",
  "confianca": 1.0
}`,
    es: `Necesitas crear un mensaje persuasivo incentivando al usuario a agregar el producto${storeNameContext} al carrito.

CONTEXTO:
- Talla recomendada: ${data.tamanho_calculado_algoritmo}
${productCatalogContext}

REGLAS CRÍTICAS (¡NO IGNORES!):
1. La palabra "talla" o el valor "${data.tamanho_calculado_algoritmo}" debe aparecer SOLO UNA VEZ en todo el mensaje
2. Coloca la talla SOLAMENTE en la primera frase (ejemplo: "¡Tu talla ideal es ${data.tamanho_calculado_algoritmo}!")
3. Después de la primera frase, NUNCA MÁS menciones la talla o números de talla
4. Continúa naturalmente hablando sobre beneficios: confianza, experiencia try-on, ajuste perfecto${data.shop_name ? `\n5. Puedes mencionar la tienda "${data.shop_name}" de forma natural si es relevante` : ''}
5. Sé breve: máximo 2-3 líneas en total
6. No uses asteriscos, negrita o formato especial
7. Usa tono conversacional y profesional

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

CONTEXT:
- Recommended size: ${data.tamanho_calculado_algoritmo}
${productCatalogContext}

CRITICAL RULES (DO NOT IGNORE!):
1. The word "size" or the value "${data.tamanho_calculado_algoritmo}" must appear ONLY ONCE in the entire message
2. Put the size ONLY in the first sentence (example: "Your ideal size is ${data.tamanho_calculado_algoritmo}!")
3. After the first sentence, NEVER mention the size or size numbers again
4. Continue naturally talking about benefits: confidence, try-on experience, perfect fit${data.shop_name ? `\n5. You can mention the store "${data.shop_name}" naturally if relevant` : ''}
5. Be brief: max 2-3 lines total
6. Don't use asterisks, bold or special formatting
7. Use conversational and professional tone

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const data: ValidateSizeRequest = await req.json();

    console.log('📦 DADOS RECEBIDOS EM VALIDATE-SIZE:');
    console.log('   • shop_name:', data.shop_name || 'não fornecido');
    console.log('   • shop_domain:', data.shop_domain || 'não fornecido');
    console.log('   • altura_cm:', data.altura_cm);
    console.log('   • peso_kg:', data.peso_kg);
    console.log('   • tamanho_calculado:', data.tamanho_calculado_algoritmo);
    console.log('   • intencao_usuario:', data.intencao_usuario || 'validar tamanho');
    console.log('   • custom_message:', data.custom_message || 'não fornecido');
    console.log('   • language:', data.language || 'pt');
    console.log('   • session_id:', data.session_id || 'não fornecido');
    console.log('   • interaction_count:', data.interaction_count || 0);

    // Validar dados obrigatórios
    if (!data.altura_cm || !data.peso_kg || !data.tamanho_calculado_algoritmo) {
      console.error('❌ Dados obrigatórios faltando:', {
        altura_cm: data.altura_cm,
        peso_kg: data.peso_kg,
        tamanho_calculado: data.tamanho_calculado_algoritmo
      });
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

    // Limitar a 2 interações por sessão
    const interactionCount = data.interaction_count || 0;
    if (interactionCount >= 2) {
      return new Response(
        JSON.stringify({
          error: "Limite de interações atingido",
          message: "Você atingiu o limite de 2 interações por sessão.",
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
      userPrompt = buildComplementaryPrompt(data, language);
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
