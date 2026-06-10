#!/usr/bin/env node
/**
 * Publica carrossel no Instagram via Graph API (local / CI).
 *
 * Uso:
 *   node scripts/instagram-publish-carousel.mjs \
 *     --caption "Texto do post" \
 *     --images "https://url1.jpg,https://url2.jpg"
 *
 * Env obrigatórias:
 *   META_PAGE_ACCESS_TOKEN
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID
 */

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || "v22.0";
const BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function parseArgs(argv) {
  const out = { caption: "", images: [] };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--caption" && argv[i + 1]) {
      out.caption = argv[++i];
    } else if (argv[i] === "--images" && argv[i + 1]) {
      out.images = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return out;
}

async function graphPost(path, token, params) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${BASE}${path}`, { method: "POST", body });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `POST ${path} failed (${res.status})`);
  }
  return json;
}

async function graphGet(path, token, query = {}) {
  const qs = new URLSearchParams({ ...query, access_token: token });
  const res = await fetch(`${BASE}${path}?${qs}`);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `GET ${path} failed (${res.status})`);
  }
  return json;
}

async function waitFinished(containerId, token) {
  for (let i = 0; i < 30; i++) {
    const data = await graphGet(`/${containerId}`, token, { fields: "status_code" });
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`Container ${containerId}: ${data.status_code}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timeout waiting for ${containerId}`);
}

async function main() {
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim();
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();
  if (!token || !igUserId) {
    console.error("Defina META_PAGE_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ACCOUNT_ID");
    process.exit(1);
  }

  const { caption, images } = parseArgs(process.argv);
  if (!caption || images.length < 2 || images.length > 10) {
    console.error("Use --caption e --images com 2 a 10 URLs HTTPS públicas");
    process.exit(1);
  }

  const childIds = [];
  for (const imageUrl of images) {
    console.log("Criando item:", imageUrl.slice(0, 60), "...");
    const item = await graphPost(`/${igUserId}/media`, token, {
      image_url: imageUrl,
      is_carousel_item: "true",
    });
    await waitFinished(item.id, token);
    childIds.push(item.id);
  }

  console.log("Montando carrossel...");
  const carousel = await graphPost(`/${igUserId}/media`, token, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
    share_to_feed: "true",
  });
  await waitFinished(carousel.id, token);

  console.log("Publicando...");
  const published = await graphPost(`/${igUserId}/media_publish`, token, {
    creation_id: carousel.id,
  });

  console.log("Publicado. media_id:", published.id);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
