import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractBodyMeasurements } from './mediapipe-helper.ts';
import {
  inferTryOnCategory,
  resolveTryOnProvider,
  submitTryOnJob,
} from '../_shared/tryon-provider.ts';
import type { TryOnCategory } from '../_shared/tryon-provider.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const TRYON_REMOTE_IMAGE_MAX_DIMENSION = 1024;
const TRYON_REMOTE_IMAGE_QUALITY = 75;

function buildImmediateBodyMeasurements(userMeasurements: any, detectedMeasurements: any) {
  if (detectedMeasurements) {
    return {
      shoulderWidth: detectedMeasurements.shoulder_width || detectedMeasurements.shoulderWidth || 0,
      chestCircumference: detectedMeasurements.chest || detectedMeasurements.chestCircumference || 0,
      waistCircumference: detectedMeasurements.waist || detectedMeasurements.waistCircumference || 0,
      hipCircumference: detectedMeasurements.hip || detectedMeasurements.hipCircumference || 0,
      bodyHeight: detectedMeasurements.bodyHeight || userMeasurements?.height || 0,
      armLength: detectedMeasurements.armLength || Math.round((userMeasurements?.height || 170) * 0.38),
      legLength: detectedMeasurements.legLength || Math.round((userMeasurements?.height || 170) * 0.47),
      confidence: detectedMeasurements.confidence || 0.8,
      userInput: userMeasurements || null,
      source: 'frontend_mediapipe',
    };
  }

  if (userMeasurements) {
    return {
      source: 'user_input',
      userInput: userMeasurements,
      confidence: 0,
    };
  }

  return null;
}

function optimizeTryOnInputUrl(rawUrl: string): string {
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    const supabasePublicMarker = '/storage/v1/object/public/';

    if (url.pathname.includes(supabasePublicMarker)) {
      const publicPath = url.pathname.split(supabasePublicMarker)[1];
      if (publicPath) {
        const optimizedUrl = new URL(`/storage/v1/render/image/public/${publicPath}`, url.origin);
        optimizedUrl.searchParams.set('width', String(TRYON_REMOTE_IMAGE_MAX_DIMENSION));
        optimizedUrl.searchParams.set('quality', String(TRYON_REMOTE_IMAGE_QUALITY));
        return optimizedUrl.toString();
      }
    }

    if (url.hostname.includes('shopify.com')) {
      const existingWidth = Number(url.searchParams.get('width') || '0');
      if (!existingWidth || existingWidth > TRYON_REMOTE_IMAGE_MAX_DIMENSION) {
        url.searchParams.set('width', String(TRYON_REMOTE_IMAGE_MAX_DIMENSION));
      }
      return url.toString();
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function getStringFormValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}

function parseOptionalJson<T>(value: FormDataEntryValue | null): T | null {
  if (typeof value !== 'string' || !value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

async function uploadTryOnImage(
  supabaseClient: ReturnType<typeof createClient>,
  file: Blob | Uint8Array,
  mimeType: string,
  folder: string,
): Promise<string> {
  const extension = mimeType.split('/')[1] || 'bin';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
  const imageBuffer = file instanceof Uint8Array ? file : new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabaseClient.storage
    .from('tryon-images')
    .upload(fileName, imageBuffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    console.error('❌ Upload error:', uploadError);
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: signedRead, error: signError } = await supabaseClient.storage
    .from('tryon-images')
    .createSignedUrl(fileName, 7200);

  if (signError || !signedRead?.signedUrl) {
    throw new Error(signError?.message || 'Failed to create signed read URL for uploaded image');
  }

  return signedRead.signedUrl;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let model_image = '';
    let garment_image = '';
    let product_name = '';
    let product_id = '';
    let public_id = '';
    let user_measurements: any = null;
    let pose_landmarks: any = null;
    let detected_measurements: any = null;
    let shop_name = '';
    let shop_domain = '';
    let collection_handle = '';
    // UI hint from the widget: upper/lower/full -> backend maps to tops/bottoms/one-pieces.
    let collection_type = '';
    let modelImageFile: Blob | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      modelImageFile = formData.get('model_image_file') instanceof Blob
        ? formData.get('model_image_file') as Blob
        : null;
      model_image = getStringFormValue(formData.get('model_image'));
      garment_image = getStringFormValue(formData.get('garment_image'));
      product_name = getStringFormValue(formData.get('product_name'));
      product_id = getStringFormValue(formData.get('product_id'));
      public_id = getStringFormValue(formData.get('public_id'));
      user_measurements = parseOptionalJson(formData.get('user_measurements'));
      pose_landmarks = parseOptionalJson(formData.get('pose_landmarks'));
      detected_measurements = parseOptionalJson(formData.get('detected_measurements'));
      shop_name = getStringFormValue(formData.get('shop_name'));
      shop_domain = getStringFormValue(formData.get('shop_domain'));
      collection_handle = getStringFormValue(formData.get('collection_handle'));
      collection_type = getStringFormValue(formData.get('collection_type'));
    } else {
      const payload = await req.json();
      model_image = payload.model_image || '';
      garment_image = payload.garment_image || '';
      product_name = payload.product_name || '';
      product_id = payload.product_id || '';
      public_id = payload.public_id || '';
      user_measurements = payload.user_measurements || null;
      pose_landmarks = payload.pose_landmarks || null;
      detected_measurements = payload.detected_measurements || null;
      shop_name = payload.shop_name || '';
      shop_domain = payload.shop_domain || '';
      collection_handle = payload.collection_handle || '';
      collection_type = payload.collection_type || '';
    }

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

    if ((!model_image && !modelImageFile) || !garment_image) {
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

    if (modelImageFile) {
      console.log('📤 Uploading binary model image to storage...');
      const mimeType = modelImageFile.type || 'image/jpeg';
      modelImageUrl = await uploadTryOnImage(
        supabaseClient,
        modelImageFile,
        mimeType,
        'tryon-models',
      );
      console.log('✅ Model image uploaded:', modelImageUrl);
    } else if (model_image.startsWith('data:')) {
      console.log('📤 Uploading base64 model image to storage...');

      const base64Data = model_image.split(',')[1];
      const mimeType = model_image.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      modelImageUrl = await uploadTryOnImage(
        supabaseClient,
        imageBuffer,
        mimeType,
        'tryon-models',
      );
      console.log('✅ Model image uploaded:', modelImageUrl);
    }

    if (garment_image.startsWith('data:')) {
      console.log('📤 Uploading base64 garment image to storage...');

      const base64Data = garment_image.split(',')[1];
      const mimeType = garment_image.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      garmentImageUrl = await uploadTryOnImage(
        supabaseClient,
        imageBuffer,
        mimeType,
        'tryon-garments',
      );
      console.log('✅ Garment image uploaded:', garmentImageUrl);
    }

    const optimizedGarmentImageUrl = optimizeTryOnInputUrl(garmentImageUrl);
    if (optimizedGarmentImageUrl !== garmentImageUrl) {
      console.log('🪄 Garment image URL optimized for faster self-hosted download');
      garmentImageUrl = optimizedGarmentImageUrl;
    }

    console.log('🔍 Buscando widget com public_id:', public_id);

    const { data: widgetKeyData, error: widgetKeyError } = await supabaseClient
      .from('widget_keys')
      .select('id, user_id, status, usage_count, shop_domain, domain')
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

    const normalizeShopDomain = (value: string | null | undefined): string => {
      if (!value) return '';
      return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '');
    };

    const widgetKeyShopDomain =
      normalizeShopDomain(widgetKeyData.shop_domain) ||
      normalizeShopDomain(widgetKeyData.domain);
    // Verificar se é widget Shopify usando shop_domain moderno OU domain legado.
    const isShopifyWidget = !widgetKeyData.user_id && !!widgetKeyShopDomain;
    console.log('🏪 Widget type:', isShopifyWidget ? 'Shopify' : 'Regular', '| user_id:', widgetKeyData.user_id, '| shop_domain:', widgetKeyShopDomain || 'não definido');

    const referer = req.headers.get('referer') || req.headers.get('referrer') || '';
    let shopDomainFromReferer = '';
    try {
      if (referer) {
        const refererUrl = new URL(referer);
        shopDomainFromReferer =
          refererUrl.searchParams.get('shopDomain') ||
          refererUrl.searchParams.get('shop_domain') ||
          '';
      }
    } catch (_error) {
      // ignore invalid referer parsing
    }

    let resolvedShopDomain =
      normalizeShopDomain(shop_domain) ||
      widgetKeyShopDomain;

    if (!resolvedShopDomain) {
      resolvedShopDomain =
        normalizeShopDomain(widgetKeyData.domain) ||
        normalizeShopDomain(shopDomainFromReferer);
    }

    const resolvedRecommendedSize =
      user_measurements?.recommended_size ||
      user_measurements?.recommendedSize ||
      user_measurements?.size_recommendation ||
      user_measurements?.sizeRecommendation ||
      null;

    // Bloqueio por configuração da loja (self-hosted try-on generation).
    // Por regra padrão: tryon_enabled=true (ou coluna ausente) => permite.
    const { data: widgetConfig, error: widgetConfigError } = await supabaseClient
      .from('widget_configurations')
      .select('tryon_enabled')
      .eq('shop_domain', resolvedShopDomain)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (widgetConfigError) {
      console.warn('⚠️ Falha ao buscar tryon_enabled da loja (permitindo por default):', widgetConfigError);
    }

    const tryonEnabled = widgetConfig?.tryon_enabled ?? true;
    if (!tryonEnabled) {
      return new Response(
        JSON.stringify({
          success: true,
          tryon_disabled: true,
          fal_request_id: null,
          error_code: 'TRYON_DISABLED',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const tryOnProvider = resolveTryOnProvider();
    console.log('🔧 Try-on provider:', tryOnProvider, '(TRYON_PROVIDER=' + (Deno.env.get("TRYON_PROVIDER") || "unset") + ', SELF_HOSTED_TRYON_URL=' + (Deno.env.get("SELF_HOSTED_TRYON_URL") ? "set" : "unset") + ')');
    const mapCollectionTypeToTryOnCategory = (typeHint: string): TryOnCategory | null => {
      const normalized = (typeHint || '').toLowerCase().trim();
      if (normalized === 'upper') return 'tops';
      if (normalized === 'lower') return 'bottoms';
      if (normalized === 'full') return 'one-pieces';
      return null;
    };

    const tryOnCategoryOverride = mapCollectionTypeToTryOnCategory(collection_type);
    const tryOnCategory = tryOnCategoryOverride ?? inferTryOnCategory(collection_handle);
    console.log('🎯 Try-on category:', { collection_type, inferred_from_collection_handle: collection_handle, tryOnCategory });
    let falApiKey: string | null = null;

    if (tryOnProvider === 'fal') {
    const { data: globalApiConfig } = await supabaseClient
      .from('api_config')
      .select('key_value')
      .eq('key_name', 'global_fal_api_key')
      .maybeSingle();

      falApiKey = globalApiConfig?.key_value ?? null;

    if (!falApiKey) {
      const { data: userApiConfigs } = await supabaseClient
        .from('api_config')
        .select('key_value')
        .eq('user_id', widgetKeyData.user_id)
          .in('key_name', ['fal_api_key', 'fashn_api_key'])
        .maybeSingle();

        falApiKey = userApiConfigs?.key_value ?? null;
    }

    if (!falApiKey) {
      throw new Error('FAL API key not configured. Please configure your API key in the dashboard settings.');
    }

    console.log('✅ FAL API key configured');
    } else {
      console.log('✅ Self-hosted try-on provider enabled');
    }

    let subscription: any = null;
    let effectiveUserId: string | null = widgetKeyData.user_id;

    if (isShopifyWidget) {
      // Para widgets Shopify, verificar na tabela shopify_shops
      const { data: shopifyShop, error: shopifyError } = await supabaseClient
        .from('shopify_shops')
        .select('user_id, billing_status, images_used_month, images_included, billing_cycle_end')
        .eq('shop_domain', widgetKeyShopDomain)
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
      console.log('✅ Shopify shop validated:', widgetKeyShopDomain);
    } else {
      // Para widgets regulares, verificar na tabela subscriptions.
      // Várias linhas ativas por user_id quebram .maybeSingle() (PGRST116); pegamos a vigente mais recente.
      const { data: regularSubscription, error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .select('id, images_limit, images_used, status, period_end')
        .eq('user_id', widgetKeyData.user_id)
        .eq('status', 'active')
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        console.error('❌ Subscription query error:', subscriptionError);
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
      shop_domain: resolvedShopDomain || 'não definido',
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

    console.log('🚀 Submitting try-on job with provider:', {
      provider: tryOnProvider,
      model_image: modelImageUrl.substring(0, 80) + '...',
      garment_image: garmentImageUrl.substring(0, 80) + '...',
      category: tryOnCategory,
    });

    const immediateBodyMeasurements = buildImmediateBodyMeasurements(user_measurements, detected_measurements);
    let request_id: string | null = null;
    let providerStatus = 'processing';

    try {
      const submitResult = await submitTryOnJob({
        provider: tryOnProvider,
        providerApiKey: falApiKey,
        modelImageUrl,
        garmentImageUrl,
        category: tryOnCategory,
        sessionId: session.id,
        publicId: public_id,
      });
      request_id = submitResult.requestId;
      providerStatus = submitResult.providerStatus;
      console.log('✅ TRY-ON submitted, request_id:', request_id, '| provider_status:', providerStatus);
    } catch (error) {
      console.error('❌ TRY-ON submission error:', error);
      throw new Error(`Failed to submit try-on job: ${error.message}`);
    }

    await supabaseClient
      .from('tryon_sessions')
      .update({
        fashn_prediction_id: request_id,
        fashn_status: 'processing'
      })
      .eq('id', session.id);

    EdgeRuntime.waitUntil((async () => {
      let debugInfo = {
        mediapipe_status: immediateBodyMeasurements ? 'immediate' : 'pending',
        mediapipe_returned: !!immediateBodyMeasurements,
        mediapipe_source: immediateBodyMeasurements?.source || 'none',
        user_height_received: user_measurements?.height || 'missing',
        user_weight_received: user_measurements?.weight || 'missing',
        user_gender_received: user_measurements?.gender || 'missing',
      };

      try {
        console.log('🔄 Background processing started for try-on session:', session.id);

        if (!resolvedShopDomain && effectiveUserId) {
          try {
            const { data: shopDomainByUser } = await supabaseClient
              .from('shopify_shops')
              .select('shop_domain')
              .eq('user_id', effectiveUserId)
              .not('shop_domain', 'is', null)
              .limit(1)
              .maybeSingle();

            resolvedShopDomain = normalizeShopDomain(shopDomainByUser?.shop_domain);
          } catch (_err) {
            // non-blocking
          }
        }

        if (!resolvedShopDomain && effectiveUserId) {
          try {
            const { data: shopifyStore } = await supabaseClient
              .from('shopify_stores')
              .select('store_url')
              .eq('user_id', effectiveUserId)
              .maybeSingle();
            resolvedShopDomain = normalizeShopDomain(shopifyStore?.store_url);
          } catch (_err) {
            // non-blocking
          }
        }

        console.log('💾 Criando analytics da sessão...');
        const baseSessionAnalytics: Record<string, unknown> = {
          tryon_session_id: session.id,
          user_id: effectiveUserId,
          duration_seconds: 0,
          completed: false,
          shared: false,
          processing_time_seconds: 0,
          images_processed: 1,
        };

        const enrichedSessionAnalytics: Record<string, unknown> = {
          ...baseSessionAnalytics,
          public_id: public_id || null,
          shop_domain: resolvedShopDomain || null,
          product_id: product_id || null,
          product_name: product_name || null,
          collection_handle: collection_handle || null,
          gender: user_measurements?.gender || null,
          height: user_measurements?.height || null,
          weight: user_measurements?.weight || null,
          recommended_size: resolvedRecommendedSize,
          body_type_index: user_measurements?.body_type_index ?? null,
          fit_preference_index: user_measurements?.fit_preference_index ?? null,
          user_measurements: user_measurements || null,
        };

        let { error: analyticsError } = await supabaseClient
          .from('session_analytics')
          .upsert([enrichedSessionAnalytics], { onConflict: 'tryon_session_id' });

        if (analyticsError) {
          console.warn('⚠️ Upsert enriquecido em session_analytics falhou. Tentando update por sessão...', analyticsError);
          const updateResult = await supabaseClient
            .from('session_analytics')
            .update(enrichedSessionAnalytics)
            .select('id')
            .eq('tryon_session_id', session.id);
          if (updateResult.error) {
            analyticsError = updateResult.error;
          } else if (!updateResult.data || updateResult.data.length === 0) {
            analyticsError = new Error('Nenhuma linha atualizada em session_analytics');
          } else {
            analyticsError = null;
          }
        }

        if (analyticsError) {
          console.warn('⚠️ Update enriquecido falhou. Tentando fallback básico...', analyticsError);
          const fallbackResult = await supabaseClient
            .from('session_analytics')
            .upsert([baseSessionAnalytics], { onConflict: 'tryon_session_id' });
          analyticsError = fallbackResult.error;
        }

        if (analyticsError) {
          console.error('⚠️ Erro ao criar analytics (não crítico):', analyticsError);
        } else {
          console.log('✅ Analytics criado com sucesso');
        }

        if (user_measurements) {
          console.log('💾 Salvando medidas do usuário:', {
            gender: user_measurements.gender,
            height: user_measurements.height,
            weight: user_measurements.weight,
            recommended_size: resolvedRecommendedSize
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
                recommended_size: resolvedRecommendedSize
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

        try {
          await supabaseClient.rpc('upsert_session_analytics_from_tryon_payload', {
            payload: {
              id: session.id,
              user_id: effectiveUserId,
              public_id: public_id,
              shop_domain: resolvedShopDomain || null,
              product_id: product_id,
              product_name: product_name,
              collection_handle: collection_handle || null,
              recommended_size: resolvedRecommendedSize,
              user_measurements: user_measurements
                ? {
                    ...user_measurements,
                    recommended_size: resolvedRecommendedSize,
                    shop_domain: resolvedShopDomain || null
                  }
                : null,
              created_at: sessionStartTime
            }
          });
          console.log('✅ upsert_session_analytics_from_tryon_payload executado');
        } catch (analyticsUpsertError) {
          console.warn('⚠️ Falha no upsert_session_analytics_from_tryon_payload:', analyticsUpsertError);
        }

        const frontendProvidedLandmarksAndMeasurements =
          Boolean(detected_measurements) &&
          Boolean(pose_landmarks) &&
          Array.isArray(pose_landmarks) &&
          pose_landmarks.length > 0;

        // Regra solicitada: nunca pular o MediaPipe backend.
        // Mesmo quando o frontend envia landmarks/medidas, rodamos o processamento aqui
        // para garantir consistência e validação das medidas.
        console.log('═══════════════════════════════════════════════════════');
        console.log('🤖 MEDIAPIPE: Iniciando análise de pose em background... (frontendProvided=' + frontendProvidedLandmarksAndMeasurements + ')');
        console.log('═══════════════════════════════════════════════════════');
        const startTime = Date.now();

        try {
          const userHeight = user_measurements?.height;
          const userWeight = user_measurements?.weight;
          const userGender = user_measurements?.gender;

          if (!userHeight || !userWeight) {
            console.log('❌ MEDIAPIPE: Altura e peso são obrigatórios!');
            debugInfo.mediapipe_status = 'skipped';
            debugInfo.mediapipe_source = user_measurements ? 'user_input' : 'none';
          } else {
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
              debugInfo.mediapipe_status = 'fulfilled';
              debugInfo.mediapipe_returned = true;
              debugInfo.mediapipe_source = 'mediapipe';
              console.log('✅ MEDIAPIPE SUCCESS (background):', {
                processingTime,
                confidence: bodyMeasurements.confidence,
              });
            } else {
              debugInfo.mediapipe_status = 'fulfilled';
              debugInfo.mediapipe_returned = false;
              debugInfo.mediapipe_source = user_measurements ? 'user_input' : 'none';
              console.log('⚠️ MEDIAPIPE sem resultado em background. Tempo:', processingTime + 'ms');
            }
          }
        } catch (error) {
          debugInfo.mediapipe_status = 'rejected';
          debugInfo.mediapipe_returned = false;
          debugInfo.mediapipe_source = user_measurements ? 'user_input_fallback' : 'none';
          console.error('❌ MEDIAPIPE background error:', error);
        }

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
          updatePromises.push(
            supabaseClient
              .from('shopify_shops')
              .update({
                images_used_month: subscription.images_used + 1
              })
              .eq('shop_domain', widgetKeyShopDomain)
          );
        } else if (subscription?.id) {
          updatePromises.push(
            supabaseClient
              .from('subscriptions')
              .update({
                images_used: subscription.images_used + 1
              })
              .eq('id', subscription.id)
          );
        }

        await Promise.all(updatePromises);

        try {
          let shopDomain: string | null = null;

          if (isShopifyWidget) {
            shopDomain = widgetKeyShopDomain;
          } else {
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
          console.error('[Billing] ⚠️ Erro ao processar billing:', billingError);
        }

        console.log('🔍 DEBUG INFO BACKGROUND:', debugInfo);
      } catch (backgroundError) {
        console.error('❌ Background processing error:', backgroundError);
      }
    })());

    return new Response(
      JSON.stringify({
        success: true,
        prediction_id: session.id,
        fal_request_id: request_id,
        credits_remaining: subscription.images_limit === -1 ? 'unlimited' : subscription.images_limit - subscription.images_used - 1,
        body_measurements: immediateBodyMeasurements,
        debug: {
          mediapipe_status: immediateBodyMeasurements ? 'immediate' : 'background',
          mediapipe_returned: !!immediateBodyMeasurements,
          mediapipe_source: immediateBodyMeasurements?.source || 'none',
          user_height_received: user_measurements?.height || 'missing',
          user_weight_received: user_measurements?.weight || 'missing',
          user_gender_received: user_measurements?.gender || 'missing',
          provider_status: providerStatus,
          provider: tryOnProvider,
          category: tryOnCategory,
        }
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