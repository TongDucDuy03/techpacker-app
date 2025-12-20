import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

/**
 * Image compression utility for PDF generation
 * Compresses images to reduce PDF file size
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_OPTIONS: Required<ImageCompressionOptions> = {
  maxWidth: 1200, // Max width for PDF images (A4 landscape is ~1050px at 96dpi)
  maxHeight: 800, // Max height for PDF images
  quality: 65, // JPEG quality (0-100, lower = smaller file)
  format: 'jpeg', // Use JPEG for better compression
};

/**
 * Download image from URL and return buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    // Handle data URIs
    if (url.startsWith('data:image/')) {
      const base64Data = url.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    // Handle local file paths
    if (url.startsWith('/uploads/') || url.startsWith('/api/uploads/')) {
      const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4001}`;
      const fullUrl = url.startsWith('http') ? url : `${serverUrl}${url}`;
      const response = await axios.get(fullUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxRedirects: 5,
      });
      return Buffer.from(response.data);
    }

    // Handle absolute URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxRedirects: 5,
      });
      return Buffer.from(response.data);
    }

    // Try as local file path
    try {
      const filePath = path.isAbsolute(url) ? url : path.join(__dirname, '../../uploads', url);
      return await fs.readFile(filePath);
    } catch {
      throw new Error(`Cannot resolve image URL: ${url}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * Compress image buffer using sharp
 */
async function compressImageBuffer(
  imageBuffer: Buffer,
  options: ImageCompressionOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    let pipeline = sharp(imageBuffer);

    // Get image metadata
    const metadata = await pipeline.metadata();
    
    // Skip compression for SVG (vector graphics)
    if (metadata.format === 'svg') {
      return imageBuffer;
    }

    // Resize if needed
    if (metadata.width && metadata.height) {
      const needsResize = 
        metadata.width > opts.maxWidth || 
        metadata.height > opts.maxHeight;

      if (needsResize) {
        pipeline = pipeline.resize({
          width: opts.maxWidth,
          height: opts.maxHeight,
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        });
      }
    }

    // Convert and compress
    if (opts.format === 'jpeg') {
      pipeline = pipeline.jpeg({
        quality: opts.quality,
        mozjpeg: true, // Better compression
        progressive: false, // Smaller file size
      });
    } else if (opts.format === 'png') {
      pipeline = pipeline.png({
        quality: opts.quality,
        compressionLevel: 9, // Max compression
        adaptiveFiltering: true,
      });
    } else if (opts.format === 'webp') {
      pipeline = pipeline.webp({
        quality: opts.quality,
        effort: 6, // Higher effort = better compression
      });
    }

    return await pipeline.toBuffer();
  } catch (error: any) {
    console.warn(`Image compression failed: ${error.message}, using original`);
    return imageBuffer;
  }
}

/**
 * Compress image from URL and return as base64 data URI
 */
export async function compressImageToDataURI(
  imageUrl: string | undefined | null,
  options: ImageCompressionOptions = {}
): Promise<string> {
  if (!imageUrl || imageUrl.trim() === '') {
    return getPlaceholderSVG();
  }

  try {
    // Download image
    const imageBuffer = await downloadImage(imageUrl);
    
    // Compress image
    const compressedBuffer = await compressImageBuffer(imageBuffer, options);
    
    // Convert to base64 data URI
    const base64 = compressedBuffer.toString('base64');
    const format = options.format || 'jpeg';
    return `data:image/${format};base64,${base64}`;
  } catch (error: any) {
    console.warn(`Failed to compress image ${imageUrl}: ${error.message}`);
    // Return placeholder on error
    return getPlaceholderSVG();
  }
}

/**
 * Compress multiple images in parallel (with concurrency limit)
 */
export async function compressImagesBatch(
  imageUrls: (string | undefined | null)[],
  options: ImageCompressionOptions = {},
  concurrency: number = 5
): Promise<string[]> {
  const results: string[] = [];
  
  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < imageUrls.length; i += concurrency) {
    const batch = imageUrls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => compressImageToDataURI(url, options))
    );
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Get placeholder SVG for missing images
 */
function getPlaceholderSVG(width: number = 200, height: number = 150): string {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#f3f4f6"/>
    <text x="50%" y="50%" font-family="Arial" font-size="12" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

