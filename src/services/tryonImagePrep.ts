import { supabase } from '../lib/supabase';
import { readHttpJsonResponse } from '../utils/readHttpJsonResponse';
import { getSupabaseFunctionHeaders, getSupabaseFunctionUrl } from '../utils/supabaseFunctions';
import {
  TRYON_IMAGE_MAX_DIMENSION,
  TRYON_IMAGE_QUALITY,
  TRYON_REMOTE_IMAGE_MAX_DIMENSION,
  TRYON_REMOTE_IMAGE_QUALITY,
} from '../components/tryon/tryonWidgetConstants';

export const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Falha ao converter canvas para blob'));
      }
    }, type, quality);
  });

export const applyMaxWidthSearchParam = (url: URL, width: number) => {
  const existingWidth = Number(url.searchParams.get('width') || '0');
  if (!existingWidth || existingWidth > width) {
    url.searchParams.set('width', String(width));
  }
};

export const getOptimizedRemoteTryOnImageUrl = (rawUrl: string): string => {
  if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    return rawUrl;
  }

  try {
    const parsedUrl = new URL(rawUrl);
    const supabasePublicMarker = '/storage/v1/object/public/';

    if (parsedUrl.pathname.includes(supabasePublicMarker)) {
      const publicPath = parsedUrl.pathname.split(supabasePublicMarker)[1];
      if (publicPath) {
        const optimizedUrl = new URL(`/storage/v1/render/image/public/${publicPath}`, parsedUrl.origin);
        optimizedUrl.searchParams.set('width', String(TRYON_REMOTE_IMAGE_MAX_DIMENSION));
        optimizedUrl.searchParams.set('quality', String(TRYON_REMOTE_IMAGE_QUALITY));
        return optimizedUrl.toString();
      }
    }

    if (parsedUrl.hostname.includes('shopify.com')) {
      applyMaxWidthSearchParam(parsedUrl, TRYON_REMOTE_IMAGE_MAX_DIMENSION);
      return parsedUrl.toString();
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
};

export async function uploadTryOnModelImage(
  blob: Blob,
  options: { fileName?: string; publicId: string; shopDomain: string },
): Promise<string> {
  const metadataResponse = await fetch(getSupabaseFunctionUrl('tryon-upload-url'), {
    method: 'POST',
    headers: getSupabaseFunctionHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      mimeType: blob.type || 'image/jpeg',
      folder: 'tryon-models',
      fileName: options.fileName || 'tryon-model.jpg',
      public_id: options.publicId.trim(),
      shop_domain: options.shopDomain.trim(),
    }),
  });

  const uploadParsed = await readHttpJsonResponse<{
    token?: string;
    path?: string;
    bucket?: string;
    error?: string;
  }>(metadataResponse);
  const uploadMetadata = uploadParsed.data;
  const uploadToken = uploadMetadata?.token;
  const uploadPath = uploadMetadata?.path;
  if (!uploadParsed.ok || !uploadToken || !uploadPath) {
    throw new Error(uploadParsed.error || uploadMetadata?.error || 'Failed to prepare direct upload');
  }
  const { error } = await supabase.storage
    .from(uploadMetadata.bucket || 'tryon-images')
    .uploadToSignedUrl(uploadPath, uploadToken, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(`Failed to upload model image: ${error.message}`);
  }

  const bucket = uploadMetadata.bucket || 'tryon-images';
  const { data: signedRead, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(uploadPath, 7200);

  if (signError || !signedRead?.signedUrl) {
    throw new Error(
      signError?.message || 'Failed to create signed read URL for model image',
    );
  }

  return signedRead.signedUrl;
}

export async function optimizeTryOnImage(file: File): Promise<{ blob: Blob; previewUrl: string; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageElement(objectUrl);
    const longestSide = Math.max(image.width, image.height);
    const scale = longestSide > TRYON_IMAGE_MAX_DIMENSION
      ? TRYON_IMAGE_MAX_DIMENSION / longestSide
      : 1;

    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Falha ao obter contexto do canvas');
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const compressedBlob = await canvasToBlob(canvas, 'image/jpeg', TRYON_IMAGE_QUALITY);
    const shouldUseOriginal =
      scale === 1 &&
      file.type === 'image/jpeg' &&
      compressedBlob.size >= file.size * 0.95;

    const blob = shouldUseOriginal ? file : compressedBlob;
    const previewUrl = URL.createObjectURL(blob);

    return {
      blob,
      previewUrl,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const logTryOnTimings = (label: string, timings?: Record<string, unknown> | null) => {
  if (!timings || typeof timings !== 'object') {
    console.log(`⏱️ ${label}: timings não disponíveis`);
    return;
  }

  console.log(`⏱️ ${label}:`);
  Object.entries(timings).forEach(([key, value]) => {
    console.log(`   • ${key}:`, value);
  });
};

export async function fetchUrlAsTryOnModelFile(url: string): Promise<File> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Falha ao obter imagem do try-on anterior (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return new File([blob], `tryon-chain-person.${type.includes('png') ? 'png' : 'jpg'}`, { type });
}
