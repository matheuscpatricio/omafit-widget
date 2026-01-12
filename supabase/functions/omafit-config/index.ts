import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      throw new Error('shop domain é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let query = supabaseClient
      .from('widget_configurations')
      .select('shop_domain, link_text, store_logo, primary_color, widget_enabled')
      .eq('widget_enabled', true);

    if (shop) {
      query = query.eq('shop_domain', shop);
    } else {
      throw new Error('shop domain é obrigatório para widget_configurations');
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error('Erro ao buscar configuração do widget');
    }

    if (!data) {
      throw new Error('Widget não encontrado ou inativo');
    }

    console.log('🖼️ Logo encontrado no banco:', data.store_logo);

    const config = {
      publicId: shop || data.shop_domain,
      linkText: data.link_text || 'Experimentar virtualmente',
      storeName: '',
      storeLogo: data.store_logo || '',
      fontFamily: 'Outfit, sans-serif',
      colors: {
        primary: data.primary_color || '#810707',
        background: '#ffffff',
        text: data.primary_color || '#810707',
        overlay: (data.primary_color || '#810707') + 'CC'
      }
    };

    console.log('📤 Configuração sendo retornada:', JSON.stringify(config));

    return new Response(
      JSON.stringify(config),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Error in omafit-config:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});