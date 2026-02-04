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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📡 Fetching session from database...');
    const { data: sessionData, error: sessionError } = await supabase
      .from('tryon_sessions')
      .select('id, product_id')
      .eq('fashn_prediction_id', predictionId)
      .maybeSingle();

    console.log('📊 Session query result:', {
      hasData: !!sessionData,
      hasError: !!sessionError,
      errorDetails: sessionError ? JSON.stringify(sessionError) : null
    });

    if (sessionError) {
      console.error('❌ Error fetching session:', sessionError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch session',
        details: sessionError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!sessionData) {
      console.error('❌ Session not found for prediction:', predictionId);
      return new Response(JSON.stringify({
        error: 'Session not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: productData } = await supabase
      .from('products')
      .select('user_id')
      .eq('id', sessionData.product_id)
      .maybeSingle();

    const userId = productData?.user_id;

    const { data: globalApiConfig } = await supabase
      .from('api_config')
      .select('key_value')
      .eq('key_name', 'global_fal_api_key')
      .maybeSingle();

    let falApiKey = globalApiConfig?.key_value;

    if (!falApiKey) {
      const { data: userApiConfigs } = await supabase
        .from('api_config')
        .select('key_value')
        .eq('user_id', userId)
        .in('key_name', ['fal_api_key', 'fashn_api_key'])
        .maybeSingle();

      falApiKey = userApiConfigs?.key_value;
    }

    if (!falApiKey) {
      console.error('❌ FAL API key not configured');
      return new Response(JSON.stringify({
        error: 'FAL API key not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    fal.config({
      credentials: falApiKey
    });

    console.log('✅ FAL API key configured');

    try {
      const statusResult = await fal.queue.status("fal-ai/fashn/tryon/v1.6", {
        requestId: predictionId,
        logs: true
      });

      console.log('📡 Fal.ai/fashn status response:', {
        status: statusResult.status,
        hasOutput: !!(statusResult as any).output,
      });

      let dbStatus = 'processing';
      let resultImage = null;

      if (statusResult.status === 'COMPLETED') {
        console.log('🔄 Fetching full result from fal.ai/fashn...');
        const result = await fal.queue.result("fal-ai/fashn/tryon/v1.6", {
          requestId: predictionId
        });

        console.log('📦 Full result from fal.ai/fashn:', {
          hasData: !!result.data,
          requestId: result.requestId,
          dataKeys: result.data ? Object.keys(result.data) : []
        });

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

          const processingEndTime = new Date().toISOString();

          const { data: sessionInfo, error: sessionInfoError } = await supabase
            .from('tryon_sessions')
            .select('session_start_time, processing_start_time, id')
            .eq('fashn_prediction_id', predictionId)
            .maybeSingle();

          const { error: updateError } = await supabase
            .from('tryon_sessions')
            .update({
              fashn_status: 'completed',
              result_image: resultImage,
              processing_end_time: processingEndTime,
              session_end_time: processingEndTime,
            })
            .eq('fashn_prediction_id', predictionId);

          if (updateError) {
            console.error('❌ Database update failed:', updateError);
          } else {
            console.log('✅ Database updated successfully');

            if (sessionInfo && sessionInfo.session_start_time && sessionInfo.processing_start_time) {
              const sessionStartTime = new Date(sessionInfo.session_start_time);
              const processingStartTime = new Date(sessionInfo.processing_start_time);
              const endTime = new Date(processingEndTime);

              const durationSeconds = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 1000);
              const processingTimeSeconds = Math.floor((endTime.getTime() - processingStartTime.getTime()) / 1000);

              await supabase
                .from('session_analytics')
                .update({
                  completed: true,
                  duration_seconds: durationSeconds,
                  processing_time_seconds: processingTimeSeconds,
                })
                .eq('tryon_session_id', sessionInfo.id);

              console.log('✅ Session analytics updated:', { durationSeconds, processingTimeSeconds });
            }
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