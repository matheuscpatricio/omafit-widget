/**
 * Dispara e-mail de boas-vindas via Edge Function (Zoho Mail).
 * Chamado no afterAuth quando uma loja instala o app pela primeira vez.
 */

const SHOP_INSTALL_QUERY = `#graphql
  query ShopInstallDetails {
    shop {
      name
      email
      contactEmail
      billingAddress {
        countryCodeV2
      }
    }
  }
`;

export async function fetchShopInstallDetails(admin) {
  const response = await admin.graphql(SHOP_INSTALL_QUERY);
  const payload = await response.json();

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((entry) => entry.message).join('; '));
  }

  const shop = payload.data?.shop;
  if (!shop) {
    throw new Error('Shop details not returned by Shopify Admin API');
  }

  return {
    shopName: shop.name,
    shopEmail: shop.contactEmail || shop.email,
    countryCode: shop.billingAddress?.countryCodeV2 ?? null,
  };
}

export async function triggerWelcomeEmail({
  shopDomain,
  shopName,
  shopEmail,
  countryCode,
}) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const welcomeSecret = process.env.SHOPIFY_WELCOME_EMAIL_SECRET;

  if (!supabaseUrl || !welcomeSecret) {
    console.warn('[welcome-email] SUPABASE_URL or SHOPIFY_WELCOME_EMAIL_SECRET not configured');
    return { skipped: true, reason: 'not_configured' };
  }

  if (!shopEmail) {
    console.warn('[welcome-email] missing shop email for', shopDomain);
    return { skipped: true, reason: 'missing_email' };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/shopify-welcome-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Welcome-Email-Secret': welcomeSecret,
    },
    body: JSON.stringify({
      shop_domain: shopDomain,
      shop_name: shopName,
      shop_email: shopEmail,
      country_code: countryCode,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Welcome email request failed (${response.status})`);
  }

  return payload;
}

export async function handleWelcomeEmailAfterAuth({ session, admin }) {
  const shopDetails = await fetchShopInstallDetails(admin);
  return triggerWelcomeEmail({
    shopDomain: session.shop,
    shopName: shopDetails.shopName,
    shopEmail: shopDetails.shopEmail,
    countryCode: shopDetails.countryCode,
  });
}

export { SHOP_INSTALL_QUERY };
