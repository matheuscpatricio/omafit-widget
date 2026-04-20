import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.1";

const SIGNED_URL_TTL_SECONDS = 3600;

function decodeStorageObjectPath(encodedPath: string): string {
  return encodedPath
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

export function parseSupabaseStorageObjectPath(pathname: string): { bucket: string; objectPath: string } | null {
  const publicMatch = pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (publicMatch) {
    return { bucket: publicMatch[1], objectPath: decodeStorageObjectPath(publicMatch[2]) };
  }
  const directMatch = pathname.match(/^\/storage\/v1\/object\/(?!public\/|sign\/)([^/]+)\/(.+)$/);
  if (directMatch) {
    return { bucket: directMatch[1], objectPath: decodeStorageObjectPath(directMatch[2]) };
  }
  return null;
}

export function shouldSignSupabaseStorageObject(bucket: string, objectPath: string): boolean {
  if (bucket === "self-hosted-results") return true;
  if (bucket === "tryon-images" && objectPath.startsWith("self-hosted-results/")) return true;
  return false;
}

export async function signSupabaseStorageObjectUrlIfNeeded(
  supabase: SupabaseClient,
  rawUrl: string,
  projectUrl: string,
): Promise<string> {
  const base = projectUrl.replace(/\/$/, "");
  if (!rawUrl || !base || !rawUrl.startsWith(base)) {
    return rawUrl;
  }
  if (rawUrl.includes("/storage/v1/object/sign/")) {
    return rawUrl;
  }

  let pathname: string;
  try {
    pathname = new URL(rawUrl).pathname;
  } catch {
    return rawUrl;
  }

  const parsed = parseSupabaseStorageObjectPath(pathname);
  if (!parsed || !shouldSignSupabaseStorageObject(parsed.bucket, parsed.objectPath)) {
    return rawUrl;
  }

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.objectPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn("⚠️ createSignedUrl falhou:", error?.message || error, "| bucket=", parsed.bucket);
    return rawUrl;
  }

  return data.signedUrl;
}
