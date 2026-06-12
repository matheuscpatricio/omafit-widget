import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type ResolvedShopContact = {
  shopDomain: string;
  shopName: string;
  shopEmail: string;
  countryCode: string | null;
  emailSource: "payload" | "welcome_emails" | "shopify_shops" | "none";
};

type PayloadLike = {
  name?: string;
  email?: string;
  customer_email?: string;
  country_code?: string;
  myshopify_domain?: string;
};

export async function resolveShopContact(
  supabase: SupabaseClient,
  shopDomainHeader: string | null,
  payload: PayloadLike,
): Promise<ResolvedShopContact> {
  const shopDomain = (
    shopDomainHeader ??
    payload.myshopify_domain ??
    ""
  ).trim().toLowerCase();

  const shopName = payload.name?.trim() || shopDomain;
  const payloadEmail = (
    payload.customer_email ??
    payload.email ??
    ""
  ).trim().toLowerCase();

  let shopEmail = payloadEmail;
  let countryCode = payload.country_code?.trim().toUpperCase() ?? null;
  let emailSource: ResolvedShopContact["emailSource"] = payloadEmail
    ? "payload"
    : "none";

  if (!shopEmail && shopDomain) {
    const { data: welcome } = await supabase
      .from("shopify_welcome_emails")
      .select("shop_contact_email, shop_country_code")
      .eq("shop_domain", shopDomain)
      .maybeSingle();

    if (welcome?.shop_contact_email) {
      shopEmail = welcome.shop_contact_email.trim().toLowerCase();
      countryCode = countryCode ?? welcome.shop_country_code;
      emailSource = "welcome_emails";
    }
  }

  if (!shopEmail && shopDomain) {
    const { data: shop } = await supabase
      .from("shopify_shops")
      .select("shop_contact_email, shop_country_code")
      .eq("shop_domain", shopDomain)
      .maybeSingle();

    if (shop?.shop_contact_email) {
      shopEmail = shop.shop_contact_email.trim().toLowerCase();
      countryCode = countryCode ?? shop.shop_country_code;
      emailSource = "shopify_shops";
    }
  }

  return {
    shopDomain,
    shopName,
    shopEmail,
    countryCode,
    emailSource,
  };
}
