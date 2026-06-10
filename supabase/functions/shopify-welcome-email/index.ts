import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { localeFromCountryCode } from "../_shared/locale-from-country.ts";
import { buildWelcomeEmail } from "../_shared/shopify-welcome-templates.ts";
import { sendZohoEmail } from "../_shared/zoho-mail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Shopify-Welcome-Email-Secret",
};

type WelcomeEmailBody = {
  shop_domain?: string;
  shop_name?: string;
  shop_email?: string;
  country_code?: string;
  locale?: "pt" | "es" | "en";
  force?: boolean;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unauthorized(message: string): Response {
  return jsonResponse({ error: message }, 401);
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
      return unauthorized("Invalid X-Shopify-Welcome-Email-Secret");
    }
  }

  let body: WelcomeEmailBody;
  try {
    body = (await req.json()) as WelcomeEmailBody;
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: existingSend, error: lookupError } = await supabase
    .from("shopify_welcome_emails")
    .select("sent_at")
    .eq("shop_domain", shopDomain)
    .maybeSingle();

  if (lookupError) {
    console.error("[shopify-welcome-email] lookup failed:", lookupError);
    return jsonResponse({ error: "Failed to lookup welcome email record" }, 500);
  }

  if (existingSend?.sent_at && !body.force) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "already_sent",
      sent_at: existingSend.sent_at,
    });
  }

  const locale = body.locale ?? localeFromCountryCode(body.country_code);
  const emailContent = buildWelcomeEmail(locale, shopName);

  try {
    const messageId = await sendZohoEmail({
      toAddress: shopEmail,
      subject: emailContent.subject,
      htmlContent: emailContent.html,
      textContent: emailContent.text,
    });

    const sentAt = new Date().toISOString();
    const { error: insertError } = await supabase
      .from("shopify_welcome_emails")
      .upsert(
        {
          shop_domain: shopDomain,
          shop_contact_email: shopEmail,
          shop_country_code: body.country_code?.trim().toUpperCase() ?? null,
          locale,
          zoho_message_id: messageId,
          sent_at: sentAt,
        },
        { onConflict: "shop_domain" },
      );

    if (insertError) {
      console.error("[shopify-welcome-email] tracking insert failed:", insertError);
    }

    await supabase
      .from("shopify_uninstall_emails")
      .delete()
      .eq("shop_domain", shopDomain);

    await supabase
      .from("shopify_shops")
      .update({
        shop_contact_email: shopEmail,
        shop_country_code: body.country_code?.trim().toUpperCase() ?? null,
        welcome_email_sent_at: sentAt,
        updated_at: sentAt,
      })
      .eq("shop_domain", shopDomain);

    return jsonResponse({
      ok: true,
      skipped: false,
      locale,
      message_id: messageId,
      sent_at: sentAt,
    });
  } catch (error) {
    console.error("[shopify-welcome-email] send failed:", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Failed to send welcome email",
    }, 500);
  }
});
