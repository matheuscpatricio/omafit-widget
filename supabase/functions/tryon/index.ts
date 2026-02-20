import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { fal } from "npm:@fal-ai/client";
import { extractBodyMeasurements } from './mediapipe-helper.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const {
      model_image,
      garment_image,
      product_name,
      product_id,
      public_id,
      user_measurements,
      pose_landmarks,
      detected_measurements,
      shop_name,
      shop_domain,
      collection_handle
    } = await req.json();

    console.log('📦 DADOS RECEBIDOS DO WIDGET:');
    console.log('   • shop_name:', shop_name || 'não fornecido');
    console.log('   • shop_domain:', shop_domain || 'não fornecido');
    console.log('   • collection_handle:', collection_handle || 'não fornecido');
    console.log('   • product_name:', product_name || 'não fornecido');
    console.log('   • product_id:', product_id || 'não fornecido');
    console.log('   • public_id:', public_id || 'não fornecido');
    console.log('   • user_measurements:', user_measurements ? 'presente' : 'não fornecido');
    console.log('   • pose_landmarks:', pose_landmarks ? 'presente' : 'não fornecido');
    console.log('   • detected_measurements:', detected_measurements ? 'presente' : 'não fornecido');

    if (!model_image || !garment_image) {
      throw new Error('model_image and garment_image are required');
    }

    if (!public_id) {
      throw new Error('public_id is required. Please generate a valid widget code from your Omafit dashboard.');
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     'unknown';

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let modelImageUrl = model_image;
    let garmentImageUrl = garment_image;

    if (model_image.startsWith('data:')) {
      console.log('📤 Uploading base64 model image to storage...');

      const base64Data = model_image.split(',')[1];
      const mimeType = model_image.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1];

      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const fileName = `tryon-models/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('tryon-images')
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Failed to upload model image: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseClient.storage
        .from('tryon-images')
        .getPublicUrl(fileName);

      modelImageUrl = urlData.publicUrl;
      console.log('✅ Model image uploaded:', modelImageUrl);
    }

    if (garment_image.startsWith('data:')) {
      console.log('📤 Uploading base64 garment image to storage...');

      const base64Data = garment_image.split(',')[1];
      const mimeType = garment_image.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1];

      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      const fileName = `tryon-garments/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('tryon-images')
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Failed to upload garment image: ${uploadError.message}`);
      }

      const { data: urlData } = supabaseClient.storage
        .from('tryon-images')
        .getPublicUrl(fileName);

      garmentImageUrl = urlData.publicUrl;
      console.log('✅ Garment image uploaded:', garmentImageUrl);
    }

    console.log('🔍 Buscando widget com public_id:', public_id);

    const { data: widgetKeyData, error: widgetKeyError } = await supabaseClient
      .from('widget_keys')
      .select('id, user_id, status, usage_count, shop_domain')
      .eq('public_id', public_id)
      .maybeSingle();

    console.log('📊 Resultado da busca:', { widgetKeyData, widgetKeyError });

    if (widgetKeyError) {
      console.error('❌ Erro ao buscar widget:', widgetKeyError);
      throw new Error('Error validating widget');
    }

    if (!widgetKeyData) {
      console.error('❌ Widget não encontrado. public_id:', public_id);
      // Listar todos os widgets para debug
      const { data: allWidgets } = await supabaseClient
        .from('widget_keys')
        .select('public_id, status')
        .limit(5);
      console.log('📋 Widgets disponíveis:', allWidgets);
      throw new Error('Invalid widget. Please check your widget code or generate a new one from your Omafit dashboard.');
    }

    console.log('✅ Widget encontrado:', widgetKeyData);

    if (widgetKeyData.status !== 'active') {
      throw new Error('This widget has been deactivated. Please contact the store owner or generate a new widget.');
    }

    // Verificar se é um widget Shopify (user_id null + shop_domain presente)
    const isShopifyWidget = !widgetKeyData.user_id && widgetKeyData.shop_domain;
    console.log('🏪 Widget type:', isShopifyWidget ? 'Shopify' : 'Regular', '| user_id:', widgetKeyData.user_id, '| shop_domain:', widgetKeyData.shop_domain);

    const { data: globalApiConfig } = await supabaseClient
      .from('api_config')
      .select('key_value')
      .eq('key_name', 'global_fal_api_key')
      .maybeSingle();

    let falApiKey = globalApiConfig?.key_value;

    if (!falApiKey) {
      const { data: userApiConfigs } = await supabaseClient
        .from('api_config')
        .select('key_value')
        .eq('user_id', widgetKeyData.user_id)
        .eq('key_name', 'fal_api_key')
        .maybeSingle();

      falApiKey = userApiConfigs?.key_value;
    }

    if (!falApiKey) {
      throw new Error('FAL API key not configured. Please configure your API key in the dashboard settings.');
    }

    fal.config({
      credentials: falApiKey
    });

    console.log('✅ FAL API key configured');

    let subscription: any = null;
    let effectiveUserId: string | null = widgetKeyData.user_id;

    if (isShopifyWidget) {
      // Para widgets Shopify, verificar na tabela shopify_shops
      const { data: shopifyShop, error: shopifyError } = await supabaseClient
        .from('shopify_shops')
        .select('user_id, billing_status, images_used_month, images_included, billing_cycle_end')
        .eq('shop_domain', widgetKeyData.shop_domain)
        .maybeSingle();

      if (shopifyError) {
        console.error('❌ Error checking Shopify shop:', shopifyError);
        throw new Error('Error checking shop billing status');
      }

      if (!shopifyShop) {
        throw new Error('Shop not found or billing not configured. Please install the Omafit app from the Shopify App Store.');
      }

      if (shopifyShop.billing_status !== 'active') {
        throw new Error('Shop billing is not active. Please activate a plan in your Shopify admin.');
      }

      // Verificar se atingiu o limite mensal
      if (shopifyShop.images_included !== -1 && shopifyShop.images_used_month >= shopifyShop.images_included) {
        console.log('⚠️ Shop exceeded monthly limit. Will charge per image.');
      }

      // Mapear para formato de subscription para manter compatibilidade
      subscription = {
        images_limit: shopifyShop.images_included,
        images_used: shopifyShop.images_used_month,
        status: shopifyShop.billing_status,
        period_end: shopifyShop.billing_cycle_end
      };

      effectiveUserId = shopifyShop.user_id;
      console.log('✅ Shopify shop validated:', widgetKeyData.shop_domain);
    } else {
      // Para widgets regulares, verificar na tabela subscriptions
      const { data: regularSubscription, error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .select('images_limit, images_used, status, period_end')
        .eq('user_id', widgetKeyData.user_id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscriptionError) {
        throw new Error('Error checking subscription status');
      }

      if (!regularSubscription) {
        throw new Error('No active subscription found. Please subscribe to a plan to use the try-on feature.');
      }

      const now = new Date();
      const periodEnd = new Date(regularSubscription.period_end);
      if (now > periodEnd) {
        throw new Error('Your subscription period has expired. Please renew your subscription.');
      }

      if (regularSubscription.images_limit !== -1 && regularSubscription.images_used >= regularSubscription.images_limit) {
        throw new Error('You have reached your monthly image limit. Please upgrade your plan or wait for the next billing cycle.');
      }

      subscription = regularSubscription;
      console.log('✅ Regular subscription validated');
    }

    const sessionStartTime = new Date().toISOString();

    // Preparar dados da sessão com shop_name se disponível
    const sessionData: any = {
      product_id,
      customer_email: clientIp,
      model_image,
      user_id: effectiveUserId,
      fashn_status: 'processing',
      session_start_time: sessionStartTime,
      processing_start_time: sessionStartTime,
    };

    // Adicionar shop_name se disponível (para rastreamento de origem)
    if (shop_name) {
      sessionData.shop_name = shop_name;
      console.log('✅ shop_name será salvo na sessão:', shop_name);
    }

    console.log('💾 Criando sessão no banco com dados:', {
      product_id: sessionData.product_id,
      user_id: sessionData.user_id,
      shop_name: sessionData.shop_name || 'não definido',
      has_user_measurements: !!user_measurements
    });

    const { data: session, error: sessionError } = await supabaseClient
      .from('tryon_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Erro ao criar sessão:', sessionError);
      throw new Error('Failed to create try-on session: ' + sessionError.message);
    }

    console.log('✅ Sessão criada com sucesso. ID:', session.id);

    // Salvar analytics da sessão
    console.log('💾 Criando analytics da sessão...');
    const { error: analyticsError } = await supabaseClient
      .from('session_analytics')
      .insert([
        {
          tryon_session_id: session.id,
          user_id: effectiveUserId,
          duration_seconds: 0,
          completed: false,
          shared: false,
          processing_time_seconds: 0,
          images_processed: 1,
        }
      ]);

    if (analyticsError) {
      console.error('⚠️ Erro ao criar analytics (não crítico):', analyticsError);
    } else {
      console.log('✅ Analytics criado com sucesso');
    }

    // Salvar medidas do usuário se disponíveis
    if (user_measurements) {
      console.log('💾 Salvando medidas do usuário:', {
        gender: user_measurements.gender,
        height: user_measurements.height,
        weight: user_measurements.weight,
        recommended_size: user_measurements.recommended_size
      });

      const { error: measurementsError } = await supabaseClient
        .from('user_measurements')
        .insert([
          {
            tryon_session_id: session.id,
            gender: user_measurements.gender,
            height: user_measurements.height,
            weight: user_measurements.weight,
            body_type_index: user_measurements.body_type_index,
            fit_preference_index: user_measurements.fit_preference_index,
            recommended_size: user_measurements.recommended_size
          }
        ]);

      if (measurementsError) {
        console.error('⚠️ Erro ao salvar medidas (não crítico):', measurementsError);
      } else {
        console.log('✅ Medidas do usuário salvas com sucesso');
      }
    } else {
      console.log('⚠️ Nenhuma medida de usuário foi fornecida');
    }

    const falInput = {
      model_image: modelImageUrl,
      garment_image: garmentImageUrl,
      category: "auto",
      mode: "quality",
      garment_photo_type: "auto",
      moderation_level: "none",
      num_samples: 1,
      segmentation_free: true,
      output_format: "png"
    };

    console.log('🚀 Submitting to fal.ai/fashn/tryon/v1.6 with input:', {
      model_image: modelImageUrl.substring(0, 80) + '...',
      garment_image: garmentImageUrl.substring(0, 80) + '...',
      category: "auto",
      mode: "quality"
    });

    // 🎯 PROCESSAMENTO PARALELO: FASHN + MediaPipe
    console.log('🔄 Iniciando processamento PARALELO...');

    let request_id;
    let mediapipeMeasurements = null;
    let debugInfo = {
      mediapipe_status: 'unknown',
      mediapipe_returned: false,
      mediapipe_source: 'none',
      user_height_received: user_measurements?.height || 'missing',
      user_weight_received: user_measurements?.weight || 'missing',
      user_gender_received: user_measurements?.gender || 'missing',
    };

    try {
      // Iniciar AMBOS em paralelo
      const [fashnResult, mediapipeResult] = await Promise.allSettled([
        // 1️⃣ FASHN API (30-40s)
        fal.queue.submit("fal-ai/fashn/tryon/v1.6", {
          input: falInput
        }),

        // 2️⃣ MediaPipe Pose Landmarker (2-3s) ⚡
        (async () => {
          console.log('═══════════════════════════════════════════════════════');
          console.log('🤖 MEDIAPIPE: Iniciando análise de pose...');
          console.log('═══════════════════════════════════════════════════════');

          try {
            // 🔹 DEBUG: Ver exatamente o que chegou
            console.log('📦 user_measurements recebido no edge function:');
            console.log('   • Objeto completo:', JSON.stringify(user_measurements, null, 2));
            console.log('   • Tipo:', typeof user_measurements);
            console.log('   • É null?', user_measurements === null);
            console.log('   • É undefined?', user_measurements === undefined);
            console.log('');

            // 🔹 VALIDAR altura e peso OBRIGATÓRIOS
            const userHeight = user_measurements?.height;
            const userWeight = user_measurements?.weight;
            const userGender = user_measurements?.gender;

            console.log('📏 Valores extraídos:');
            console.log('   • userHeight:', userHeight, '(tipo:', typeof userHeight + ')');
            console.log('   • userWeight:', userWeight, '(tipo:', typeof userWeight + ')');
            console.log('   • userGender:', userGender);
            console.log('');

            if (!userHeight || !userWeight) {
              console.log('❌ MEDIAPIPE SKIPPED: Altura e peso são obrigatórios!');
              console.log('   • Altura fornecida:', userHeight, '→', !userHeight ? '❌ VAZIO/ZERO' : '✅ OK');
              console.log('   • Peso fornecido:', userWeight, '→', !userWeight ? '❌ VAZIO/ZERO' : '✅ OK');
              console.log('   • Pulando análise MediaPipe...');
              console.log('   • Retornando source: user_input');
              console.log('═══════════════════════════════════════════════════════');
              console.log('');
              return user_measurements ? {
                source: 'user_input',
                userInput: user_measurements
              } : null;
            }

            console.log('📏 MEDIAPIPE INPUT:');
            console.log('   • Imagem do modelo:', modelImageUrl.substring(0, 100) + '...');
            console.log('   • Altura do usuário:', userHeight, 'cm');
            console.log('   • Peso do usuário:', userWeight, 'kg');
            console.log('   • Gênero:', userGender || 'não especificado');
            console.log('   • 🎯 Landmarks do frontend:', pose_landmarks ? `presente (${pose_landmarks.length} landmarks)` : '❌ não fornecido');
            console.log('   • 📐 Medidas detectadas no frontend:', detected_measurements ? 'presentes' : '❌ não fornecido');
            console.log('');

            const startTime = Date.now();

            // Extrair medidas corporais reais da imagem usando MediaPipe
            // Se landmarks foram detectados no frontend, usa eles diretamente
            // Caso contrário, faz a detecção aqui (fallback)
            const bodyMeasurements = await extractBodyMeasurements(
              modelImageUrl,
              userHeight,
              userWeight,
              userGender,
              pose_landmarks,
              detected_measurements
            );

            const processingTime = Date.now() - startTime;

            if (bodyMeasurements) {
              console.log('✅ MEDIAPIPE SUCCESS: Pose detectada!');
              console.log('   ⏱️  Tempo de processamento:', processingTime + 'ms');
              console.log('   📊 Confiança geral:', (bodyMeasurements.confidence * 100).toFixed(1) + '%');
              console.log('');
              console.log('📐 MEDIDAS EXTRAÍDAS:');
              console.log('   • Altura corporal:', bodyMeasurements.bodyHeight + 'cm');
              console.log('   • Largura dos ombros:', bodyMeasurements.shoulderWidth + 'cm');
              console.log('   • Circunferência do peito:', bodyMeasurements.chestCircumference + 'cm');
              console.log('   • Circunferência da cintura:', bodyMeasurements.waistCircumference + 'cm');
              console.log('   • Circunferência do quadril:', bodyMeasurements.hipCircumference + 'cm');
              console.log('   • Comprimento do braço:', bodyMeasurements.armLength + 'cm');
              console.log('   • Comprimento da perna:', bodyMeasurements.legLength + 'cm');
              console.log('');
              console.log('🔍 DEBUG: bodyMeasurements COMPLETO:', JSON.stringify(bodyMeasurements, null, 2));
              console.log('═══════════════════════════════════════════════════════');

              // Combinar com dados do usuário se disponível
              const finalResult = {
                ...bodyMeasurements,
                userInput: user_measurements || null,
                source: 'mediapipe'
              };

              console.log('🔍 DEBUG: finalResult que será retornado:', JSON.stringify(finalResult, null, 2));

              return finalResult;
            }

            console.log('═══════════════════════════════════════════════════════');
            console.log('⚠️ MEDIAPIPE WARNING: Nenhuma pose detectada!');
            console.log('   • Tempo de processamento:', processingTime + 'ms');
            console.log('   • Possíveis causas:');
            console.log('     - Imagem muito escura ou de baixa qualidade');
            console.log('     - Pessoa não está de corpo inteiro');
            console.log('     - Pose muito complexa ou obstruída');
            console.log('   • Fallback: Usando dados manuais do usuário');
            console.log('═══════════════════════════════════════════════════════');

            return user_measurements ? {
              source: 'user_input',
              userInput: user_measurements
            } : null;

          } catch (error) {
            const processingTime = Date.now() - startTime;
            console.log('═══════════════════════════════════════════════════════');
            console.error('❌ MEDIAPIPE ERROR: Falha no processamento!');
            console.error('   • Erro:', error.message);
            console.error('   • Stack:', error.stack);
            console.log('   • Tempo até erro:', processingTime + 'ms');
            console.log('   • Fallback: Usando dados manuais do usuário');
            console.log('═══════════════════════════════════════════════════════');

            // Fallback: usar dados do usuário se disponível
            return user_measurements ? {
              source: 'user_input_fallback',
              userInput: user_measurements
            } : null;
          }
        })()
      ]);

      // Processar resultado do FASHN
      if (fashnResult.status === 'fulfilled') {
        request_id = fashnResult.value.request_id;
        console.log('✅ FASHN submitted, request_id:', request_id);
      } else {
        console.error('❌ FASHN submission error:', fashnResult.reason);
        throw new Error(`Failed to submit to fal.ai: ${fashnResult.reason.message}`);
      }

      // Processar resultado do MediaPipe
      console.log('');
      console.log('📊 MEDIAPIPE RESULT STATUS:', mediapipeResult.status);

      // Atualizar debug info
      debugInfo.mediapipe_status = mediapipeResult.status;

      if (mediapipeResult.status === 'fulfilled' && mediapipeResult.value) {
        mediapipeMeasurements = mediapipeResult.value;
        debugInfo.mediapipe_returned = true;
        debugInfo.mediapipe_source = mediapipeMeasurements.source;

        if (mediapipeMeasurements.source === 'mediapipe') {
          console.log('✅ MEDIAPIPE: Medidas REAIS extraídas com sucesso!');
          console.log('   → Serão enviadas ao frontend para cálculo de tamanho');
        } else {
          console.log('⚠️ MEDIAPIPE: Usando dados MANUAIS (fallback)');
          console.log('   → Source:', mediapipeMeasurements.source);
        }
      } else if (mediapipeResult.status === 'rejected') {
        console.warn('⚠️ MEDIAPIPE: Processo rejeitado (non-blocking)');
        console.warn('   → Erro:', mediapipeResult.reason);
        debugInfo.mediapipe_returned = false;
      } else {
        console.log('⚠️ MEDIAPIPE: Nenhum resultado retornado');
        debugInfo.mediapipe_returned = false;
      }
      console.log('');

    } catch (error) {
      console.error('❌ Parallel processing error:', error);
      throw error;
    }

    await supabaseClient
      .from('tryon_sessions')
      .update({
        fashn_prediction_id: request_id,
        fashn_status: 'processing'
      })
      .eq('id', session.id);

    // Atualizar contadores
    const updatePromises = [
      supabaseClient
        .from('widget_keys')
        .update({
          usage_count: widgetKeyData.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', widgetKeyData.id)
    ];

    if (isShopifyWidget) {
      // Para Shopify, atualizar shopify_shops
      updatePromises.push(
        supabaseClient
          .from('shopify_shops')
          .update({
            images_used_month: subscription.images_used + 1
          })
          .eq('shop_domain', widgetKeyData.shop_domain)
      );
    } else {
      // Para widgets regulares, atualizar subscriptions
      updatePromises.push(
        supabaseClient
          .from('subscriptions')
          .update({
            images_used: subscription.images_used + 1
          })
          .eq('user_id', effectiveUserId)
          .eq('status', 'active')
      );
    }

    await Promise.all(updatePromises);

    // ✅ BILLING SHOPIFY: Registrar uso de imagem e cobrar se necessário
    try {
      let shopDomain = null;

      if (isShopifyWidget) {
        // Para Shopify widgets, usar o shop_domain diretamente
        shopDomain = widgetKeyData.shop_domain;
      } else {
        // Para widgets regulares, buscar shop_domain via shopify_stores
        const { data: shopifyStore } = await supabaseClient
          .from('shopify_stores')
          .select('store_url')
          .eq('user_id', effectiveUserId)
          .maybeSingle();

        if (shopifyStore && shopifyStore.store_url) {
          shopDomain = shopifyStore.store_url;
        }
      }

      if (shopDomain) {
        console.log(`[Billing] Registrando uso de imagem para loja: ${shopDomain}`);

        // Chamar API de billing do app principal
        const appUrl = Deno.env.get('SHOPIFY_APP_URL') || 'https://ranging-drill-proper-wayne.trycloudflare.com';

        const billingResponse = await fetch(`${appUrl}/api/billing/usage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopDomain: shopDomain,
            imagesCount: 1
          })
        });

        if (billingResponse.ok) {
          const billingResult = await billingResponse.json();
          console.log('[Billing] ✅ Uso registrado:', billingResult);
        } else {
          const errorText = await billingResponse.text();
          console.error('[Billing] ⚠️ Erro ao registrar uso:', errorText);
        }
      } else {
        console.warn('[Billing] ⚠️ shop_domain não encontrado para user_id:', effectiveUserId);
      }
    } catch (billingError) {
      // Não falhar a requisição principal se o billing der erro
      console.error('[Billing] ⚠️ Erro ao processar billing:', billingError);
    }

    // 🔹 Log final de debug
    console.log('🔍 DEBUG INFO PARA FRONTEND:', debugInfo);

    return new Response(
      JSON.stringify({
        success: true,
        prediction_id: session.id,
        fal_request_id: request_id,
        credits_remaining: subscription.images_limit === -1 ? 'unlimited' : subscription.images_limit - subscription.images_used - 1,
        body_measurements: mediapipeMeasurements || null,
        debug: debugInfo  // ← ADICIONAR DEBUG INFO
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Try-on error:', error);

    let errorMessage = error.message || 'Unknown error occurred';
    let statusCode = 500;

    if (error.message && error.message.includes('required')) {
      statusCode = 400;
    } else if (error.message && error.message.includes('Invalid widget')) {
      statusCode = 401;
    } else if (error.message && error.message.includes('subscription')) {
      statusCode = 402;
    } else if (error.message && error.message.includes('limit')) {
      statusCode = 429;
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        error_code: statusCode
      }),
      {
        status: statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});