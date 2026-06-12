import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { sendShopifyUninstallEmail } from "../_shared/shopify-uninstall-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Shopify-Welcome-Email-Secret",
};

type UninstallEmailBody = {
  shop_domain?: string;
  shop_name?: string;
  shop_email?: string;
  country_code?: string;
  force?: boolean;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const welcomeSecret = Deno.env.get("SHOPIFY_WELCOME_EMAIL_SECRET")?.trim();
  if (welcomeSecret) {
    const headerSecret = req.headers.get("X-Shopify-Welcome-Email-Secret")?.trim();
    if (headerSecret !== welcomeSecret) {
      return jsonResponse({ error: "Invalid X-Shopify-Welcome-Email-Secret" }, 401);
    }
  }

  let body: UninstallEmailBody;
  try {
    body = (await req.json()) as UninstallEmailBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const shopDomain = body.shop_domain?.trim().toLowerCase();
  const shopName = body.shop_name?.trim();
  const shopEmail = body.shop_email?.trim().toLowerCase();

  if (!shopDomain || !shopName || !shopEmail) {
    return jsonResponse({
      error: "shop_domain, shop_name, and shop_email are required",
    }, 400);
  }

  try {
    const result = await sendShopifyUninstallEmail({
      shopDomain,
      shopName,
      shopEmail,
      countryCode: body.country_code,
      force: body.force,
    });
    return jsonResponse(result);
  } catch (error) {
    console.error("[shopify-uninstall-email] send failed:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Failed to send uninstall email",
    }, 500);
  }
});
