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
    const { model_image, garment_image, customer_email, product_name, product_id, public_id } = await req.json();

    if (!model_image || !garment_image) {
      throw new Error('model_image and garment_image are required');
    }

    if (!public_id) {
      throw new Error('public_id is required. Please generate a valid widget code from your Omafit dashboard.');
    }

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      throw new Error('FAL_KEY not configured');
    }

    fal.config({
      credentials: falKey
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: widgetKeyData, error: widgetKeyError } = await supabaseClient
      .from('widget_keys')
      .select('id, user_id, status, usage_count')
      .eq('public_id', public_id)
      .maybeSingle();

    if (widgetKeyError) {
      throw new Error('Error validating widget');
    }

    if (!widgetKeyData) {
      throw new Error('Invalid widget. Please check your widget code or generate a new one from your Omafit dashboard.');
    }

    if (widgetKeyData.status !== 'active') {
      throw new Error('This widget has been deactivated. Please contact the store owner or generate a new widget.');
    }

    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .select('images_limit, images_used, status, period_end')
      .eq('user_id', widgetKeyData.user_id)
      .eq('status', 'active')
      .maybeSingle();

    if (subscriptionError) {
      throw new Error('Error checking subscription status');
    }

    if (!subscription) {
      throw new Error('No active subscription found. Please subscribe to a plan to use the try-on feature.');
    }

    const now = new Date();
    const periodEnd = new Date(subscription.period_end);
    if (now > periodEnd) {
      throw new Error('Your subscription period has expired. Please renew your subscription.');
    }

    if (subscription.images_limit !== -1 && subscription.images_used >= subscription.images_limit) {
      throw new Error('You have reached your monthly image limit. Please upgrade your plan or wait for the next billing cycle.');
    }

    const { data: session, error: sessionError } = await supabaseClient
      .from('tryon_sessions')
      .insert([
        {
          product_id,
          customer_email,
          model_image,
          fashn_status: 'processing',
        }
      ])
      .select()
      .single();

    if (sessionError) {
      throw new Error('Failed to create try-on session');
    }

    console.log('🚀 Submitting to fal.ai with input:', {
      person_image_url: model_image.substring(0, 50) + '...',
      clothing_image_url: garment_image.substring(0, 50) + '...',
      preserve_pose: true
    });

    const { request_id } = await fal.queue.submit("fal-ai/image-apps-v2/virtual-try-on", {
      input: {
        person_image_url: model_image,
        clothing_image_url: garment_image,
        preserve_pose: true
        aspect_ratio: 3:4
      }
    });

    console.log('✅ Submitted to fal.ai, request_id:', request_id);

    await supabaseClient
      .from('tryon_sessions')
      .update({
        fashn_prediction_id: request_id,
        fashn_status: 'processing'
      })
      .eq('id', session.id);

    await Promise.all([
      supabaseClient
        .from('widget_keys')
        .update({
          usage_count: widgetKeyData.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', widgetKeyData.id),

      supabaseClient
        .from('subscriptions')
        .update({
          images_used: subscription.images_used + 1
        })
        .eq('user_id', widgetKeyData.user_id)
        .eq('status', 'active')
    ]);

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
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});