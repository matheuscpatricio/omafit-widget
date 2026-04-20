import { supabase } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

const SIGNED_URL_TTL_SECONDS = 3600;

function decodeStorageObjectPath(encodedPath: string): string {
  return encodedPath
    .split('/')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join('/');
}

function parseSupabaseStorageObjectPath(pathname: string): { bucket: string; objectPath: string } | null {
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

function shouldSignSupabaseStorageObject(bucket: string, objectPath: string): boolean {
  if (bucket === 'self-hosted-results') return true;
  // Bucket tryon-images é privado: qualquer caminho precisa de URL assinada para <img> no dashboard.
  if (bucket === 'tryon-images') return true;
  return false;
}

const projectUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');

export async function resolveSupabaseStorageDisplayUrl(
  rawUrl: string | null | undefined,
  client: SupabaseClient = supabase,
): Promise<string | null> {
  if (!rawUrl) return null;
  if (!projectUrl || !rawUrl.startsWith(projectUrl)) return rawUrl;
  if (rawUrl.includes('/storage/v1/object/sign/')) return rawUrl;

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

  const { data, error } = await client.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.objectPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn('createSignedUrl falhou:', error);
    return rawUrl;
  }

  return data.signedUrl;
}
