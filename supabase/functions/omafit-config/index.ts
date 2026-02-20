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
    const collectionHandle = url.searchParams.get('collection_handle');
    const gender = url.searchParams.get('gender') || 'unisex';
    const collectionType = url.searchParams.get('collection_type'); // 'upper', 'lower', or 'full'

    console.log('🏪 Shop recebido:', shop);
    console.log('📦 Collection ID (UUID):', collectionId || 'não fornecido');
    console.log('📦 Collection Handle (Shopify):', collectionHandle || 'não fornecido (tabela global)');
    console.log('👤 Gender:', gender);
    console.log('👕 Collection Type:', collectionType || 'não especificado (usar padrão da collection)');

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
      .select('shop_domain, link_text, store_logo, primary_color, widget_enabled, store_name')
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
    console.log('   - Collection ID (UUID):', collectionId || 'não fornecido');
    console.log('   - Collection Handle (Shopify):', collectionHandle || 'não fornecido');
    console.log('   - Gender:', gender);

    let sizeChartQuery = supabaseClient
      .from('size_charts')
      .select('id, collection_id, collection_handle, gender, measurement_names');

    // Prioridade 1: collection_handle (vindo do Shopify)
    if (collectionHandle) {
      console.log('🔍 Modo: BUSCA POR COLLECTION_HANDLE (SHOPIFY)');
      console.log('   WHERE shop_domain =', shop);
      console.log('   AND collection_handle =', collectionHandle);
      console.log('   AND gender =', gender);

      sizeChartQuery = sizeChartQuery
        .eq('shop_domain', shop)
        .eq('collection_handle', collectionHandle)
        .eq('gender', gender);
    }
    // Prioridade 2: collection_id (UUID interno)
    else if (collectionId) {
      console.log('🔍 Modo: BUSCA POR COLLECTION_ID (UUID INTERNO)');
      console.log('   WHERE collection_id =', collectionId);
      console.log('   AND gender =', gender);

      sizeChartQuery = sizeChartQuery
        .eq('collection_id', collectionId)
        .eq('gender', gender);
    }
    // Prioridade 3: Tabela global (sem coleção)
    else {
      console.log('🔍 Modo: BUSCA POR TABELA GLOBAL (SEM COLEÇÃO)');
      console.log('   WHERE shop_domain =', shop);
      console.log('   AND collection_handle IS NULL');
      console.log('   AND collection_id IS NULL');
      console.log('   AND gender =', gender);

      sizeChartQuery = sizeChartQuery
        .eq('shop_domain', shop)
        .is('collection_handle', null)
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
      console.log('   - Collection ID (UUID):', sizeChart.collection_id || 'null');
      console.log('   - Collection Handle (Shopify):', sizeChart.collection_handle || 'null (global)');
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
      console.log('   - Collection ID (UUID):', collectionId || 'null');
      console.log('   - Collection Handle (Shopify):', collectionHandle || 'null');
      console.log('   - Gender:', gender);
    }

    console.log('🔍 ===== FIM DA BUSCA DE SIZE CHART =====');

    // Buscar measurement weights
    let measurementWeights = null;

    // Prioridade 1: Se collection_type foi passado pelo widget, usar os pesos padrão desse tipo
    if (collectionType && ['upper', 'lower', 'full'].includes(collectionType)) {
      console.log('⚖️ Usando collection_type do widget:', collectionType);
      const defaultWeights = {
        'upper': { Busto: 2.0, Peito: 2.0, Cintura: 1.0, Quadril: 1.0, Comprimento: 1.0, Ombro: 1.0 },
        'lower': { Busto: 1.0, Peito: 1.0, Cintura: 2.0, Quadril: 2.0, Comprimento: 1.0, Tornozelo: 1.0 },
        'full': { Busto: 1.0, Peito: 1.0, Cintura: 1.0, Quadril: 1.0, Comprimento: 1.0, Ombro: 1.0 }
      };
      measurementWeights = defaultWeights[collectionType as 'upper' | 'lower' | 'full'];
      console.log('✅ Pesos aplicados:', measurementWeights);
    }
    // Prioridade 2: Se não foi passado collection_type, usar da coleção (se houver)
    else if (sizeChart?.collection_id) {
      console.log('⚖️ Buscando measurement weights da collection_id:', sizeChart.collection_id);
      const { data: collectionData } = await supabaseClient
        .from('collection_measurement_weights')
        .select('effective_weights')
        .eq('id', sizeChart.collection_id)
        .maybeSingle();

      if (collectionData?.effective_weights) {
        measurementWeights = collectionData.effective_weights;
        console.log('✅ Measurement weights da coleção encontrados:', measurementWeights);
      } else {
        console.log('⚠️ Nenhum measurement weight configurado para esta coleção');
      }
    }

    const config = {
      publicId: shop || data.shop_domain,
      linkText: data.link_text || 'Experimentar virtualmente',
      storeName: data.store_name || '',
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
        collectionHandle: sizeChart.collection_handle,
        gender: sizeChart.gender,
        measurementNames: sizeChart.measurement_names || ['Busto', 'Cintura', 'Quadril'],
        measurementWeights: measurementWeights,
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