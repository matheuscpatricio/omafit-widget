import { fal } from "npm:@fal-ai/client";

export type TryOnProviderName = "fal" | "self_hosted";

export type TryOnCategory = "tops" | "bottoms" | "one-pieces";

export interface SubmitTryOnParams {
  provider: TryOnProviderName;
  providerApiKey?: string | null;
  modelImageUrl: string;
  garmentImageUrl: string;
  category: TryOnCategory;
  sessionId?: string;
  publicId?: string;
}

export interface SubmitTryOnResult {
  requestId: string;
  providerStatus: string;
}

export interface TryOnStatusResult {
  providerStatus: string;
  dbStatus: "processing" | "completed" | "failed";
  output: string[] | null;
  error?: string | null;
}

const FAL_MODEL_ID = "fal-ai/fashn/tryon/v1.6";

function getSelfHostedConfig() {
  const baseUrl = (Deno.env.get("SELF_HOSTED_TRYON_URL") || "").trim().replace(/\/$/, "");
  const authToken = Deno.env.get("SELF_HOSTED_TRYON_TOKEN") || "";

  if (!baseUrl) {
    throw new Error("SELF_HOSTED_TRYON_URL is not configured.");
  }

  return { baseUrl, authToken };
}

function getAuthHeaders(authToken: string): HeadersInit {
  return authToken
    ? {
        Authorization: `Bearer ${authToken}`,
      }
    : {};
}

export function resolveTryOnProvider(): TryOnProviderName {
  const provider = (Deno.env.get("TRYON_PROVIDER") || "").toLowerCase().replace(/-/g, "_");
  const selfHostedUrl = (Deno.env.get("SELF_HOSTED_TRYON_URL") || "").trim();

  // fal explícito sempre vence
  if (provider === "fal") return "fal";

  // self_hosted: TRYON_PROVIDER=self_hosted (ou self-hosted) OU SELF_HOSTED_TRYON_URL configurado
  if (provider === "self_hosted" || selfHostedUrl) return "self_hosted";

  return "fal";
}

export function inferTryOnCategory(collectionHandle?: string | null): TryOnCategory {
  const normalized = (collectionHandle || "").toLowerCase();

  if (
    normalized.includes("lower") ||
    normalized.includes("bottom") ||
    normalized.includes("pants") ||
    normalized.includes("short") ||
    normalized.includes("skirt")
  ) {
    return "bottoms";
  }

  if (
    normalized.includes("full") ||
    normalized.includes("dress") ||
    normalized.includes("one-piece") ||
    normalized.includes("onepiece") ||
    normalized.includes("jumpsuit")
  ) {
    return "one-pieces";
  }

  return "tops";
}

export async function submitTryOnJob(params: SubmitTryOnParams): Promise<SubmitTryOnResult> {
  if (params.provider === "self_hosted") {
    const { baseUrl, authToken } = getSelfHostedConfig();
    const response = await fetch(`${baseUrl}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(authToken),
      },
      body: JSON.stringify({
        person_image_url: params.modelImageUrl,
        garment_image_url: params.garmentImageUrl,
        category: params.category,
        session_id: params.sessionId,
        public_id: params.publicId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit to self-hosted try-on: ${errorText}`);
    }

    const payload = await response.json();
    if (!payload?.job_id) {
      throw new Error("Self-hosted try-on did not return job_id.");
    }

    return {
      requestId: payload.job_id,
      providerStatus: payload.status || "queued",
    };
  }

  if (!params.providerApiKey) {
    throw new Error("FAL API key not configured. Please configure your API key in the dashboard settings.");
  }

  fal.config({
    credentials: params.providerApiKey,
  });

  const result = await fal.queue.submit(FAL_MODEL_ID, {
    input: {
      model_image: params.modelImageUrl,
      garment_image: params.garmentImageUrl,
      // Use the category resolved by the edge function (tops/bottoms/one-pieces).
      category: params.category,
      mode: "performance",
      garment_photo_type: "auto",
      moderation_level: "none",
      num_samples: 1,
      segmentation_free: true,
      output_format: "png",
    },
  });

  return {
    requestId: result.request_id,
    providerStatus: "IN_PROGRESS",
  };
}

export async function getTryOnStatus(params: {
  provider: TryOnProviderName;
  requestId: string;
  providerApiKey?: string | null;
}): Promise<TryOnStatusResult> {
  if (params.provider === "self_hosted") {
    const { baseUrl, authToken } = getSelfHostedConfig();
    const response = await fetch(`${baseUrl}/jobs/${params.requestId}`, {
      headers: {
        ...getAuthHeaders(authToken),
      },
    });

    if (response.status === 404) {
      return {
        providerStatus: "NOT_FOUND",
        dbStatus: "failed",
        output: null,
        error: "Prediction not found - may have expired",
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Self-hosted status check failed: ${errorText}`);
    }

    const payload = await response.json();
    const status = String(payload?.status || "processing").toLowerCase();

    if (status === "completed") {
      return {
        providerStatus: "COMPLETED",
        dbStatus: "completed",
        output: payload?.result_url ? [payload.result_url] : null,
      };
    }

    if (status === "failed") {
      return {
        providerStatus: "FAILED",
        dbStatus: "failed",
        output: null,
        error: payload?.error || "Self-hosted try-on job failed",
      };
    }

    return {
      providerStatus: status === "queued" ? "QUEUED" : "IN_PROGRESS",
      dbStatus: "processing",
      output: null,
    };
  }

  if (!params.providerApiKey) {
    throw new Error("FAL API key not configured");
  }

  fal.config({
    credentials: params.providerApiKey,
  });

  const statusResult = await fal.queue.status(FAL_MODEL_ID, {
    requestId: params.requestId,
    logs: true,
  });

  if (statusResult.status === "COMPLETED") {
    const result = await fal.queue.result(FAL_MODEL_ID, {
      requestId: params.requestId,
    });
    const imageUrl =
      result.data?.image?.url ||
      result.data?.images?.[0]?.url ||
      null;

    return {
      providerStatus: statusResult.status,
      dbStatus: imageUrl ? "completed" : "processing",
      output: imageUrl ? [imageUrl] : null,
    };
  }

  if (statusResult.status === "FAILED") {
    return {
      providerStatus: statusResult.status,
      dbStatus: "failed",
      output: null,
      error: "Fal.ai/FASHN processing failed",
    };
  }

  return {
    providerStatus: statusResult.status,
    dbStatus: "processing",
    output: null,
  };
}
