import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveShopContact } from "../_shared/shopify-shop-contact.ts";
import { sendShopifyUninstallEmail } from "../_shared/shopify-uninstall-email.ts";
import { verifyShopifyWebhook } from "../_shared/shopify-webhook-verify.ts";

type ShopifyShopPayload = {
  name?: string;
  email?: string;
  customer_email?: string;
  country_code?: string;
  myshopify_domain?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secret = Deno.env.get("SHOPIFY_API_SECRET")?.trim();
  if (!secret) {
    console.error("[shopify-app-uninstalled-webhook] missing SHOPIFY_API_SECRET");
    return new Response("Server misconfigured", { status: 500 });
  }

  const rawBody = await req.text();
  const hmac = req.headers.get("X-Shopify-Hmac-Sha256");
  const topic = req.headers.get("X-Shopify-Topic");
  const shopDomainHeader = req.headers.get("X-Shopify-Shop-Domain");

  console.log("[shopify-app-uninstalled-webhook] received", {
    topic,
    shop: shopDomainHeader,
    bodyLength: rawBody.length,
  });

  const valid = await verifyShopifyWebhook(rawBody, hmac, secret);
  if (!valid) {
    console.error("[shopify-app-uninstalled-webhook] invalid HMAC", {
      topic,
      shop: shopDomainHeader,
      hasHmac: Boolean(hmac),
    });
    return new Response("Invalid webhook signature", { status: 401 });
  }

  if (topic !== "app/uninstalled") {
    return new Response(JSON.stringify({ ok: true, ignored: true, topic }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: ShopifyShopPayload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) as ShopifyShopPayload : {};
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const contact = await resolveShopContact(supabase, shopDomainHeader, payload);

  console.log("[shopify-app-uninstalled-webhook] resolved contact", {
    shopDomain: contact.shopDomain,
    emailSource: contact.emailSource,
    hasEmail: Boolean(contact.shopEmail),
  });

  if (!contact.shopDomain || !contact.shopEmail) {
    console.error("[shopify-app-uninstalled-webhook] missing shop domain or email", contact);
    return new Response(JSON.stringify({
      ok: true,
      skipped: true,
      reason: "missing_data",
      email_source: contact.emailSource,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await sendShopifyUninstallEmail({
      shopDomain: contact.shopDomain,
      shopName: contact.shopName,
      shopEmail: contact.shopEmail,
      countryCode: contact.countryCode,
    });

    return new Response(JSON.stringify({ ...result, email_source: contact.emailSource }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[shopify-app-uninstalled-webhook] send failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to send uninstall email",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
