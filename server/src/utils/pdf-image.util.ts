import axios from 'axios';
import sharp, { Sharp } from 'sharp';
import NodeCache from 'node-cache';
import config from '../config/config';

export interface ImageOptions {
  width?: number;
  height?: number;
  // sharp.fit typing can be strict across versions; accept any to avoid TS mismatches
  fit?: any;
  background?: {
    r: number;
    g: number;
    b: number;
    alpha?: number;
  };
  timeoutMs?: number;
  headers?: Record<string, string>;
  cacheKey?: string;
}

const imageCache = new NodeCache({
  stdTTL: Number(process.env.PDF_IMAGE_CACHE_TTL || 3600),
  useClones: false,
  maxKeys: 1000
});

const DEFAULT_TIMEOUT = 15_000;
const DEFAULT_BASE_URL = (() => {
  const explicit =
    process.env.PDF_IMAGE_BASE_URL
    || process.env.ASSET_BASE_URL
    || process.env.PUBLIC_BASE_URL
    || process.env.APP_BASE_URL
    || process.env.SERVER_PUBLIC_URL;

  if (explicit) return explicit;

  const port = config.port || 4001;
  return `http://localhost:${port}/api/v1`;
})();

const PLACEHOLDER =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-size="12" fill="#9ca3af" font-family="Arial, sans-serif">
        image unavailable
      </text>
    </svg>`
  ).toString('base64');

function getCacheKey(url: string, options?: ImageOptions) {
  if (options?.cacheKey) return options.cacheKey;
  const width = options?.width || 0;
  const height = options?.height || 0;
  return `pdf:image:${url}:${width}:${height}`;
}

function isDataUri(url: string) {
  return url.startsWith('data:');
}

function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function ensureTrailingSlash(input: string): string {
  return input.endsWith('/') ? input : `${input}/`;
}

function resolveUrl(url: string): string | null {
  if (!url) return null;
  if (isDataUri(url)) return url;
  if (isAbsoluteUrl(url)) return url;
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  try {
    const base = ensureTrailingSlash(DEFAULT_BASE_URL);
    let resolved = new URL(url, base).toString();

    if (url.startsWith('/uploads/') && !resolved.includes('/api/')) {
      const baseUrl = new URL(base);
      resolved = new URL(`/api/v1${url}`, `${baseUrl.protocol}//${baseUrl.host}`).toString();
    }

    return resolved;
  } catch (error) {
    console.warn('Failed to resolve PDF image URL', { url, baseUrl: DEFAULT_BASE_URL, error: (error as Error).message });
    return null;
  }
}

export async function getImageData(
  url: string | undefined | null,
  options?: ImageOptions
): Promise<string | null> {
  if (!url) return null;
  if (isDataUri(url)) return url;

  const resolvedUrl = resolveUrl(url);
  if (!resolvedUrl) return null;

  const cacheKey = getCacheKey(resolvedUrl, options);
  const cached = imageCache.get<string>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || DEFAULT_TIMEOUT);

    const response = await axios.get<ArrayBuffer>(resolvedUrl, {
      responseType: 'arraybuffer',
      signal: controller.signal,
      // axios headers typings are strict in v1; cast to any to accept Record<string,string>
      headers: options?.headers as any,
    });

    clearTimeout(timeout);

    // response.data is an ArrayBuffer; convert to Uint8Array for Buffer.from typing
    let pipeline: Sharp = sharp(Buffer.from(new Uint8Array(response.data as ArrayBuffer)));
    if (options?.width || options?.height) {
      pipeline = pipeline.resize({
        width: options.width,
        height: options.height,
        // Accept any fit from caller (caller may pass sharp.fit.* or a string)
        fit: (options?.fit as any) || (sharp as any).fit.cover,
        background: options?.background,
        withoutEnlargement: true,
      } as any);
    }

    const processed = await pipeline.png().toBuffer();
    const base64 = `data:image/png;base64,${processed.toString('base64')}`;
    imageCache.set(cacheKey, base64);
    return base64;
  } catch (error) {
    console.warn('Failed to fetch/resize image for PDF:', { url: resolvedUrl, originalUrl: url, error: (error as Error).message });
    imageCache.set(cacheKey, PLACEHOLDER);
    return PLACEHOLDER;
  }
}

export function clearImageCache(): void {
  imageCache.flushAll();
}

