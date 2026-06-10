import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  resolveShopContact,
  sendShopifyUninstallEmail,
} from "../_shared/shopify-uninstall-email.ts";
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

  const valid = await verifyShopifyWebhook(rawBody, hmac, secret);
  if (!valid) {
    return new Response("Invalid webhook signature", { status: 400 });
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

  const shopDomain = (
    shopDomainHeader ??
    payload.myshopify_domain ??
    ""
  ).trim().toLowerCase();

  if (!shopDomain) {
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "missing_shop" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contact = await resolveShopContact(shopDomain, {
    shopName: payload.name,
    shopEmail: payload.customer_email ?? payload.email,
    countryCode: payload.country_code,
  });

  if (!contact) {
    console.error("[shopify-app-uninstalled-webhook] could not resolve shop email", {
      shopDomain,
    });
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "missing_email" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await sendShopifyUninstallEmail({
      shopDomain,
      shopName: contact.shopName,
      shopEmail: contact.shopEmail,
      countryCode: contact.countryCode,
    });

    return new Response(JSON.stringify(result), {
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
