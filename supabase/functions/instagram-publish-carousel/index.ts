import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  InstagramGraphError,
  publishInstagramCarousel,
} from "../_shared/instagram-graph.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Instagram-Publish-Secret",
};

type PublishBody = {
  caption?: string;
  image_urls?: string[];
  share_to_feed?: boolean;
};

function unauthorized(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const publishSecret = Deno.env.get("INSTAGRAM_PUBLISH_SECRET")?.trim();
  if (publishSecret) {
    const headerSecret = req.headers.get("X-Instagram-Publish-Secret")?.trim();
    if (headerSecret !== publishSecret) {
      return unauthorized("Invalid X-Instagram-Publish-Secret");
    }
  }

  const accessToken = Deno.env.get("META_PAGE_ACCESS_TOKEN")?.trim();
  const igUserId = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")?.trim();
  if (!accessToken || !igUserId) {
    return new Response(
      JSON.stringify({
        error: "Missing META_PAGE_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: PublishBody;
  try {
    body = (await req.json()) as PublishBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  const imageUrls = Array.isArray(body.image_urls)
    ? body.image_urls.filter((u): u is string => typeof u === "string")
    : [];

  if (!caption) {
    return new Response(JSON.stringify({ error: "caption is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const result = await publishInstagramCarousel({
      igUserId,
      accessToken,
      imageUrls,
      caption,
      shareToFeed: body.share_to_feed !== false,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        media_id: result.mediaId,
        carousel_container_id: result.carouselContainerId,
        child_container_ids: result.childContainerIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const status = error instanceof InstagramGraphError && error.status ? error.status : 500;
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Publish failed",
        details: error instanceof InstagramGraphError ? error.details : undefined,
      }),
      { status: status >= 400 && status < 600 ? status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
