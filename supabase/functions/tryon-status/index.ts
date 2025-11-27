import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { fal } from "npm:@fal-ai/client";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const predictionId = pathParts[pathParts.length - 1];

    if (!predictionId) {
      return new Response(JSON.stringify({
        error: 'Missing prediction ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Checking status for prediction:', predictionId);

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) {
      console.error('❌ FAL_KEY not configured');
      return new Response(JSON.stringify({
        error: 'API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    fal.config({
      credentials: falKey
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
      // First check status
      const statusResult = await fal.queue.status("fal-ai/image-apps-v2/virtual-try-on", {
        requestId: predictionId,
        logs: true
      });

      console.log('📡 Fal.ai status response:', {
        status: statusResult.status,
        hasOutput: !!(statusResult as any).output,
      });

      let dbStatus = 'processing';
      let resultImage = null;

      if (statusResult.status === 'COMPLETED') {
        // Get the full result with the image
        console.log('🔄 Fetching full result from fal.ai...');
        const result = await fal.queue.result("fal-ai/image-apps-v2/virtual-try-on", {
          requestId: predictionId
        });

        console.log('📦 Full result from fal.ai:', {
          hasData: !!result.data,
          requestId: result.requestId,
          dataKeys: result.data ? Object.keys(result.data) : []
        });

        // Extract image from result
        if (result.data && result.data.image && result.data.image.url) {
          dbStatus = 'completed';
          resultImage = result.data.image.url;
          console.log('✅ Image URL found:', resultImage);
        } else if (result.data && result.data.images && result.data.images.length > 0 && result.data.images[0].url) {
          dbStatus = 'completed';
          resultImage = result.data.images[0].url;
          console.log('✅ Image URL found in array:', resultImage);
        } else {
          console.log('⚠️ Result structure:', JSON.stringify(result.data, null, 2));
        }

        if (resultImage) {
          console.log('✅ Try-on completed, updating database');

          const { error: updateError } = await supabase
            .from('tryon_sessions')
            .update({
              fashn_status: 'completed',
              result_image: resultImage
            })
            .eq('fashn_prediction_id', predictionId);

          if (updateError) {
            console.error('❌ Database update failed:', updateError);
          } else {
            console.log('✅ Database updated successfully');
          }
        } else {
          console.log('⚠️ No result image found in output');
        }
      } else if (statusResult.status === 'IN_PROGRESS') {
        dbStatus = 'processing';
        console.log('⏳ Still processing...');
      } else if (statusResult.status === 'FAILED') {
        dbStatus = 'failed';
        console.log('❌ Processing failed');

        await supabase
          .from('tryon_sessions')
          .update({
            fashn_status: 'failed'
          })
          .eq('fashn_prediction_id', predictionId);
      }

      const responseData = {
        prediction_id: predictionId,
        status: dbStatus,
        output: resultImage ? [resultImage] : null,
        fal_status: statusResult.status
      };
      console.log('📤 Returning response:', responseData);

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Status check failed:', error);

      let errorMessage = error.message || 'Unknown error';
      let errorStatus = 'error';

      if (error.message && error.message.includes('not found')) {
        errorStatus = 'not_found';
        errorMessage = 'Prediction not found - may have expired';
      } else if (error.message && error.message.toLowerCase().includes('unprocessable')) {
        errorStatus = 'failed';
        errorMessage = 'Image processing failed - please ensure images are valid and publicly accessible';
      } else if (error.message && error.message.toLowerCase().includes('invalid image')) {
        errorStatus = 'failed';
        errorMessage = 'Invalid image format - please use JPEG or PNG images';
      }

      await supabase
        .from('tryon_sessions')
        .update({
          fashn_status: 'failed'
        })
        .eq('fashn_prediction_id', predictionId);

      return new Response(JSON.stringify({
        prediction_id: predictionId,
        status: errorStatus,
        error: errorMessage
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Status check error:', error);
    return new Response(JSON.stringify({
      error: `Internal server error: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});