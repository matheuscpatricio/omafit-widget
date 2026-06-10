const DEFAULT_GRAPH_VERSION = "v22.0";

export type InstagramContainerStatus = "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";

export class InstagramGraphError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "InstagramGraphError";
  }
}

function graphBase(version: string): string {
  return `https://graph.facebook.com/${version}`;
}

async function graphPost(
  version: string,
  path: string,
  accessToken: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(`${graphBase(version)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string; code?: number; error_subcode?: number } | undefined;
    throw new InstagramGraphError(
      err?.message ?? `Graph API POST ${path} failed (${res.status})`,
      err?.code != null ? String(err.code) : undefined,
      res.status,
      json,
    );
  }
  return json;
}

async function graphGet(
  version: string,
  path: string,
  accessToken: string,
  query: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({ ...query, access_token: accessToken });
  const res = await fetch(`${graphBase(version)}${path}?${qs}`);
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string; code?: number } | undefined;
    throw new InstagramGraphError(
      err?.message ?? `Graph API GET ${path} failed (${res.status})`,
      err?.code != null ? String(err.code) : undefined,
      res.status,
      json,
    );
  }
  return json;
}

export async function waitForContainer(
  version: string,
  containerId: string,
  accessToken: string,
  options: { maxAttempts?: number; delayMs?: number } = {},
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 30;
  const delayMs = options.delayMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const data = await graphGet(version, `/${containerId}`, accessToken, {
      fields: "status_code,status",
    });
    const status = data.status_code as InstagramContainerStatus | undefined;
    if (status === "FINISHED") return;
    if (status === "ERROR" || status === "EXPIRED") {
      throw new InstagramGraphError(
        `Container ${containerId} failed with status ${status}`,
        undefined,
        undefined,
        data,
      );
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new InstagramGraphError(`Container ${containerId} timed out waiting for FINISHED`);
}

export async function createCarouselItemContainer(
  version: string,
  igUserId: string,
  accessToken: string,
  imageUrl: string,
): Promise<string> {
  const data = await graphPost(version, `/${igUserId}/media`, accessToken, {
    image_url: imageUrl,
    is_carousel_item: "true",
  });
  const id = data.id;
  if (typeof id !== "string" || !id) {
    throw new InstagramGraphError("Missing container id for carousel item", undefined, undefined, data);
  }
  await waitForContainer(version, id, accessToken);
  return id;
}

export async function createCarouselContainer(
  version: string,
  igUserId: string,
  accessToken: string,
  childIds: string[],
  caption: string,
  shareToFeed = true,
): Promise<string> {
  if (childIds.length < 2 || childIds.length > 10) {
    throw new InstagramGraphError("Carousel must have between 2 and 10 images");
  }
  const data = await graphPost(version, `/${igUserId}/media`, accessToken, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
    share_to_feed: shareToFeed ? "true" : "false",
  });
  const id = data.id;
  if (typeof id !== "string" || !id) {
    throw new InstagramGraphError("Missing carousel container id", undefined, undefined, data);
  }
  await waitForContainer(version, id, accessToken);
  return id;
}

export async function publishMediaContainer(
  version: string,
  igUserId: string,
  accessToken: string,
  creationId: string,
): Promise<string> {
  const data = await graphPost(version, `/${igUserId}/media_publish`, accessToken, {
    creation_id: creationId,
  });
  const id = data.id;
  if (typeof id !== "string" || !id) {
    throw new InstagramGraphError("Missing published media id", undefined, undefined, data);
  }
  return id;
}

export type PublishCarouselInput = {
  igUserId: string;
  accessToken: string;
  imageUrls: string[];
  caption: string;
  shareToFeed?: boolean;
  graphVersion?: string;
};

export type PublishCarouselResult = {
  mediaId: string;
  childContainerIds: string[];
  carouselContainerId: string;
};

/** Publica carrossel (2–10 imagens) via Instagram Graph API. */
export async function publishInstagramCarousel(input: PublishCarouselInput): Promise<PublishCarouselResult> {
  const version = input.graphVersion ?? Deno.env.get("META_GRAPH_API_VERSION") ?? DEFAULT_GRAPH_VERSION;
  const urls = input.imageUrls.map((u) => u.trim()).filter(Boolean);
  if (urls.length < 2 || urls.length > 10) {
    throw new InstagramGraphError("imageUrls must contain 2 to 10 public HTTPS URLs");
  }
  for (const url of urls) {
    if (!/^https:\/\//i.test(url)) {
      throw new InstagramGraphError(`Invalid image URL (HTTPS required): ${url}`);
    }
  }

  const childContainerIds: string[] = [];
  for (const imageUrl of urls) {
    const id = await createCarouselItemContainer(version, input.igUserId, input.accessToken, imageUrl);
    childContainerIds.push(id);
  }

  const carouselContainerId = await createCarouselContainer(
    version,
    input.igUserId,
    input.accessToken,
    childContainerIds,
    input.caption,
    input.shareToFeed ?? true,
  );

  const mediaId = await publishMediaContainer(
    version,
    input.igUserId,
    input.accessToken,
    carouselContainerId,
  );

  return { mediaId, childContainerIds, carouselContainerId };
}
