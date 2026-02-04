import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { fal } from "npm:@fal-ai/client";

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
    const { model_image, garment_image, product_name, product_id, public_id, user_measurements } = await req.json();

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

    const { data: session, error: sessionError } = await supabaseClient
      .from('tryon_sessions')
      .insert([
        {
          product_id,
          customer_email: clientIp,
          model_image,
          user_id: effectiveUserId,
          fashn_status: 'processing',
          session_start_time: sessionStartTime,
          processing_start_time: sessionStartTime,
        }
      ])
      .select()
      .single();

    if (sessionError) {
      throw new Error('Failed to create try-on session');
    }

    await supabaseClient
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

    if (user_measurements) {
      await supabaseClient
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
    }

    const falInput = {
      model_image: modelImageUrl,
      garment_image: garmentImageUrl,
      category: "auto",
      mode: "balanced",
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
      mode: "balanced"
    });

    let request_id;
    try {
      const submitResult = await fal.queue.submit("fal-ai/fashn/tryon/v1.6", {
        input: falInput
      });
      request_id = submitResult.request_id;
      console.log('✅ Submitted to fal.ai/fashn/tryon/v1.6, request_id:', request_id);
    } catch (falError) {
      console.error('❌ Fal.ai submission error:', {
        message: falError.message,
        name: falError.name,
        body: (falError as any).body,
        status: (falError as any).status,
        statusText: (falError as any).statusText,
        sentInput: falInput
      });
      throw new Error(`Failed to submit to fal.ai: ${falError.message}`);
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

    return new Response(
      JSON.stringify({
        success: true,
        prediction_id: session.id,
        fal_request_id: request_id,
        credits_remaining: subscription.images_limit === -1 ? 'unlimited' : subscription.images_limit - subscription.images_used - 1
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