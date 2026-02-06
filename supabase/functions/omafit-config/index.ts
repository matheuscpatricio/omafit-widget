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

    console.log('🔍 ===== INICIANDO BUSCA DE SIZE CHART =====');
    console.log('🔍 Parâmetros de busca:');
    console.log('   - Collection ID:', collectionId || 'null (tabela global)');
    console.log('   - Gender:', gender);

    let sizeChartQuery = supabaseClient
      .from('size_charts')
      .select('id, collection_id, gender, measurement_names');

    if (collectionId) {
      console.log('🔍 Modo: BUSCA POR COLEÇÃO ESPECÍFICA');
      sizeChartQuery = sizeChartQuery
        .eq('collection_id', collectionId)
        .eq('gender', gender);
    } else {
      console.log('🔍 Modo: BUSCA POR TABELA GLOBAL');
      sizeChartQuery = sizeChartQuery
        .is('collection_id', null)
        .eq('gender', gender);
    }

    const { data: sizeChart, error: sizeChartError } = await sizeChartQuery.maybeSingle();

    if (sizeChartError) {
      console.error('❌ Erro ao buscar size chart:', sizeChartError);
    }

    console.log('📏 Resultado da busca:', sizeChart ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO');

    let sizeChartEntries = null;
    if (sizeChart) {
      console.log('📊 Detalhes da size chart encontrada:');
      console.log('   - ID:', sizeChart.id);
      console.log('   - Collection ID:', sizeChart.collection_id || 'null (global)');
      console.log('   - Gender:', sizeChart.gender);
      console.log('   - Measurement Names:', sizeChart.measurement_names);

      console.log('🔍 Buscando entradas da tabela...');
      const { data: entries, error: entriesError } = await supabaseClient
        .from('size_chart_entries')
        .select('*')
        .eq('size_chart_id', sizeChart.id)
        .order('order', { ascending: true });

      if (entriesError) {
        console.error('❌ Erro ao buscar entries:', entriesError);
      } else if (entries) {
        sizeChartEntries = entries;
        console.log('✅ Entries encontradas:', entries.length);
        entries.forEach((entry, index) => {
          console.log(`   ${index + 1}. ${entry.size_name}:`, entry.measurements || { bust: entry.bust, waist: entry.waist, hips: entry.hips });
        });
      }
    } else {
      console.log('⚠️ ATENÇÃO: Nenhuma size chart encontrada com os critérios:');
      console.log('   - Collection ID:', collectionId || 'null');
      console.log('   - Gender:', gender);
    }

    console.log('🔍 ===== FIM DA BUSCA DE SIZE CHART =====');

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
      sizeChart: sizeChart && sizeChartEntries ? {
        id: sizeChart.id,
        collectionId: sizeChart.collection_id,
        gender: sizeChart.gender,
        measurementNames: sizeChart.measurement_names || ['Busto', 'Cintura', 'Quadril'],
        entries: sizeChartEntries
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