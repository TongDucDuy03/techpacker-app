import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

/**
 * Enhanced compression middleware với custom settings cho performance tối ưu
 */
export const compressionMiddleware = compression({
  // Chỉ compress responses >= 1KB
  threshold: 1024,
  
  // Compression level (1-9, 6 là default, 1 nhanh nhất, 9 nén tốt nhất)
  level: 6,
  
  // Memory level (1-9, 8 là default)
  memLevel: 8,
  
  // Chunk size for compression
  chunkSize: 16 * 1024, // 16KB chunks
  
  // Custom filter function để quyết định compress gì
  filter: (req: Request, res: Response) => {
    // Không compress nếu client không hỗ trợ
    if (!req.headers['accept-encoding']) {
      return false;
    }

    // Không compress các file đã được compress
    const contentType = res.getHeader('content-type') as string;
    if (contentType) {
      const skipTypes = [
        'image/',
        'video/',
        'audio/',
        'application/zip',
        'application/gzip',
        'application/x-rar',
        'application/pdf' // PDF files thường đã được compress
      ];
      
      if (skipTypes.some(type => contentType.startsWith(type))) {
        return false;
      }
    }

    // Compress các content types khác
    return compression.filter(req, res);
  }
});

/**
 * Middleware để set cache headers cho static assets
 */
export const cacheHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Cache static assets for 1 year
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Cache API responses for short time
  else if (req.url.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
  }
  // No cache for HTML files
  else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  next();
};

/**
 * Middleware để optimize response headers
 */
export const optimizeHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Remove unnecessary headers
  res.removeHeader('X-Powered-By');
  
  // Add performance headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
};

export default {
  compressionMiddleware,
  cacheHeaders,
  optimizeHeaders
};
