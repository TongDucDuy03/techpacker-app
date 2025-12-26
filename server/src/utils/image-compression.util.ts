import sharp from 'sharp';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/config';

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
 * Priority: local filesystem > HTTP request (for /uploads/ paths)
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    // Handle data URIs
    if (url.startsWith('data:image/')) {
      const base64Data = url.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    }

    // Handle absolute URLs (http/https) - always use HTTP
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log(`[downloadImage] Downloading from HTTP: ${url.substring(0, 80)}...`);
      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          maxRedirects: 5,
        });
        return Buffer.from(response.data);
      } catch (error: any) {
        console.warn(`[downloadImage] HTTP download failed for ${url.substring(0, 50)}...: ${error.message}`);
        throw error;
      }
    }

    // Handle /uploads/ and /api/uploads/ paths
    // Priority 1: Try to read from local filesystem (for production stability)
    // Priority 2: Fallback to HTTP request (for cases where file might be on different server)
    if (url.startsWith('/uploads/') || url.startsWith('/api/uploads/')) {
      // Normalize path: remove /api prefix if present
      const normalizedPath = url.startsWith('/api/uploads/') 
        ? url.replace('/api/uploads/', '/uploads/') 
        : url;
      
      // Determine upload directory
      const uploadPath = config.uploadPath || './uploads';
      const uploadDir = path.isAbsolute(uploadPath) 
        ? uploadPath 
        : path.join(__dirname, '../../', uploadPath);
      
      // Extract filename from path (e.g., /uploads/image.jpg -> image.jpg)
      const filename = normalizedPath.replace('/uploads/', '');
      const localFilePath = path.join(uploadDir, filename);
      
      console.log(`[downloadImage] Trying local file for ${url.substring(0, 50)}... → ${localFilePath}`);
      
      // Try reading from local filesystem first
      try {
        await fs.access(localFilePath); // Check if file exists
        const buffer = await fs.readFile(localFilePath);
        console.log(`[downloadImage] ✅ Successfully read local file: ${localFilePath}`);
        return buffer;
      } catch (localError: any) {
        console.warn(`[downloadImage] ⚠️  Local file not found: ${localFilePath}, falling back to HTTP`);
        
        // Fallback to HTTP request
        try {
          const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4001}`;
          const fullUrl = `${serverUrl}${normalizedPath}`;
          console.log(`[downloadImage] Attempting HTTP fallback: ${fullUrl}`);
          const response = await axios.get(fullUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            maxRedirects: 5,
          });
          console.log(`[downloadImage] ✅ HTTP fallback succeeded`);
          return Buffer.from(response.data);
        } catch (httpError: any) {
          console.error(`[downloadImage] ❌ HTTP fallback also failed: ${httpError.message}`);
          throw new Error(`Cannot read image from local filesystem or HTTP: ${localError.message}`);
        }
      }
    }

    // Handle other relative paths - try as local file
    try {
      const uploadPath = config.uploadPath || './uploads';
      const uploadDir = path.isAbsolute(uploadPath) 
        ? uploadPath 
        : path.join(__dirname, '../../', uploadPath);
      const filePath = path.isAbsolute(url) ? url : path.join(uploadDir, url);
      console.log(`[downloadImage] Trying local file path: ${filePath}`);
      return await fs.readFile(filePath);
    } catch (localError: any) {
      console.error(`[downloadImage] ❌ Cannot resolve image URL: ${url}`);
      throw new Error(`Cannot resolve image URL: ${url} (${localError.message})`);
    }
  } catch (error: any) {
    console.error(`[downloadImage] ❌ Failed to download image: ${error.message}`);
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
 * With timeout protection
 */
export async function compressImageToDataURI(
  imageUrl: string | undefined | null,
  options: ImageCompressionOptions = {},
  timeout: number = 30000 // 30 seconds default
): Promise<string> {
  if (!imageUrl || imageUrl.trim() === '') {
    return getPlaceholderSVG();
  }

  try {
    // Add timeout wrapper
    const compressionPromise = (async () => {
      // Download image
      const imageBuffer = await downloadImage(imageUrl!);
      
      // Compress image
      const compressedBuffer = await compressImageBuffer(imageBuffer, options);
      
      // Convert to base64 data URI
      const base64 = compressedBuffer.toString('base64');
      const format = options.format || 'jpeg';
      return `data:image/${format};base64,${base64}`;
    })();

    // Race between compression and timeout
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Image compression timeout')), timeout);
    });

    return await Promise.race([compressionPromise, timeoutPromise]);
  } catch (error: any) {
    console.warn(`Failed to compress image ${imageUrl?.substring(0, 50)}...: ${error.message}`);
    // Return placeholder on error or timeout
    return getPlaceholderSVG();
  }
}

/**
 * Compress multiple images in parallel (with concurrency limit and timeout)
 */
export async function compressImagesBatch(
  imageUrls: (string | undefined | null)[],
  options: ImageCompressionOptions = {},
  concurrency: number = 3, // Reduced default for stability
  timeout: number = 30000 // 30 seconds per image
): Promise<string[]> {
  const results: string[] = [];
  
  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < imageUrls.length; i += concurrency) {
    const batch = imageUrls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(url => compressImageToDataURI(url, options, timeout))
    );
    
    // Extract results, using placeholder for failed compressions
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.warn(`Image compression failed in batch: ${result.reason}`);
        results.push(getPlaceholderSVG());
      }
    });
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

