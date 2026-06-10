import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { localeFromCountryCode } from "./locale-from-country.ts";
import { buildUninstallFeedbackEmail } from "./shopify-uninstall-templates.ts";
import { sendZohoEmail } from "./zoho-mail.ts";

export type UninstallEmailInput = {
  shopDomain: string;
  shopName: string;
  shopEmail: string;
  countryCode?: string | null;
  force?: boolean;
};

export type UninstallEmailResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  locale?: string;
  message_id?: string;
  sent_at?: string;
};

function getSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

export async function resolveShopContact(
  shopDomain: string,
  payload: {
    shopName?: string;
    shopEmail?: string;
    countryCode?: string | null;
  },
): Promise<{ shopName: string; shopEmail: string; countryCode: string | null } | null> {
  const normalizedDomain = shopDomain.trim().toLowerCase();
  let shopName = payload.shopName?.trim() || "";
  let shopEmail = payload.shopEmail?.trim().toLowerCase() || "";
  let countryCode = payload.countryCode?.trim().toUpperCase() ?? null;

  const supabase = getSupabase();

  if (!shopEmail || !countryCode) {
    const { data: welcome } = await supabase
      .from("shopify_welcome_emails")
      .select("shop_contact_email, shop_country_code")
      .eq("shop_domain", normalizedDomain)
      .maybeSingle();

    if (!shopEmail && welcome?.shop_contact_email) {
      shopEmail = welcome.shop_contact_email.trim().toLowerCase();
    }
    if (!countryCode && welcome?.shop_country_code) {
      countryCode = welcome.shop_country_code;
    }
  }

  if (!shopEmail || !countryCode) {
    const { data: shop } = await supabase
      .from("shopify_shops")
      .select("shop_contact_email, shop_country_code")
      .eq("shop_domain", normalizedDomain)
      .maybeSingle();

    if (!shopEmail && shop?.shop_contact_email) {
      shopEmail = shop.shop_contact_email.trim().toLowerCase();
    }
    if (!countryCode && shop?.shop_country_code) {
      countryCode = shop.shop_country_code;
    }
  }

  if (!shopEmail) {
    return null;
  }

  return {
    shopName: shopName || normalizedDomain,
    shopEmail,
    countryCode,
  };
}

export async function sendShopifyUninstallEmail(
  input: UninstallEmailInput,
): Promise<UninstallEmailResult> {
  const shopDomain = input.shopDomain.trim().toLowerCase();
  const shopName = input.shopName.trim();
  const shopEmail = input.shopEmail.trim().toLowerCase();

  if (!shopDomain || !shopName || !shopEmail) {
    throw new Error("shopDomain, shopName, and shopEmail are required");
  }

  const supabase = getSupabase();

  const { data: existingSend, error: lookupError } = await supabase
    .from("shopify_uninstall_emails")
    .select("sent_at")
    .eq("shop_domain", shopDomain)
    .maybeSingle();

  if (lookupError) {
    throw new Error("Failed to lookup uninstall email record");
  }

  if (existingSend?.sent_at && !input.force) {
    return {
      ok: true,
      skipped: true,
      reason: "already_sent",
      sent_at: existingSend.sent_at,
    };
  }

  const locale = localeFromCountryCode(input.countryCode);
  const emailContent = buildUninstallFeedbackEmail(locale, shopName);

  const messageId = await sendZohoEmail({
    toAddress: shopEmail,
    subject: emailContent.subject,
    htmlContent: emailContent.html,
    textContent: emailContent.text,
  });

  const sentAt = new Date().toISOString();

  const { error: insertError } = await supabase
    .from("shopify_uninstall_emails")
    .upsert(
      {
        shop_domain: shopDomain,
        shop_contact_email: shopEmail,
        shop_country_code: input.countryCode?.trim().toUpperCase() ?? null,
        locale,
        zoho_message_id: messageId,
        sent_at: sentAt,
      },
      { onConflict: "shop_domain" },
    );

  if (insertError) {
    console.error("[shopify-uninstall-email] tracking insert failed:", insertError);
  }

  await supabase
    .from("shopify_welcome_emails")
    .delete()
    .eq("shop_domain", shopDomain);

  await supabase
    .from("shopify_shops")
    .update({
      shop_contact_email: shopEmail,
      shop_country_code: input.countryCode?.trim().toUpperCase() ?? null,
      welcome_email_sent_at: null,
      billing_status: "cancelled",
      updated_at: sentAt,
    })
    .eq("shop_domain", shopDomain);

  return {
    ok: true,
    skipped: false,
    locale,
    message_id: messageId,
    sent_at: sentAt,
  };
}
