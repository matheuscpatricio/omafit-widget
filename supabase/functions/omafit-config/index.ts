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
    const collectionId = url.searchParams.get('collection_id');
    const gender = url.searchParams.get('gender') || 'unisex';

    console.log('🏪 Shop recebido:', shop);
    console.log('📦 Collection ID:', collectionId);
    console.log('👤 Gender:', gender);

    if (!shop) {
      throw new Error('shop domain é obrigatório');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('📊 Buscando configuração para:', shop);

    let query = supabaseClient
      .from('widget_configurations')
      .select('shop_domain, link_text, store_logo, primary_color, widget_enabled')
      .eq('widget_enabled', true);

    if (shop) {
      query = query.eq('shop_domain', shop);
    } else {
      throw new Error('shop domain é obrigatório para widget_configurations');
    }

    // Pegar a configuração mais recente caso haja múltiplas
    query = query.order('created_at', { ascending: false }).limit(1);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('❌ Erro na query:', error);
      throw new Error('Erro ao buscar configuração do widget: ' + error.message);
    }

    if (!data) {
      console.log('⚠️ Nenhum dado encontrado para shop:', shop);
      throw new Error('Widget não encontrado ou inativo');
    }

    console.log('✅ Dados encontrados:', data);
    console.log('🖼️ Logo encontrado no banco:', data.store_logo);

    const storeLogo = data.store_logo || '';

    let sizeChartQuery = supabaseClient
      .from('size_charts')
      .select('*');

    if (collectionId) {
      sizeChartQuery = sizeChartQuery
        .eq('collection_id', collectionId)
        .eq('gender', gender);
    } else {
      sizeChartQuery = sizeChartQuery
        .is('collection_id', null)
        .eq('gender', gender);
    }

    const { data: sizeChart, error: sizeChartError } = await sizeChartQuery.maybeSingle();

    if (sizeChartError) {
      console.error('⚠️ Erro ao buscar size chart:', sizeChartError);
    }

    console.log('📏 Size chart encontrado:', sizeChart ? 'Sim' : 'Não');
    if (sizeChart) {
      console.log('📏 Collection ID:', sizeChart.collection_id);
      console.log('📏 Gender:', sizeChart.gender);
    }

    const config = {
      publicId: shop || data.shop_domain,
      linkText: data.link_text || 'Experimentar virtualmente',
      storeName: '',
      storeLogo: storeLogo,
      fontFamily: 'Outfit, sans-serif',
      colors: {
        primary: data.primary_color || '#810707',
        background: '#ffffff',
        text: data.primary_color || '#810707',
        overlay: (data.primary_color || '#810707') + 'CC'
      },
      sizeChart: sizeChart ? {
        id: sizeChart.id,
        collectionId: sizeChart.collection_id,
        gender: sizeChart.gender,
        measurements: sizeChart.measurements
      } : null
    };

    console.log('🖼️ Logo a ser retornado:', storeLogo);
    console.log('📤 Configuração completa:', JSON.stringify(config));

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
    console.error('❌ Error in omafit-config:', error);
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