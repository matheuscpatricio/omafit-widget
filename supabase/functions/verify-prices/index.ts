import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
    });

    const priceIds = [
      'price_1SL4RkHmxK0nVXtdMMKHgpCD',
      'price_1SL4RkHmxK0nVXtdgkZXUalu',
      'price_1SL4RkHmxK0nVXtdvywZ4buS',
      'price_1SL4RkHmxK0nVXtdaIluRwms',
    ];

    const results = [];

    for (const priceId of priceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        results.push({
          priceId,
          valid: true,
          amount: price.unit_amount,
          currency: price.currency,
          product: price.product,
        });
      } catch (error: any) {
        results.push({
          priceId,
          valid: false,
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({
      keyPrefix: stripeSecret.substring(0, 8),
      results,
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
