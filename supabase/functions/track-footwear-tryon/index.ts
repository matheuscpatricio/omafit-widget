import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeShopDomain = (value: string | null | undefined): string => {
  if (!value) return '';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Use POST with a JSON body to track a footwear measurement.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed. Use POST.",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    let requestBody: any = null;
    try {
      requestBody = await req.json();
    } catch (_jsonError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or empty JSON body.",
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

    const {
      session_id,
      track_usage = true,
      public_id,
      shop_domain,
      shop_name,
      product_id,
      product_name,
      collection_handle,
      model_image,
      user_measurements,
    } = requestBody;

    if (!public_id) {
      throw new Error('public_id is required');
    }

    if (!session_id && !model_image) {
      throw new Error('model_image is required when creating a new session');
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: widgetKeyData, error: widgetKeyError } = await supabaseClient
      .from('widget_keys')
      .select('id, user_id, status, usage_count, shop_domain, domain')
      .eq('public_id', public_id)
      .maybeSingle();

    if (widgetKeyError) {
      throw new Error('Error validating widget');
    }

    if (!widgetKeyData) {
      throw new Error('Invalid widget. Please check your widget code.');
    }

    if (widgetKeyData.status !== 'active') {
      throw new Error('This widget has been deactivated.');
    }

    const widgetKeyShopDomain =
      normalizeShopDomain(widgetKeyData.shop_domain) ||
      normalizeShopDomain(widgetKeyData.domain);
    const isShopifyWidget = !widgetKeyData.user_id && !!widgetKeyShopDomain;

    let resolvedShopDomain =
      normalizeShopDomain(shop_domain) ||
      widgetKeyShopDomain;

    let subscription: any = null;
    let effectiveUserId: string | null = widgetKeyData.user_id;

    if (isShopifyWidget) {
      const { data: shopifyShop, error: shopifyError } = await supabaseClient
        .from('shopify_shops')
        .select('user_id, billing_status, images_used_month, images_included, billing_cycle_end')
        .eq('shop_domain', widgetKeyShopDomain)
        .maybeSingle();

      if (shopifyError) {
        throw new Error('Error checking shop billing status');
      }

      if (!shopifyShop) {
        throw new Error('Shop not found or billing not configured.');
      }

      if (shopifyShop.billing_status !== 'active') {
        throw new Error('Shop billing is not active.');
      }

      subscription = {
        images_limit: shopifyShop.images_included,
        images_used: shopifyShop.images_used_month,
        status: shopifyShop.billing_status,
        period_end: shopifyShop.billing_cycle_end,
      };

      effectiveUserId = shopifyShop.user_id;
    } else {
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
        throw new Error('No active subscription found.');
      }

      const now = new Date();
      const periodEnd = new Date(regularSubscription.period_end);
      if (now > periodEnd) {
        throw new Error('Your subscription period has expired.');
      }

      if (track_usage && regularSubscription.images_limit !== -1 && regularSubscription.images_used >= regularSubscription.images_limit) {
        throw new Error('You have reached your monthly image limit.');
      }

      subscription = regularSubscription;
    }

    if (!resolvedShopDomain && effectiveUserId) {
      const { data: shopifyStore } = await supabaseClient
        .from('shopify_stores')
        .select('store_url')
        .eq('user_id', effectiveUserId)
        .maybeSingle();

      resolvedShopDomain = normalizeShopDomain(shopifyStore?.store_url);
    }

    const recommendedSize =
      user_measurements?.recommended_size ||
      user_measurements?.recommendedSize ||
      null;
    const footLengthCmRaw =
      user_measurements?.foot_length_cm ??
      user_measurements?.footLengthCm ??
      null;
    const footLengthCm =
      footLengthCmRaw === null || footLengthCmRaw === undefined || footLengthCmRaw === ''
        ? null
        : Number(footLengthCmRaw);

    const sessionStartTime = new Date().toISOString();
    let sessionId = session_id && UUID_REGEX.test(String(session_id)) ? String(session_id) : null;
    let sessionCreatedNow = false;
    let resolvedProductId = product_id ? String(product_id) : null;

    if (!sessionId) {
      if (!resolvedProductId) {
        throw new Error('product_id is required');
      }

      if (!UUID_REGEX.test(resolvedProductId)) {
        let productLookupQuery = supabaseClient
          .from('products')
          .select('id')
          .eq('shopify_id', resolvedProductId);

        if (effectiveUserId) {
          productLookupQuery = productLookupQuery.eq('user_id', effectiveUserId);
        }

        let { data: mappedProduct, error: mappedProductError } = await productLookupQuery.maybeSingle();

        if ((!mappedProduct || mappedProductError) && product_name) {
          let productNameQuery = supabaseClient
            .from('products')
            .select('id')
            .eq('name', product_name)
            .limit(1);

          if (effectiveUserId) {
            productNameQuery = productNameQuery.eq('user_id', effectiveUserId);
          }

          const fallbackByName = await productNameQuery.maybeSingle();
          mappedProduct = fallbackByName.data;
          mappedProductError = fallbackByName.error;
        }

        if ((!mappedProduct || mappedProductError) && effectiveUserId) {
          const placeholderProductPayload: Record<string, unknown> = {
            user_id: effectiveUserId,
            shopify_id: resolvedProductId,
            name: product_name || 'Calçado',
            description: null,
            category: 'shoes',
          };

          const { data: createdProduct, error: createdProductError } = await supabaseClient
            .from('products')
            .insert([placeholderProductPayload])
            .select('id')
            .single();

          if (!createdProductError && createdProduct?.id) {
            mappedProduct = createdProduct;
            mappedProductError = null;
          }
        }

        if (mappedProductError || !mappedProduct?.id) {
          throw new Error('Could not resolve internal product UUID from product_id');
        }

        resolvedProductId = mappedProduct.id;
      }
    }

    if (!sessionId) {
      const sessionData: Record<string, unknown> = {
        product_id: resolvedProductId,
        customer_email: clientIp,
        model_image,
        user_id: effectiveUserId,
        fashn_status: 'completed',
        session_start_time: sessionStartTime,
        processing_start_time: sessionStartTime,
        processing_end_time: sessionStartTime,
        session_end_time: sessionStartTime,
      };

      if (shop_name) {
        sessionData.shop_name = shop_name;
      }

      const { data: session, error: sessionError } = await supabaseClient
        .from('tryon_sessions')
        .insert([sessionData])
        .select('id')
        .single();

      if (sessionError || !session?.id) {
        throw sessionError || new Error('Failed to create try-on session');
      }

      sessionId = session.id;
      sessionCreatedNow = true;
    }

    const baseSessionAnalytics: Record<string, unknown> = {
      tryon_session_id: sessionId,
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
      product_id: resolvedProductId,
      product_name: product_name || null,
      collection_handle: collection_handle || null,
      gender: user_measurements?.gender || 'unisex',
      height: user_measurements?.height || null,
      weight: user_measurements?.weight || null,
      foot_length_cm: Number.isFinite(footLengthCm) ? footLengthCm : null,
      recommended_size: recommendedSize,
      body_type_index: user_measurements?.body_type_index ?? null,
      fit_preference_index: user_measurements?.fit_preference_index ?? null,
      user_measurements: user_measurements
        ? {
            ...user_measurements,
            recommended_size: recommendedSize,
            shop_domain: resolvedShopDomain || null,
          }
        : null,
    };

    let { error: analyticsError } = await supabaseClient
      .from('session_analytics')
      .upsert([enrichedSessionAnalytics], { onConflict: 'tryon_session_id' });

    if (analyticsError) {
      console.warn('⚠️ Upsert enriquecido em session_analytics falhou. Tentando fallback básico...', analyticsError);
      const fallbackResult = await supabaseClient
        .from('session_analytics')
        .upsert([baseSessionAnalytics], { onConflict: 'tryon_session_id' });
      analyticsError = fallbackResult.error;
    }

    if (analyticsError) {
      console.warn('⚠️ Falha ao salvar session_analytics do cálculo de calçados:', analyticsError);
    }

    try {
      const { error: analyticsRpcError } = await supabaseClient.rpc('upsert_session_analytics_from_tryon_payload', {
        payload: {
          id: sessionId,
          user_id: effectiveUserId,
          public_id,
          shop_domain: resolvedShopDomain || null,
          product_id: resolvedProductId,
          product_name: product_name || null,
          collection_handle: collection_handle || null,
          recommended_size: recommendedSize,
          user_measurements: user_measurements
            ? {
                ...user_measurements,
                recommended_size: recommendedSize,
                shop_domain: resolvedShopDomain || null,
              }
            : null,
          created_at: sessionStartTime,
        },
      });

      if (analyticsRpcError) {
        console.warn('⚠️ upsert_session_analytics_from_tryon_payload falhou para calçados:', analyticsRpcError);
      }
    } catch (analyticsRpcUnexpectedError) {
      console.warn('⚠️ Erro inesperado no RPC de analytics para calçados:', analyticsRpcUnexpectedError);
    }

    if (sessionCreatedNow && user_measurements) {
      await supabaseClient
        .from('user_measurements')
        .insert([
          {
            tryon_session_id: sessionId,
            gender: user_measurements.gender || 'unisex',
            height: user_measurements.height || null,
            weight: user_measurements.weight || null,
            body_type_index: user_measurements.body_type_index ?? null,
            fit_preference_index: user_measurements.fit_preference_index ?? null,
            recommended_size: recommendedSize,
          }
        ]);
    }

    if (track_usage) {
      const updatePromises = [
        supabaseClient
          .from('widget_keys')
          .update({
            usage_count: (widgetKeyData.usage_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', widgetKeyData.id)
      ];

      if (isShopifyWidget) {
        updatePromises.push(
          supabaseClient
            .from('shopify_shops')
            .update({
              images_used_month: (subscription.images_used || 0) + 1,
            })
            .eq('shop_domain', widgetKeyShopDomain)
        );
      } else {
        updatePromises.push(
          supabaseClient
            .from('subscriptions')
            .update({
              images_used: (subscription.images_used || 0) + 1,
            })
            .eq('user_id', effectiveUserId)
            .eq('status', 'active')
        );
      }

      await Promise.all(updatePromises);

      try {
        let billingShopDomain: string | null = null;

        if (isShopifyWidget) {
          billingShopDomain = widgetKeyShopDomain;
        } else if (effectiveUserId) {
          const { data: shopifyStore } = await supabaseClient
            .from('shopify_stores')
            .select('store_url')
            .eq('user_id', effectiveUserId)
            .maybeSingle();

          if (shopifyStore?.store_url) {
            billingShopDomain = shopifyStore.store_url;
          }
        }

        if (billingShopDomain) {
          const appUrl = Deno.env.get('SHOPIFY_APP_URL') || 'https://ranging-drill-proper-wayne.trycloudflare.com';

          const billingResponse = await fetch(`${appUrl}/api/billing/usage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              shopDomain: billingShopDomain,
              imagesCount: 1,
            }),
          });

          if (!billingResponse.ok) {
            const errorText = await billingResponse.text().catch(() => '');
            console.error('[Billing] ⚠️ Erro ao registrar uso do cálculo de calçados:', errorText || billingResponse.statusText);
          }
        }
      } catch (billingError) {
        console.error('[Billing] ⚠️ Erro ao processar billing do cálculo de calçados:', billingError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: sessionId,
        recommended_size: recommendedSize,
        usage_tracked: track_usage,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
