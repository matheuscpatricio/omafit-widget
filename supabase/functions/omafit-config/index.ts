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
    const publicId = url.searchParams.get('public_id');
    const shop = url.searchParams.get('shop');

    if (!publicId && !shop) {
      throw new Error('public_id ou shop é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let query = supabaseClient
      .from('widget_keys')
      .select('public_id, link_text, store_name, store_logo, font_family, primary_color, link_color, popup_color, background_color, text_color, overlay_color')
      .eq('status', 'active');

    if (publicId) {
      query = query.eq('public_id', publicId);
    } else if (shop) {
      query = query.eq('domain', shop);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error('Erro ao buscar configuração do widget');
    }

    if (!data) {
      throw new Error('Widget não encontrado ou inativo');
    }

    const config = {
      publicId: data.public_id,
      linkText: data.link_text || 'Experimentar virtualmente',
      storeName: data.store_name || '',
      storeLogo: data.store_logo || '',
      fontFamily: data.font_family || 'Outfit, sans-serif',
      colors: {
        primary: data.primary_color || data.link_color || '#810707',
        background: data.background_color || '#ffffff',
        text: data.text_color || data.link_color || '#810707',
        overlay: data.overlay_color || '#810707CC'
      }
    };

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
