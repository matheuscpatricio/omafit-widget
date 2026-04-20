import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getExtensionFromMimeType(mimeType: string): string {
  const normalized = (mimeType || '').toLowerCase();
  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  return normalized.split('/')[1] || 'bin';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { mimeType, folder } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const safeFolder = folder === 'tryon-garments' ? 'tryon-garments' : 'tryon-models';
    const extension = getExtensionFromMimeType(mimeType || 'image/jpeg');
    const path = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { data, error } = await supabaseClient.storage
      .from('tryon-images')
      .createSignedUploadUrl(path);

    if (error || !data?.token) {
      throw new Error(error?.message || 'Failed to create signed upload URL');
    }

    return new Response(JSON.stringify({
      token: data.token,
      path,
      bucket: 'tryon-images',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Failed to create upload URL',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
