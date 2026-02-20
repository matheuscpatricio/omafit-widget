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

const SYSTEM_PROMPT = `Você é um assistente técnico especializado em ajuste de roupas e análise corporal.
Sua função é:

- Validar coerência das medidas corporais fornecidas.
- Considerar o nível de elasticidade da peça.
- Confirmar ou ajustar o tamanho recomendado pelo algoritmo.
- Priorizar segurança no ajuste.
- Nunca inventar dados.
- Nunca extrapolar além das informações fornecidas.
- Não usar linguagem vaga como "talvez" ou "pode ser".
- Manter resposta objetiva, clara e profissional.

IMPORTANTE: Sua resposta deve ser um JSON válido com esta estrutura exata:
{
  "tamanho_final": "P/M/G/GG/etc",
  "explicacao": "explicação concisa e profissional",
  "coerencia": "alta/média/baixa",
  "confianca": 0.0-1.0
}`;

async function callOpenAI(userPrompt: string): Promise<GPTResponse> {
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 250,
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

    // Limitar a 3 interações por sessão
    const interactionCount = data.interaction_count || 0;
    if (interactionCount >= 3) {
      return new Response(
        JSON.stringify({
          error: "Limite de interações atingido",
          message: "Você atingiu o limite de 3 interações por sessão.",
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

    if (data.intencao_usuario === "sugerir_combinacoes") {
      userPrompt = buildComplementaryPrompt(data);
    } else {
      userPrompt = buildValidationPrompt(data);
    }

    // Chamar OpenAI
    const gptResponse = await callOpenAI(userPrompt);

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
