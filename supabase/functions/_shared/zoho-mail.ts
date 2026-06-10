type ZohoTokenResponse = {
  access_token?: string;
  error?: string;
};

type ZohoSendResponse = {
  status?: { code?: number; description?: string };
  data?: { messageId?: string };
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function accountsBaseUrl(): string {
  return (Deno.env.get("ZOHO_ACCOUNTS_URL") ?? "https://accounts.zoho.com").replace(/\/$/, "");
}

function mailApiBaseUrl(): string {
  return (Deno.env.get("ZOHO_MAIL_API_URL") ?? "https://mail.zoho.com").replace(/\/$/, "");
}

async function refreshAccessToken(): Promise<string> {
  const clientId = Deno.env.get("ZOHO_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("ZOHO_CLIENT_SECRET")?.trim();
  const refreshToken = Deno.env.get("ZOHO_REFRESH_TOKEN")?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, or ZOHO_REFRESH_TOKEN");
  }

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const response = await fetch(`${accountsBaseUrl()}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const payload = (await response.json()) as ZohoTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error ?? `Zoho token refresh failed (${response.status})`);
  }

  cachedAccessToken = {
    token: payload.access_token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };

  return payload.access_token;
}

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.token;
  }
  return refreshAccessToken();
}

export type SendZohoEmailInput = {
  toAddress: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  fromAddress?: string;
};

export async function sendZohoEmail(input: SendZohoEmailInput): Promise<string> {
  const accountId = Deno.env.get("ZOHO_ACCOUNT_ID")?.trim();
  const fromAddress = (input.fromAddress ?? Deno.env.get("ZOHO_FROM_ADDRESS") ?? "contato@omafit.co").trim();

  if (!accountId) {
    throw new Error("Missing ZOHO_ACCOUNT_ID");
  }

  const accessToken = await getAccessToken();
  const response = await fetch(`${mailApiBaseUrl()}/api/accounts/${accountId}/messages`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    body: JSON.stringify({
      fromAddress,
      toAddress: input.toAddress,
      subject: input.subject,
      content: input.htmlContent,
      mailFormat: "html",
      askReceipt: "no",
    }),
  });

  const payload = (await response.json()) as ZohoSendResponse;
  if (!response.ok || payload.status?.code !== 200) {
    throw new Error(
      payload.status?.description ?? `Zoho Mail send failed (${response.status})`,
    );
  }

  return payload.data?.messageId ?? "sent";
}
