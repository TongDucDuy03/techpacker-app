import puppeteer, { Browser, Page, BrowserContext } from 'puppeteer';
import path from 'path';
import ejs from 'ejs';
import { ITechPack, IBOMItem, IMeasurement, ISampleMeasurementRound, IHowToMeasure, IColorway, IColorwayPart } from '../models/techpack.model';
import fs from 'fs/promises';
import { compressImageToDataURI, compressImagesBatch } from '../utils/image-compression.util';
import { MeasurementUnit, parseMeasurementValue, formatMeasurementValueAsFraction, formatMeasurementValueNoRound } from '../utils/measurement-format.util';
import getPDFTranslations, { PDFLanguage } from '../utils/pdf-translations';
import { translateOptionValue } from '../utils/pdf-option-translations';

type TechPackForPDF = ITechPack | any;

// Debug logger for PDF export (avoid slowing down exports with heavy console output)
const PDF_DEBUG = process.env.PDF_DEBUG === 'true' || process.env.DEBUG_PDF === 'true';
const pdfLog = (...args: any[]) => {
  if (PDF_DEBUG) console.log(...args);
};
const pdfWarn = (...args: any[]) => {
  if (PDF_DEBUG) console.warn(...args);
};

export interface PDFOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  includeImages?: boolean;
  imageQuality?: number; // 0-100, lower = smaller file
  imageMaxWidth?: number; // Max width in pixels
  imageMaxHeight?: number; // Max height in pixels
  displayHeaderFooter?: boolean;
  chunkSize?: number;
  language?: PDFLanguage;
}

export interface PDFGenerationResult {
  buffer: Buffer;
  filename: string;
  size: number;
  pages: number;
}

class PDFService {
  private browser: Browser | null = null;
  private readonly templateDir: string;
  private readonly maxConcurrent: number = 2;
  private activeGenerations: number = 0;
  private currentLanguage: PDFLanguage = 'en';
  
  // Export locks per techpackId to prevent concurrent exports
  // Auto-release locks older than 5 minutes to prevent stuck locks
  private exportLocks: Map<string, { requestId: string; startTime: number }> = new Map();
  private readonly LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  
  // Optimized timeout configurations (in milliseconds)
  private readonly BROWSER_LAUNCH_TIMEOUT = parseInt(process.env.PDF_BROWSER_LAUNCH_TIMEOUT || '300000', 10); // 5 minutes
  private readonly PAGE_SET_CONTENT_TIMEOUT = parseInt(process.env.PDF_PAGE_SET_CONTENT_TIMEOUT || '600000', 10); // 10 minutes
  private readonly PDF_GENERATION_TIMEOUT = parseInt(process.env.PDF_GENERATION_TIMEOUT || '600000', 10); // 10 minutes
  private readonly IMAGE_LOAD_TIMEOUT = parseInt(process.env.PDF_IMAGE_LOAD_TIMEOUT || '30000', 10); // 30 seconds
  private readonly MAX_IMAGES_PARALLEL = parseInt(process.env.PDF_MAX_IMAGES_PARALLEL || '3', 10); // Reduced for stability
  private readonly IMAGE_COMPRESSION_TIMEOUT = parseInt(process.env.PDF_IMAGE_COMPRESSION_TIMEOUT || '30000', 10); // 30 seconds per image

  // Cache for processed images
  private imageCache: Map<string, string> = new Map();
  private templateCache: Map<string, string> = new Map();

  constructor() {
    const possiblePaths = [
      path.join(__dirname, '../templates'),
      path.join(__dirname, '../../src/templates'),
    ];
    
    const fs = require('fs');
    this.templateDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
  }

  /**
   * Initialize browser with optimized settings for large data
   * Auto-relaunch when disconnected
   */
  private async getBrowser(): Promise<Browser> {
    // ✅ Check if browser exists but is disconnected - reset it
    if (this.browser && !this.browser.isConnected()) {
      try {
        await this.browser.close();
      } catch (closeError) {
        // Ignore close errors
      }
      this.browser = null;
      pdfWarn('⚠️  Browser was disconnected, resetting...');
    }

    if (!this.browser) {
      try {
        //this.browser = await puppeteer.launch({
        const launchOptions: any = {
          headless: 'new',
          // executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-web-security',
            '--font-render-hinting=none',
            // ❌ BỎ: '--disable-features=IsolateOrigins,site-per-process', // Không cần, đôi khi làm frame khó đoán
            '--disable-blink-features=AutomationControlled',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--disable-plugins',
            '--js-flags=--max-old-space-size=4096',
            // ❌ BỎ: '--single-process', // BẮT BUỘC bỏ - thủ phạm gây detach/crash
          ],
          timeout: this.BROWSER_LAUNCH_TIMEOUT,
          protocolTimeout: 600000, // 10 minutes for protocol operations
        };

        if (process.env.CHROME_PATH) {
          launchOptions.executablePath = process.env.CHROME_PATH;
          pdfLog(`Using Chrome/Chromium from: ${process.env.CHROME_PATH}`);
        } else {
          pdfLog('Using Puppeteer bundled Chromium');
        }

        this.browser = await puppeteer.launch(launchOptions);
        pdfLog('✅ Browser launched successfully with optimized settings');

        // ✅ Add disconnected listener ONCE when browser is launched
        this.browser.on('disconnected', () => {
          console.error('❌ Puppeteer browser disconnected. Will relaunch on next request.');
          this.browser = null; // Quan trọng: lần sau getBrowser() sẽ launch lại
          this.imageCache.clear();
          this.templateCache.clear();
        });
      } catch (error: any) {
        console.error('Failed to launch browser:', error);
        throw new Error(`Failed to launch Puppeteer browser: ${error.message}`);
      }
    }
    return this.browser;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.imageCache.clear();
      this.templateCache.clear();
    }
  }

  /**
   * Normalize text data with better performance
   */
  private normalizeText(text: any): string {
    if (!text) return '—';
    const str = String(text);
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]|\r\n|\r|\n/g, ' ')
              .replace(/\s+/g, ' ')
              .trim() || '—';
  }

  /**
   * Optimized image URL preparation with caching
   * Now returns compressed data URIs for better PDF size
   * With timeout protection
   */
  private async prepareImageUrlCompressed(
    url?: string, 
    placeholder?: string,
    options?: { quality?: number; maxWidth?: number; maxHeight?: number }
  ): Promise<string> {
    if (!url || url.trim() === '') {
      return placeholder || this.getPlaceholderSVG();
    }

    // Check cache first
    const cacheKey = `${url}_${options?.quality || 65}_${options?.maxWidth || 1200}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    const trimmedUrl = url.trim();
    
    // If already a data URI, try to compress it
    if (trimmedUrl.startsWith('data:image/')) {
      try {
        const compressed = await compressImageToDataURI(trimmedUrl, {
          quality: options?.quality || 65,
          maxWidth: options?.maxWidth || 1200,
          maxHeight: options?.maxHeight || 800,
        }, this.IMAGE_COMPRESSION_TIMEOUT);
        this.imageCache.set(cacheKey, compressed);
        return compressed;
      } catch {
        // If compression fails, return original
        this.imageCache.set(cacheKey, trimmedUrl);
        return trimmedUrl;
      }
    }

    // For URLs, resolve and compress
    let resolvedUrl: string;
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      resolvedUrl = trimmedUrl;
    } else {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4001}`;
      
      if (trimmedUrl.startsWith('/uploads/') || trimmedUrl.startsWith('/api/uploads/')) {
        resolvedUrl = `${serverUrl}${trimmedUrl}`;
      } else if (trimmedUrl.startsWith('/static/')) {
        resolvedUrl = `${baseUrl}${trimmedUrl}`;
      } else if (trimmedUrl.startsWith('/')) {
        resolvedUrl = `${baseUrl}${trimmedUrl}`;
      } else {
        resolvedUrl = `${baseUrl}/${trimmedUrl}`;
      }
    }

    // Compress the image with timeout
    try {
      const compressed = await compressImageToDataURI(resolvedUrl, {
        quality: options?.quality || 65,
        maxWidth: options?.maxWidth || 1200,
        maxHeight: options?.maxHeight || 800,
      }, this.IMAGE_COMPRESSION_TIMEOUT);
      this.imageCache.set(cacheKey, compressed);
      return compressed;
    } catch (error) {
      pdfWarn(`Image compression failed for ${resolvedUrl?.substring(0, 50)}..., using original URL`);
      this.imageCache.set(cacheKey, resolvedUrl);
      return resolvedUrl;
    }
  }

  /**
   * Generate placeholder SVG (cached)
   */
  private getPlaceholderSVG(width: number = 260, height: number = 200): string {
    const key = `placeholder_${width}x${height}`;
    if (this.imageCache.has(key)) {
      return this.imageCache.get(key)!;
    }

    const svg = `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#f3f4f6"/>
        <text x="50%" y="50%" font-family="Arial" font-size="12" fill="#9ca3af" text-anchor="middle" dy=".3em">No Image</text>
      </svg>`
    ).toString('base64')}`;

    this.imageCache.set(key, svg);
    return svg;
  }

  /**
   * Optimized date formatting
   */
  private formatDate(date?: Date | string): string {
    if (!date) return '—';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      const locale = this.currentLanguage === 'vi' ? 'vi-VN' : 'en-US';
      // Show date + time (HH:mm:ss) as requested
      return d.toLocaleString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return '—';
    }
  }

  /**
   * Format a measurement value according to unit for PDF output.
   * - For inch-16 / inch-32: convert decimal to fraction/mixed number string.
   * - For other units: keep numeric value (to preserve existing layout).
   */
  private formatMeasurementForUnit(value: any, unit?: string): string | number {
    if (value === undefined || value === null) return '—';

    // Preserve placeholder strings like '—'
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed === '—' || trimmed === '-') return '—';

      // ⚠️ QUAN TRỌNG: với inch-16 / inch-32, nếu người dùng nhập dạng phân số/hỗn số
      // (ví dụ "92 1/4", "+1/2", "-5 3/4") thì giữ nguyên chuỗi, không parseFloat
      if (unit === 'inch-16' || unit === 'inch-32') {
        if (trimmed.includes('/')) {
          return trimmed;
        }
      }
    }

    const numeric = typeof value === 'number' ? value : parseFloat(String(value));
    if (!Number.isFinite(numeric)) {
      // Fallback: return raw string
      return String(value);
    }

    if (unit === 'inch-16' || unit === 'inch-32') {
      return this.formatInchFraction(Math.abs(numeric), unit);
    }

    // Other units: keep number to preserve existing behavior
    return numeric;
  }

  /**
   * Format tolerance value (always non-negative) for PDF, following UI style:
   * - inch-16 / inch-32: fraction/hỗn số (1 1/4, 3/8, ...)
   * - inch-10: đến 3 chữ số thập phân, bỏ bớt 0 thừa
   * - mm / cm: 1 chữ số thập phân (giống formatToleranceNoUnit phía frontend)
   */
  private formatToleranceForUnit(value: any, unit?: string): string {
    if (value === undefined || value === null) return '0';

    const numeric = typeof value === 'number' ? value : parseFloat(String(value));
    if (!Number.isFinite(numeric)) return '0';

    const abs = Math.abs(numeric);

    if (unit === 'inch-16' || unit === 'inch-32') {
      return this.formatInchFraction(abs, unit as 'inch-16' | 'inch-32');
    }

    if (unit === 'inch-10') {
      return abs.toFixed(3).replace(/\.?0+$/, '');
    }

    // mm / cm: 1 decimal place
    return abs.toFixed(1).replace(/\.0$/, '');
  }

  /**
   * Convert a decimal inch value to a fraction / mixed number string.
   * Supports:
   * - inch-16: sixteenths
   * - inch-32: thirty-seconds
   */
  private formatInchFraction(value: number, unit: 'inch-16' | 'inch-32'): string {
    if (!Number.isFinite(value)) return '—';

    const integerPart = Math.floor(value);
    const decimalPart = value - integerPart;

    const denom = unit === 'inch-32' ? 32 : 16;
    let numerator = Math.round(decimalPart * denom);

    // If rounding pushes to next whole inch (e.g. 0.9999 * 16 ≈ 16)
    if (numerator === denom) {
      return String(integerPart + 1);
    }

    // No fractional part
    if (numerator === 0) {
      return integerPart === 0 ? '0' : String(integerPart);
    }

    // Simplify fraction
    const gcd = (a: number, b: number): number => {
      let x = Math.abs(a);
      let y = Math.abs(b);
      while (y) {
        const temp = y;
        y = x % y;
        x = temp;
      }
      return x || 1;
    };

    const divisor = gcd(numerator, denom);
    const simpleNum = numerator / divisor;
    const simpleDen = denom / divisor;

    const fractionText = `${simpleNum}/${simpleDen}`;
    if (integerPart === 0) {
      return fractionText;
    }
    return `${integerPart} ${fractionText}`;
  }

  /**
   * Optimized BOM data preparation with image compression
   */
  private async prepareBOMDataOptimized(
    bom: IBOMItem[], 
    currency: string,
    techpackColorways: any[] = [],
    imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number }
  ): Promise<any[]> {
    if (!bom || bom.length === 0) return [];
    
    pdfLog(`📋 Processing ${bom.length} BOM items...`);
    const bomByPart: { [key: string]: any[] } = {};

    // Map BOM item -> list of assigned Colorway codes (from Colorways assignment in FE)
    // We prefer mapping by bomItemId on Colorway parts to avoid relying on free-text fields.
    const bomItemIdToColorwayCodes = new Map<string, Set<string>>();
    if (Array.isArray(techpackColorways)) {
      for (const cw of techpackColorways) {
        const cwCode = cw?.code ? this.normalizeText(cw.code) : undefined;
        if (!cwCode) continue;
        const parts = cw?.parts;
        if (!Array.isArray(parts)) continue;
        for (const part of parts) {
          const bomItemId = part?.bomItemId ? String(part.bomItemId) : '';
          if (!bomItemId) continue;
          if (!bomItemIdToColorwayCodes.has(bomItemId)) {
            bomItemIdToColorwayCodes.set(bomItemId, new Set<string>());
          }
          bomItemIdToColorwayCodes.get(bomItemId)!.add(cwCode);
        }
      }
    }
    
    // Collect all image URLs for batch compression
    const imageUrls: string[] = [];
    const imageIndices: number[] = [];
    
    for (let i = 0; i < bom.length; i++) {
      const item = bom[i];
      if (item.imageUrl) {
        imageUrls.push(item.imageUrl);
        imageIndices.push(i);
      }
    }
    
    // Compress all images in parallel with timeout
    pdfLog(`🖼️  Compressing ${imageUrls.length} BOM images...`);
    const compressedImages = await compressImagesBatch(imageUrls, {
      quality: imageOptions?.quality || 65,
      maxWidth: imageOptions?.maxWidth || 800, // Smaller for thumbnails
      maxHeight: imageOptions?.maxHeight || 600,
    }, this.MAX_IMAGES_PARALLEL, this.IMAGE_COMPRESSION_TIMEOUT);
    
    // Create a map of original URL to compressed data URI
    const imageMap = new Map<string, string>();
    imageIndices.forEach((_idx, i) => {
      imageMap.set(imageUrls[i], compressedImages[i]);
    });
    
    for (const item of bom) {
      const partName = this.normalizeText(item.part) || 'Unassigned';
      
      if (!bomByPart[partName]) {
        bomByPart[partName] = [];
      }
      
      const bomItemId = (item as any)?.id ? String((item as any).id) : ((item as any)?._id ? String((item as any)._id) : '');
      const assignedCodesSet = bomItemId ? bomItemIdToColorwayCodes.get(bomItemId) : undefined;
      const assignedColorCode =
        assignedCodesSet && assignedCodesSet.size > 0
          ? Array.from(assignedCodesSet).join(', ')
          : undefined;

      // IMPORTANT: Color Code in PDF should come from assigned Colorway (if any)
      const effectiveColorCode = assignedColorCode || (item.colorCode ? this.normalizeText(item.colorCode) : undefined);

      const colorways: string[] = [];
      if (item.color) {
        const colorText = this.normalizeText(item.color);
        if (effectiveColorCode) {
          colorways.push(`${colorText} (${effectiveColorCode})`);
        } else if (item.pantoneCode) {
          colorways.push(`${colorText} (Pantone: ${this.normalizeText(item.pantoneCode)})`);
        } else {
          colorways.push(colorText);
        }
      }

      const sizeInfo: string[] = [];
      if (item.size) sizeInfo.push(`Size: ${this.normalizeText(item.size)}`);
      if (item.width) sizeInfo.push(`Width: ${this.normalizeText(item.width)}`);

      // Use compressed image if available (with fallback)
      let imageUrl: string;
      if (item.imageUrl) {
        const cached = imageMap.get(item.imageUrl);
        if (cached) {
          imageUrl = cached;
        } else {
          // Fallback with timeout protection
          try {
            imageUrl = await Promise.race([
              this.prepareImageUrlCompressed(item.imageUrl, this.getPlaceholderSVG(64, 64), imageOptions),
              new Promise<string>((resolve) => 
                setTimeout(() => resolve(this.getPlaceholderSVG(64, 64)), this.IMAGE_COMPRESSION_TIMEOUT)
              ),
            ]);
          } catch {
            imageUrl = this.getPlaceholderSVG(64, 64);
          }
        }
      } else {
        imageUrl = this.getPlaceholderSVG(64, 64);
      }

      // Extract hexCode from colorCode if it's a hex color (starts with #)
      let hexCode: string | undefined;
      if (effectiveColorCode) {
        const colorCodeStr = String(effectiveColorCode).trim();
        if (colorCodeStr.startsWith('#') && (colorCodeStr.length === 4 || colorCodeStr.length === 7)) {
          hexCode = colorCodeStr;
        }
      }

      bomByPart[partName].push({
        bomItemId: bomItemId || undefined,
        materialName: this.normalizeText(item.materialName),
        imageUrl,
        placement: this.normalizeText(item.placement),
        sizeWidthUsage: sizeInfo.length > 0 ? sizeInfo.join(' / ') : '—',
        // Quantity: allow blank in PDF when user leaves it empty.
        // Historically some flows stored empty quantity as 0; treat 0 as blank for export to match UX expectation.
        quantity: (() => {
          const q = (item as any).quantity;
          // Only treat truly empty as blank. If user enters 0, export must show 0.
          if (q === null || q === undefined || q === '') return '';
          return q;
        })(),
        uom: this.normalizeText(item.uom),
        supplier: this.normalizeText(item.supplier),
        unitPrice: item.unitPrice ? `${item.unitPrice} ${currency}` : '—',
        totalPrice: item.totalPrice ? `${item.totalPrice} ${currency}` : '—',
        comments: this.normalizeText(item.comments),
        colorways,
        // Add color fields for template compatibility
        color: item.color ? this.normalizeText(item.color) : undefined,
        // Color Code shown in PDF table
        colorCode: effectiveColorCode,
        hexCode: hexCode,
        pantone: item.pantoneCode ? this.normalizeText(item.pantoneCode) : undefined,
        pantoneCode: item.pantoneCode ? this.normalizeText(item.pantoneCode) : undefined,
        materialCode: item.materialCode ? this.normalizeText(item.materialCode) : undefined,
        size: item.size ? this.normalizeText(item.size) : undefined,
        part: item.part ? this.normalizeText(item.part) : undefined,
        thumbnail: imageUrl,
      });
    }

    return Object.keys(bomByPart).map((partName) => ({
      partName,
      items: bomByPart[partName],
    }));
  }

  /**
   * Optimized measurements preparation
   */
  private prepareMeasurementsOptimized(techpack: any): any {
    pdfLog('📏 Processing measurements...');
    const sizeRange = techpack.measurementSizeRange || ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const baseSize = techpack.measurementBaseSize || sizeRange[0] || 'M';
    
    const rows = (techpack.measurements || []).map((measurement: IMeasurement) => {
      const unit = (techpack.measurementUnit as string) || (measurement.unit as string) || 'cm';
      const row: any = {
        pomCode: measurement.pomCode || '—',
        pomName: measurement.pomName || '—',
        measurementType: measurement.measurementType || '—',
        category: measurement.category || '—',
        minusTolerance: measurement.toleranceMinus || 0,
        plusTolerance: measurement.tolerancePlus || 0,
        minusToleranceFormatted: this.formatToleranceForUnit(measurement.toleranceMinus, unit),
        plusToleranceFormatted: this.formatToleranceForUnit(measurement.tolerancePlus, unit),
        notes: measurement.notes || '—',
        critical: measurement.critical || false,
        unit: unit || 'cm',
        sizes: {},
      };

      sizeRange.forEach((size: string) => {
        const rawValue = measurement.sizes?.[size];
        // Luôn dùng measurementUnit cấp TechPack để khớp với UI
        row.sizes[size] = this.formatMeasurementForUnit(
          rawValue,
          techpack.measurementUnit as string
        );
      });

      return row;
    });

    return {
      rows,
      sizeRange,
      baseSize,
      unit: (techpack.measurementUnit as string) || 'cm',
      baseHighlightColor: techpack.measurementBaseHighlightColor || '#dbeafe',
      rowStripeColor: techpack.measurementRowStripeColor || '#f3f4f6',
    };
  }

  /**
   * Format sample round diff value exactly like UI.
   * Reuses the same logic as SampleMeasurementsTable (fraction units vs decimal units).
   */
  private formatDiffDisplay(rawValue: any, unit: MeasurementUnit): string {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return '—';
    }

    const valueStr = String(rawValue);
    const numValue = parseMeasurementValue(valueStr);
    if (numValue === undefined || Number.isNaN(numValue)) {
      // Fallback: return raw string if it cannot be parsed
      return valueStr;
    }

    const isFractionUnit = unit === 'inch-16' || unit === 'inch-32';

    if (isFractionUnit) {
      // Format as fraction with explicit sign (same as UI)
      let display = formatMeasurementValueAsFraction(Math.abs(numValue), unit);
      if (numValue < 0) {
        display = `-${display}`;
      } else if (numValue > 0) {
        display = `+${display}`;
      }
      return display;
    }

    // For cm/mm/inch-10: use the same no-rounding formatter as UI
    return formatMeasurementValueNoRound(numValue, unit);
  }

  /**
   * Optimized sample rounds preparation
   */
  private prepareSampleRoundsOptimized(techpack: any): any[] {
    pdfLog('🔬 Processing sample rounds...');
    const sizeRange = techpack.measurementSizeRange || ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const unit = (techpack.measurementUnit as string) || 'cm';
    
    const measurementMap = new Map<string, IMeasurement>();
    (techpack.measurements || []).forEach((m: IMeasurement) => {
      measurementMap.set(m.pomCode, m);
    });

    return (techpack.sampleMeasurementRounds || []).map((round: ISampleMeasurementRound) => ({
      name: round.name || '—',
      measurementDate: round.measurementDate ? this.formatDate(round.measurementDate) : '—',
      // Prefer explicit reviewer field (stored in techpack) over createdBy population (often not populated in PDF export)
      reviewer: (round.reviewer && String(round.reviewer).trim())
        ? String(round.reviewer).trim()
        : ((round.createdBy as any)?.firstName && (round.createdBy as any)?.lastName
          ? `${(round.createdBy as any).firstName} ${(round.createdBy as any).lastName}`
          : (techpack.updatedByName || techpack.createdByName || '—')),
      requestedSource: round.requestedSource || 'original',
      overallComments: round.overallComments || '—',
      measurements: (round.measurements || []).map((entry: any) => {
        const correspondingMeasurement = measurementMap.get(entry.pomCode);
        const entryRow: any = {
          pomCode: entry.pomCode || '—',
          pomName: entry.pomName || '—',
          toleranceMinus: entry.toleranceMinus !== undefined ? entry.toleranceMinus : (correspondingMeasurement?.toleranceMinus || '—'),
          tolerancePlus: entry.tolerancePlus !== undefined ? entry.tolerancePlus : (correspondingMeasurement?.tolerancePlus || '—'),
          toleranceMinusFormatted: this.formatToleranceForUnit(
            entry.toleranceMinus !== undefined ? entry.toleranceMinus : correspondingMeasurement?.toleranceMinus,
            unit
          ),
          tolerancePlusFormatted: this.formatToleranceForUnit(
            entry.tolerancePlus !== undefined ? entry.tolerancePlus : correspondingMeasurement?.tolerancePlus,
            unit
          ),
          requested: {},
          measured: {},
          diff: {},
          diffDisplay: {},
          revised: {},
          comments: {},
        };

        sizeRange.forEach((size: string) => {
          entryRow.requested[size] = this.formatMeasurementForUnit(entry.requested?.[size], unit);
          entryRow.measured[size] = this.formatMeasurementForUnit(entry.measured?.[size], unit);
          // Keep raw diff value (for potential numeric uses)
          entryRow.diff[size] =
            entry.diff?.[size] !== undefined && entry.diff?.[size] !== null
              ? String(entry.diff?.[size])
              : undefined;
          // And pre-format a display string that matches UI exactly
          entryRow.diffDisplay[size] = this.formatDiffDisplay(entry.diff?.[size], unit as MeasurementUnit);
          entryRow.revised[size] = this.formatMeasurementForUnit(entry.revised?.[size], unit);
          entryRow.comments[size] = entry.comments?.[size] || '—';
        });

        return entryRow;
      }),
    }));
  }

  /**
   * Optimized how to measure preparation with image compression
   */
  private async prepareHowToMeasureOptimized(
    techpack: any,
    imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number }
  ): Promise<any[]> {
    pdfLog('📐 Processing how to measure...');
    const items = techpack.howToMeasure || [];
    
    // Collect image URLs
    const imageUrls = items.map((item: IHowToMeasure) => item.imageUrl).filter(Boolean);
    
    // Compress images in batch with timeout
    if (imageUrls.length > 0) {
      pdfLog(`🖼️  Compressing ${imageUrls.length} how-to-measure images...`);
      const compressedImages = await compressImagesBatch(imageUrls, {
        quality: imageOptions?.quality || 65,
        maxWidth: imageOptions?.maxWidth || 1000,
        maxHeight: imageOptions?.maxHeight || 700,
      }, this.MAX_IMAGES_PARALLEL, this.IMAGE_COMPRESSION_TIMEOUT);
      
      const imageMap = new Map<string, string>();
      imageUrls.forEach((url: string, i: number) => {
        imageMap.set(url, compressedImages[i]);
      });
      
      return items.map((item: IHowToMeasure) => ({
        stepNumber: item.stepNumber || 0,
        pomCode: item.pomCode || '—',
        pomName: item.pomName || '—',
        description: item.description || '—',
        imageUrl: item.imageUrl 
          ? (imageMap.get(item.imageUrl) || this.getPlaceholderSVG())
          : this.getPlaceholderSVG(),
        steps: item.instructions || [],
        tips: item.tips || [],
        commonMistakes: item.commonMistakes || [],
        relatedMeasurements: item.relatedMeasurements || [],
        note: (item as any).note || '',
      }));
    }
    
    return items.map((item: IHowToMeasure) => ({
      stepNumber: item.stepNumber || 0,
      pomCode: item.pomCode || '—',
      pomName: item.pomName || '—',
      description: item.description || '—',
      imageUrl: this.getPlaceholderSVG(),
      steps: item.instructions || [],
      tips: item.tips || [],
      commonMistakes: item.commonMistakes || [],
      relatedMeasurements: item.relatedMeasurements || [],
      note: (item as any).note || '',
    }));
  }

  /**
   * Optimized colorways preparation with image compression
   */
  private async prepareColorwaysOptimized(
    techpack: any,
    imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number }
  ): Promise<any[]> {
    pdfLog('🎨 Processing colorways...');
    const colorways = techpack.colorways || [];
    
    // Collect all image URLs (colorway images + part images)
    const imageUrls: string[] = [];
    const urlToIndex: Map<string, { type: 'colorway' | 'part'; colorwayIdx: number; partIdx?: number }> = new Map();
    
    colorways.forEach((colorway: IColorway, cIdx: number) => {
      if (colorway.imageUrl) {
        imageUrls.push(colorway.imageUrl);
        urlToIndex.set(colorway.imageUrl, { type: 'colorway', colorwayIdx: cIdx });
      }
      (colorway.parts || []).forEach((part: IColorwayPart, pIdx: number) => {
        if (part.imageUrl) {
          imageUrls.push(part.imageUrl);
          urlToIndex.set(part.imageUrl, { type: 'part', colorwayIdx: cIdx, partIdx: pIdx });
        }
      });
    });
    
    // Compress all images with timeout
    if (imageUrls.length > 0) {
      pdfLog(`🖼️  Compressing ${imageUrls.length} colorway images...`);
      const compressedImages = await compressImagesBatch(imageUrls, {
        quality: imageOptions?.quality || 65,
        maxWidth: imageOptions?.maxWidth || 1000,
        maxHeight: imageOptions?.maxHeight || 700,
      }, this.MAX_IMAGES_PARALLEL, this.IMAGE_COMPRESSION_TIMEOUT);
      
      const imageMap = new Map<string, string>();
      imageUrls.forEach((url, i) => {
        imageMap.set(url, compressedImages[i]);
      });
      
      return colorways.map((colorway: IColorway) => ({
        name: colorway.name || '—',
        code: colorway.code || '—',
        pantoneCode: colorway.pantoneCode || '—',
        hexColor: colorway.hexColor || '—',
        rgbColor: colorway.rgbColor ? `rgb(${colorway.rgbColor.r}, ${colorway.rgbColor.g}, ${colorway.rgbColor.b})` : '—',
        supplier: colorway.supplier || '—',
        productionStatus: '—',
        approved: colorway.approved ? 'Yes' : 'No',
        approvalStatus: colorway.approved ? 'Approved' : 'Pending',
        season: colorway.season || techpack.season || '—',
        collectionName: colorway.collectionName || techpack.collectionName || '—',
        notes: colorway.notes || '—',
        imageUrl: colorway.imageUrl 
          ? (imageMap.get(colorway.imageUrl) || this.getPlaceholderSVG())
          : this.getPlaceholderSVG(),
        parts: (colorway.parts || []).map((part: IColorwayPart) => ({
          bomItemId: (part as any).bomItemId ? String((part as any).bomItemId) : undefined,
          partName: part.partName || '—',
          colorName: part.colorName || '—',
          pantoneCode: part.pantoneCode || '—',
          hexCode: part.hexCode || '—',
          rgbCode: part.rgbCode || '—',
          imageUrl: part.imageUrl 
            ? (imageMap.get(part.imageUrl) || this.getPlaceholderSVG())
            : this.getPlaceholderSVG(),
          image: part.imageUrl 
            ? (imageMap.get(part.imageUrl) || this.getPlaceholderSVG())
            : this.getPlaceholderSVG(), // Add 'image' field for template compatibility
          supplier: part.supplier || '—',
          colorType: part.colorType || 'Solid',
        })),
      }));
    }
    
    return colorways.map((colorway: IColorway) => ({
      name: colorway.name || '—',
      code: colorway.code || '—',
      pantoneCode: colorway.pantoneCode || '—',
      hexColor: colorway.hexColor || '—',
      rgbColor: colorway.rgbColor ? `rgb(${colorway.rgbColor.r}, ${colorway.rgbColor.g}, ${colorway.rgbColor.b})` : '—',
      supplier: colorway.supplier || '—',
      productionStatus: '—',
      approved: colorway.approved ? 'Yes' : 'No',
      approvalStatus: colorway.approved ? 'Approved' : 'Pending',
      season: colorway.season || techpack.season || '—',
      collectionName: colorway.collectionName || techpack.collectionName || '—',
      notes: colorway.notes || '—',
      imageUrl: this.getPlaceholderSVG(),
      parts: (colorway.parts || []).map((part: IColorwayPart) => ({
        bomItemId: (part as any).bomItemId ? String((part as any).bomItemId) : undefined,
        partName: part.partName || '—',
        colorName: part.colorName || '—',
        pantoneCode: part.pantoneCode || '—',
        hexCode: part.hexCode || '—',
        rgbCode: part.rgbCode || '—',
        imageUrl: this.getPlaceholderSVG(),
        image: this.getPlaceholderSVG(), // Add 'image' field for template compatibility
        supplier: part.supplier || '—',
        colorType: part.colorType || 'Solid',
      })),
    }));
  }

  /**
   * Fetch revision history with timeout protection
   */
  private async fetchRevisionHistoryAsync(techPackId: any): Promise<any[]> {
    const timeoutMs = 5000;
    
    try {
      const Revision = (await import('../models/revision.model')).default;
      
      const queryPromise = Revision.find({ techPackId })
        .select('version createdBy createdByName createdAt description changes statusAtChange')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .maxTimeMS(4000)
        .lean()
        .exec();
      
      const revisions = await Promise.race([
        queryPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Revision query timeout')), timeoutMs)
        )
      ]);
      
      return revisions.map((rev: any) => ({
        version: rev.version || '—',
        modifiedBy: rev.createdByName || 
          (rev.createdBy?.firstName && rev.createdBy?.lastName 
            ? `${rev.createdBy.firstName} ${rev.createdBy.lastName}` 
            : '—'),
        modifiedAt: this.formatDate(rev.createdAt),
        description: rev.description || (rev.changes?.summary) || '—',
        status: rev.statusAtChange || '—',
      }));
    } catch (error: any) {
      pdfWarn('⚠️ Revision fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Prepare techpack data with parallel processing and image compression
   */
  private async prepareTechPackDataAsync(
    techpack: TechPackForPDF,
    imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number },
    language: PDFLanguage = 'en'
  ): Promise<any> {
    pdfLog('📦 Starting ASYNC data preparation with image compression...');
    const startTime = Date.now();

    const currency = techpack.currency || 'USD';
    const imageQuality = imageOptions?.quality || 65;
    const imageMaxWidth = imageOptions?.maxWidth || 1200;
    const imageMaxHeight = imageOptions?.maxHeight || 800;
    
    // technicalDesignerId is now stored as free-text (name) instead of populated user
    const technicalDesignerName = 
      typeof techpack.technicalDesignerId === 'string'
        ? (techpack.technicalDesignerId || '—')
        : ((techpack.technicalDesignerId as any)?.firstName &&
      (techpack.technicalDesignerId as any)?.lastName
        ? `${(techpack.technicalDesignerId as any).firstName} ${(techpack.technicalDesignerId as any).lastName}`
          : '—');

    const articleSummary = {
      generalInfo: {
        articleCode: techpack.articleCode || '—',
        productName: (techpack as any).articleName || (techpack as any).productName || '—',
        version: (techpack as any).sampleType || (techpack as any).version || '—',
        status: techpack.status || '—',
        lifecycleStage: techpack.lifecycleStage || '—',
        brand: techpack.brand || '—',
        season: techpack.season || '—',
        collection: techpack.collectionName || '—',
        targetMarket: techpack.targetMarket || '—',
        pricePoint: techpack.pricePoint || '—',
        retailPrice: techpack.retailPrice ? `${techpack.retailPrice} ${currency}` : '—',
      },
      technicalInfo: {
        fitType: techpack.fitType || '—',
        productClass: techpack.category || '—',
        supplier: techpack.supplier || '—',
        technicalDesignerId: technicalDesignerName,
        customerId: techpack.customerId || '—',
        ownerId: (techpack.createdBy as any)?.firstName && (techpack.createdBy as any)?.lastName
          ? `${(techpack.createdBy as any).firstName} ${(techpack.createdBy as any).lastName}`
          : '—',
      },
      fabricAndComposition: {
        fabricDescription: techpack.fabricDescription || '—',
        materialInfo: techpack.bom?.find((item: IBOMItem) => 
          item.part?.toLowerCase().includes('main') || item.part?.toLowerCase().includes('fabric')
        )?.materialComposition || '—',
      },
      tracking: {
        createdDate: this.formatDate(techpack.createdAt),
        updatedAt: this.formatDate(techpack.updatedAt),
        createdBy: techpack.createdByName || '—',
        updatedBy: techpack.updatedByName || '—',
      },
    };

    // Compress main images (logo and cover) first with timeout protection
    pdfLog('🖼️  Compressing main images (logo, cover, design sketch)...');
    pdfLog('   - companyLogoUrl:', (techpack as any).companyLogoUrl);
    pdfLog('   - designSketchUrl:', (techpack as any).designSketchUrl);
    pdfLog('   - coverImageUrl (raw):', (techpack as any).coverImageUrl);

    // ✅ FIX: compressedCover và compressedDesignSketch đều dùng designSketchUrl (cover = design sketch trong model này)
    // Nếu có coverImageUrl riêng thì dùng, không thì dùng designSketchUrl cho cả 2
    const coverImageUrl = (techpack as any).coverImageUrl || techpack.designSketchUrl;
    const [compressedLogo, compressedCover, compressedDesignSketch] = await Promise.allSettled([
      this.prepareImageUrlCompressed(techpack.companyLogoUrl, undefined, {
        quality: imageQuality,
        maxWidth: 400, // Logo is smaller
        maxHeight: 200,
      }).catch(() => this.getPlaceholderSVG(400, 200)),
      this.prepareImageUrlCompressed(coverImageUrl, undefined, {
        quality: imageQuality,
        maxWidth: imageMaxWidth,
        maxHeight: imageMaxHeight,
      }).catch(() => this.getPlaceholderSVG()),
      this.prepareImageUrlCompressed(techpack.designSketchUrl, undefined, {
        quality: imageQuality,
        maxWidth: imageMaxWidth,
        maxHeight: imageMaxHeight,
      }).catch(() => this.getPlaceholderSVG()),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : this.getPlaceholderSVG()));

    pdfLog('🚀 Processing data in parallel with image compression...');
    const parallelStart = Date.now();
    
    const [bomParts, measurementData, sampleRounds, howToMeasures, colorways] = await Promise.all([
      this.prepareBOMDataOptimized(techpack.bom || [], currency, techpack.colorways || [], {
        quality: imageQuality,
        maxWidth: 800, // Smaller for BOM thumbnails
        maxHeight: 600,
      }),
      Promise.resolve(this.prepareMeasurementsOptimized(techpack)),
      Promise.resolve(this.prepareSampleRoundsOptimized(techpack)),
      this.prepareHowToMeasureOptimized(techpack, {
        quality: imageQuality,
        maxWidth: imageMaxWidth,
        maxHeight: imageMaxHeight,
      }),
      this.prepareColorwaysOptimized(techpack, {
        quality: imageQuality,
        maxWidth: imageMaxWidth,
        maxHeight: imageMaxHeight,
      }),
    ]);
    
    pdfLog(`✅ Parallel processing completed in ${Date.now() - parallelStart}ms`);

    const uniqueSuppliers = new Set<string>();
    let approvedCount = 0;
    
    bomParts.forEach((part: any) => {
      part.items.forEach((item: any) => {
        if (item.supplier && item.supplier !== '—') {
          uniqueSuppliers.add(item.supplier);
        }
        if (item.approved === 'Yes') {
          approvedCount++;
        }
      });
    });

    const summary = {
      bomCount: bomParts.reduce((sum: number, part: any) => sum + part.items.length, 0),
      uniqueSuppliers: uniqueSuppliers.size,
      approvedMaterials: approvedCount,
      measurementCount: measurementData.rows.length,
      criticalMeasurements: measurementData.rows.filter((r: any) => r.critical).length,
      sizeRange: measurementData.sizeRange.join(', '),
      howToMeasureCount: howToMeasures.length,
      howToMeasureWithImage: howToMeasures.filter((h: any) => h.imageUrl && !h.imageUrl.includes('No Image')).length,
      howToMeasureTips: howToMeasures.reduce((sum: number, h: any) => sum + (h.tips?.length || 0), 0),
      notesCount: 0,
      careSymbolCount: 0,
      lastExport: this.formatDate(new Date()),
    };

    const prepTime = Date.now() - startTime;
    pdfLog(`✅ ASYNC data preparation completed in ${prepTime}ms`);

    const translatedGender = translateOptionValue(language, 'gender', techpack.gender || '—');
    const translatedProductClass = translateOptionValue(language, 'productClass', techpack.category || articleSummary?.technicalInfo?.productClass || '—');
    const translatedFitType = translateOptionValue(language, 'fitType', techpack.fitType || articleSummary?.technicalInfo?.fitType || '—');
    const translatedPricePoint = translateOptionValue(language, 'pricePoint', techpack.pricePoint || articleSummary?.generalInfo?.pricePoint || '—');
    const translatedLifecycleStage = translateOptionValue(language, 'lifecycleStage', techpack.lifecycleStage || techpack.status || '—');

    return {
      meta: {
        productName: (techpack as any).articleName || (techpack as any).productName || '—',
        articleCode: techpack.articleCode || '—',
        version: (techpack as any).sampleType || (techpack as any).version || '—',
        season: techpack.season || '—',
        brand: techpack.brand || '—',
        category: translatedProductClass || techpack.category || '—',
        productClass: translatedProductClass || techpack.category || '—',
        gender: translatedGender || techpack.gender || '—',
        fitType: translatedFitType || techpack.fitType || '—',
        collectionName: techpack.collectionName || '—',
        supplier: techpack.supplier || '—',
        updatedAt: this.formatDate(techpack.updatedAt),
        createdAt: this.formatDate(techpack.createdAt),
        createdByName: techpack.createdByName || '—',
        designSketchUrl: compressedDesignSketch,
        productDescription: techpack.productDescription || techpack.description || '—',
        fabricDescription: techpack.fabricDescription || '—',
        lifecycleStage: translatedLifecycleStage || techpack.lifecycleStage || '—',
        status: techpack.status || '—',
        targetMarket: techpack.targetMarket || '—',
        pricePoint: translatedPricePoint || techpack.pricePoint || '—',
        retailPrice: techpack.retailPrice,
        currency: currency,
        description: techpack.description || techpack.productDescription || '—',
        designer: technicalDesignerName,
        technicalDesignerId: technicalDesignerName, // Add technicalDesignerId to meta for footer template
        companyLogo: compressedLogo, // Add companyLogo to meta for header template
      },
      images: {
        companyLogo: compressedLogo,
        coverImage: compressedCover,
      },
      articleSummary,
      bom: {
        parts: bomParts,
        stats: {
          bomCount: summary.bomCount,
          uniqueSuppliers: summary.uniqueSuppliers,
          approvedMaterials: summary.approvedMaterials,
        },
      },
      measurements: measurementData,
      sampleMeasurementRounds: sampleRounds,
      howToMeasures,
      colorways,
      packingNotes: techpack.packingNotes || '—',
      revisionHistory: [],
      summary,
      printedBy: techpack.updatedByName || techpack.createdByName || 'System',
      generatedAt: this.formatDate(new Date()),
    };
  }

  /**
   * Optimized image loading with parallel processing and timeout
   */
  private async waitForImagesOptimized(page: Page): Promise<void> {
    try {
      // Check if page is still available and ready
      if (page.isClosed()) {
        pdfWarn('Page is closed, skipping image loading');
        return;
      }

      // Wait a bit more to ensure page is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check again after wait
      if (page.isClosed()) {
        pdfWarn('Page closed during wait, skipping image loading');
        return;
      }

      await page.evaluate((timeout: number, maxParallel: number) => {
        return new Promise<void>((resolve) => {
          try {
            const images = Array.from(document.images).filter(img => !img.complete);
            
            if (images.length === 0) {
              resolve();
              return;
            }

            let loaded = 0;
            let timedOut = 0;
            const total = images.length;

            const checkComplete = () => {
              if (loaded + timedOut >= total) {
                pdfLog(`Images loaded: ${loaded}/${total}, timed out: ${timedOut}`);
                resolve();
              }
            };

            const processBatch = (batch: HTMLImageElement[]) => {
              batch.forEach(img => {
                const timeoutId = setTimeout(() => {
                  timedOut++;
                  pdfWarn(`Image timeout: ${img.src.substring(0, 50)}...`);
                  checkComplete();
                }, timeout);

                const cleanup = () => {
                  clearTimeout(timeoutId);
                  loaded++;
                  checkComplete();
                };

                img.onload = cleanup;
                img.onerror = () => {
                  pdfWarn(`Image load error: ${img.src.substring(0, 50)}...`);
                  cleanup();
                };
              });
            };

            for (let i = 0; i < images.length; i += maxParallel) {
              const batch = images.slice(i, i + maxParallel);
              processBatch(batch);
            }

            setTimeout(() => {
              if (loaded + timedOut < total) {
                pdfWarn(`Global image timeout: ${loaded + timedOut}/${total} processed`);
                resolve();
              }
            }, timeout * 2);
          } catch (error) {
            pdfWarn('Error in image loading evaluation:', error);
            resolve(); // Resolve anyway to continue
          }
        });
      }, this.IMAGE_LOAD_TIMEOUT, this.MAX_IMAGES_PARALLEL);
    } catch (error: any) {
      // If page.evaluate fails, it's likely page is closed or not ready
      // Continue anyway as images might already be loaded
      pdfWarn('Image loading error (continuing):', error.message || error);
    }
  }

  /**
   * Generate PDF with full async optimization
   * Each export uses isolated incognito context and page
   */
  async generatePDF(techpack: TechPackForPDF, options: PDFOptions = {}): Promise<PDFGenerationResult> {
    if (this.activeGenerations >= this.maxConcurrent) {
      throw new Error('Maximum concurrent PDF generations reached. Please try again later.');
    }

    // Generate unique request ID for tracking
    const requestId = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const techpackId = (techpack._id || techpack.id)?.toString() || 'unknown';
    
    // Clean up stale locks (older than LOCK_TIMEOUT)
    const now = Date.now();
    for (const [id, lock] of this.exportLocks.entries()) {
      if (now - lock.startTime > this.LOCK_TIMEOUT) {
        pdfWarn(`🧹 Removing stale lock for TechPack ${id} (age: ${Math.round((now - lock.startTime) / 1000)}s)`);
        this.exportLocks.delete(id);
      }
    }
    
    // Check and set lock for this techpack
    if (this.exportLocks.has(techpackId)) {
      const existingLock = this.exportLocks.get(techpackId)!;
      const lockAge = Date.now() - existingLock.startTime;
      throw new Error(
        `PDF export already in progress for this TechPack (requestId: ${existingLock.requestId}, started ${Math.round(lockAge / 1000)}s ago). Please wait for the current export to complete.`
      );
    }

    // Set lock
    this.exportLocks.set(techpackId, { requestId, startTime: Date.now() });
    pdfLog(`🔒 Set export lock for TechPack ${techpackId} [${requestId}]`);

    this.activeGenerations++;
    const totalStartTime = Date.now();
    let page: Page | null = null;
    let context: BrowserContext | null = null;

    try {
      pdfLog('═══════════════════════════════════════════════════════');
      pdfLog(`🚀 Starting ASYNC PDF generation [${requestId}]`);
      pdfLog(`📦 TechPack ID: ${techpackId}`);
      pdfLog('📊 Data sizes:', {
        bom: techpack.bom?.length || 0,
        measurements: techpack.measurements?.length || 0,
        sampleRounds: techpack.sampleMeasurementRounds?.length || 0,
      });
      
      const browser = await this.getBrowser();
      
      // Check browser is still connected
      if (!browser.isConnected()) {
        throw new Error(`Browser is not connected [${requestId}]`);
      }
      
      // ✅ REQUIREMENT 1: Create isolated incognito context for each export
      try {
        context = await browser.createIncognitoBrowserContext();
        pdfLog(`🔒 Created isolated incognito context [${requestId}]`);
      } catch (error: any) {
        throw new Error(`Failed to create incognito context [${requestId}]: ${error.message}`);
      }
      
      // Check context is valid
      if (!context) {
        throw new Error(`Context creation returned null [${requestId}]`);
      }
      
      // ✅ REQUIREMENT 1: Create fresh page in isolated context
      let pageId: string = 'unknown';
      try {
        page = await context.newPage();
        pageId = page.url(); // Use URL as page identifier
        pdfLog(`📄 Created new page in isolated context [${requestId}] [pageId: ${pageId}]`);
      } catch (error: any) {
        // Clean up context if page creation fails
        if (context) {
          try {
            await context.close();
          } catch (closeError) {
            // Ignore close errors
          }
          context = null;
        }
        throw new Error(`Failed to create page in context [${requestId}]: ${error.message}`);
      }
      
      // Set up event listeners for debugging
      // Capture pageId in closure for event listeners
      const capturedPageId = pageId;
      page.on('close', () => {
        pdfLog(`⚠️  Page closed event [${requestId}] [pageId: ${capturedPageId}]`);
      });
      
      page.on('framedetached', (frame) => {
        console.error(`❌ Frame detached event [${requestId}] [pageId: ${capturedPageId}] [frame: ${frame.url()}]`);
      });
      
      // ✅ Add page error handlers for crash detection
      page.on('error', (err) => {
        console.error(`❌ Page crashed [${requestId}] [pageId: ${capturedPageId}]:`, err);
      });
      
      page.on('pageerror', (err) => {
        console.error(`❌ Page runtime error [${requestId}] [pageId: ${capturedPageId}]:`, err);
      });
      
      // ❌ BỎ: browser.on('disconnected') - đã đưa lên getBrowser() để tránh leak listener
      
      // Set timeouts for page operations
      page.setDefaultTimeout(this.PAGE_SET_CONTENT_TIMEOUT);
      page.setDefaultNavigationTimeout(this.PAGE_SET_CONTENT_TIMEOUT);
      
      // ✅ REQUIREMENT 3: Navigate to blank page first (no waitForNavigation after setContent)
      pdfLog(`🔄 Navigating to blank page [${requestId}]`);
      if (page.isClosed()) {
        throw new Error(`Page already closed before navigation [${requestId}]`);
      }
      
      await page.goto('about:blank', { 
        waitUntil: 'domcontentloaded', 
        timeout: 10000 
      });
      
      // Wait a bit to ensure page is fully ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ✅ REQUIREMENT 2: Check page state before operations
      if (page.isClosed()) {
        throw new Error(`Page was closed after navigation [${requestId}]`);
      }
      
      await page.setViewport({ width: 1920, height: 1080 });

      // Get image compression options from PDF options
      const imageOptions = {
        quality: options.imageQuality || 65, // Default to 65 for better compression
        maxWidth: options.imageMaxWidth || 1200,
        maxHeight: options.imageMaxHeight || 800,
      };

      // PARALLEL: Prepare data AND fetch revisions at the same time
      pdfLog('🔄 Running parallel operations...');
      const language: PDFLanguage = options.language === 'vi' ? 'vi' : 'en';
      this.currentLanguage = language;
      const [templateData, revisionHistory] = await Promise.all([
        this.prepareTechPackDataAsync(techpack, imageOptions, language),
        this.fetchRevisionHistoryAsync(techpack._id)
      ]);
      
      templateData.revisionHistory = revisionHistory;
      const translations = getPDFTranslations(language);
      templateData.translations = translations;
      templateData.language = language;
      pdfLog(`✅ Got ${revisionHistory.length} revisions`);

      // Load template
      pdfLog('📄 Loading template...');
      const templatePath = path.join(this.templateDir, 'techpack-full-template.ejs');
      let templateContent: string;
      
      if (this.templateCache.has(templatePath)) {
        templateContent = this.templateCache.get(templatePath)!;
      } else {
        templateContent = await fs.readFile(templatePath, 'utf-8');
        this.templateCache.set(templatePath, templateContent);
      }

      // Render HTML
      pdfLog('🎨 Rendering HTML...');
      const renderStart = Date.now();
      const html = await ejs.render(templateContent, templateData, {
        async: false,
        root: this.templateDir,
      });
      pdfLog(`✅ HTML rendered in ${Date.now() - renderStart}ms`);

      // Load content
      pdfLog(`📥 Loading content into page [${requestId}]`);
      const contentStart = Date.now();
      
      // ✅ REQUIREMENT 2: Check page state before setContent
      if (page.isClosed()) {
        throw new Error(`Page was closed before setContent [${requestId}]`);
      }
      
      // ✅ REQUIREMENT 3: Use domcontentloaded (not networkidle0) - networkidle0 hay gây treo/dao động với nhiều ảnh
      // Images sẽ được đợi riêng bằng waitForImagesOptimized()
      await page.setContent(html, {
        waitUntil: 'domcontentloaded', // Chỉ đợi DOM ready, không đợi network idle
        timeout: this.PAGE_SET_CONTENT_TIMEOUT,
      });
      pdfLog(`✅ Content loaded in ${Date.now() - contentStart}ms [${requestId}]`);

      // Wait for layout to settle and ensure page is stable
      pdfLog(`⏳ Waiting for layout to settle [${requestId}]`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Increased wait time
      
      // ✅ REQUIREMENT 2: Check if page is still available
      if (page.isClosed()) {
        throw new Error(`Page was closed unexpectedly after setContent [${requestId}]`);
      }
      
      // Additional check: wait for page to be fully ready
      try {
        await page.evaluate(() => {
          // Simple check to ensure page is ready
          return document.readyState;
        });
      } catch (error: any) {
        if (error.message?.includes('closed') || error.message?.includes('Session') || error.message?.includes('detached')) {
          throw new Error(`Page session was closed/detached during initialization [${requestId}]: ${error.message}`);
        }
        // Other errors are OK, continue
      }
      
      // Load images
      pdfLog('🖼️  Loading images (with timeout)...');
      const imageStart = Date.now();
      await this.waitForImagesOptimized(page);
      
      // Check again before additional optimization
      if (page.isClosed()) {
        throw new Error('Page was closed during image loading');
      }
      
      // Additional image optimization: compress any remaining large images
      pdfLog('🔧 Optimizing images in page...');
      try {
        await page.evaluate((maxWidth: number, maxHeight: number) => {
        const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
        images.forEach((img) => {
          // Skip if already a data URI (already compressed)
          if (img.src.startsWith('data:image/')) {
            return;
          }
          
          // Create canvas to compress image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;
          
          // Calculate new dimensions
          let newWidth = originalWidth;
          let newHeight = originalHeight;
          
          if (originalWidth > maxWidth || originalHeight > maxHeight) {
            const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
            newWidth = originalWidth * ratio;
            newHeight = originalHeight * ratio;
          }
          
          // Only compress if size reduction is significant
          if (newWidth < originalWidth * 0.9 || newHeight < originalHeight * 0.9) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            try {
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
              img.src = compressedDataUrl;
            } catch (e) {
              // If compression fails, keep original
              pdfWarn('Image compression failed:', e);
            }
          }
        });
      }, imageOptions.maxWidth, imageOptions.maxHeight);
      } catch (error: any) {
        // If page.evaluate fails, continue anyway - images are already compressed
        pdfWarn('Page image optimization failed (continuing):', error.message || error);
      }
      
      pdfLog(`✅ Images processed in ${Date.now() - imageStart}ms`);

      // Run anti-waste script to scale images and prevent page breaks
      try {
        pdfLog('🔧 Running anti-waste script to optimize image placement...');
        await page.evaluate(() => {
          const win = window as any;
          if (typeof win.processAntiWasteImages === 'function') {
            pdfLog('[Anti-waste] Called from Puppeteer');
            win.processAntiWasteImages();
          } else {
            pdfWarn('[Anti-waste] processAntiWasteImages function not found');
          }
        });
        
        // Wait a bit for the script to process images
        await page.waitForTimeout(500);
        
        // Run again to ensure all images are processed
        await page.evaluate(() => {
          const win = window as any;
          if (typeof win.processAntiWasteImages === 'function') {
            win.processAntiWasteImages();
          }
        });
        
        pdfLog('✅ Anti-waste script executed');
      } catch (error: any) {
        pdfWarn('Anti-waste script execution failed (continuing):', error.message || error);
      }

      // Generate PDF
      pdfLog('📄 Generating PDF...');
      const pdfStart = Date.now();
      const pdfOptions: any = {
        format: options.format || 'A4',
        landscape: options.orientation !== 'portrait',
        printBackground: true,
        timeout: this.PDF_GENERATION_TIMEOUT,
        margin: {
          top: options.margin?.top || '10mm',
          bottom: options.margin?.bottom || '15mm', // Tối thiểu 15mm để footer có đủ không gian hiển thị
          left: options.margin?.left || '10mm',
          right: options.margin?.right || '10mm',
        },
        displayHeaderFooter: options.displayHeaderFooter !== false,
        preferCSSPageSize: true,
      };
      
      pdfLog('📋 PDF Options initialized:', {
        displayHeaderFooter: pdfOptions.displayHeaderFooter,
        margin: pdfOptions.margin,
        format: pdfOptions.format,
        landscape: pdfOptions.landscape,
      });

      // Sử dụng footerTemplate của Puppeteer để có số trang tự động
      // Footer trong HTML template sẽ bị ẩn khi dùng footerTemplate
      if (options.displayHeaderFooter !== false) {
        try {
          // Check page is still open before getting templates
          if (page.isClosed()) {
            throw new Error('Page was closed before getting footer template');
          }
          
          // Get footer template
          const footerTemplate = await this.getFooterTemplate(templateData);
          
          // Đảm bảo footer template không rỗng và có pageNumber/totalPages
          if (!footerTemplate || footerTemplate.trim().length === 0) {
            throw new Error('Footer template is empty');
          }
          
          if (!footerTemplate.includes('pageNumber') || !footerTemplate.includes('totalPages')) {
            pdfWarn('⚠️  Footer template missing pageNumber or totalPages - Puppeteer may not render page numbers');
          }
          
          // Set footer template vào pdfOptions
          pdfOptions.footerTemplate = footerTemplate;
          pdfOptions.displayHeaderFooter = true;
          
          pdfLog('✅ Footer template loaded, length:', footerTemplate.length);
          pdfLog('📋 Footer template preview (first 200 chars):', footerTemplate.substring(0, 200));
          pdfLog('📋 Footer template has pageNumber:', footerTemplate.includes('pageNumber'));
          pdfLog('📋 Footer template has totalPages:', footerTemplate.includes('totalPages'));
        } catch (error: any) {
          console.error('❌ Could not load footer template:', error.message || error);
          // Fallback: Tắt footerTemplate nếu có lỗi
          pdfOptions.displayHeaderFooter = false;
        }
      } else {
        pdfOptions.displayHeaderFooter = false;
      }

      // ✅ REQUIREMENT 2: Final check before generating PDF - ensure page is still open
      if (page.isClosed()) {
        throw new Error(`Page was closed before PDF generation [${requestId}]. This may happen if the page takes too long to load.`);
      }

      // Wait a bit more to ensure everything is stable
      await new Promise(resolve => setTimeout(resolve, 500));

      // ✅ REQUIREMENT 2: Final check - if page is closed, we can't generate PDF
      if (page.isClosed()) {
        throw new Error(`Page was closed during final wait before PDF generation [${requestId}]. This usually happens when the page takes too long or encounters an error.`);
      }

      // Try to verify page is still responsive
      try {
        await page.evaluate(() => document.body);
      } catch (error: any) {
        if (error.message?.includes('closed') || error.message?.includes('Session') || error.message?.includes('detached')) {
          throw new Error(`Page session was closed/detached before PDF generation [${requestId}]: ${error.message}`);
        }
      }

      // Log PDF options để debug footer
      pdfLog('📋 PDF Options before generation:', {
        displayHeaderFooter: pdfOptions.displayHeaderFooter,
        hasHeaderTemplate: !!pdfOptions.headerTemplate,
        hasFooterTemplate: !!pdfOptions.footerTemplate,
        margin: pdfOptions.margin,
        format: pdfOptions.format,
        orientation: pdfOptions.orientation,
      });
      
      pdfLog(`📄 Generating PDF [${requestId}]`);
      const pdfBuffer = await page.pdf(pdfOptions);
      pdfLog(`✅ PDF generated in ${Date.now() - pdfStart}ms [${requestId}]`);

      // ✅ REQUIREMENT 2: Close page only after PDF is successfully generated
      // Don't close here - will be closed in finally block

      // Generate filename
      const sampleType = (techpack as any).sampleType || (techpack as any).version || 'V1';
      const filename = `Techpack_${techpack.articleCode}_${sampleType}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

      const totalTime = Date.now() - totalStartTime;
      pdfLog('═══════════════════════════════════════════════════════');
      pdfLog(`✅ PDF GENERATION SUCCESSFUL [${requestId}]`);
      pdfLog(`📦 TechPack ID: ${techpackId}`);
      pdfLog(`📊 Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      pdfLog(`📄 File: ${filename}`);
      pdfLog(`📦 Size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      pdfLog('═══════════════════════════════════════════════════════');

      return {
        buffer: pdfBuffer,
        filename,
        size: pdfBuffer.length,
        pages: Math.ceil(pdfBuffer.length / 10000),
      };
    } catch (error: any) {
      const failedTime = Date.now() - totalStartTime;
      console.error('═══════════════════════════════════════════════════════');
      console.error(`❌ PDF GENERATION FAILED [${requestId}]`);
      console.error(`📦 TechPack ID: ${techpackId}`);
      console.error(`⏱️  Failed after: ${failedTime}ms (${(failedTime / 1000).toFixed(2)}s)`);
      console.error('📋 Error:', error.message);
      console.error('📋 Page closed:', page?.isClosed() || 'N/A');
      console.error('📋 Context exists:', context ? 'Yes' : 'No');
      console.error('═══════════════════════════════════════════════════════');
      
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      // ✅ REQUIREMENT 2: Cleanup an toàn - chỉ đóng trong finally
      // Close page first
      if (page && !page.isClosed()) {
        try {
          pdfLog(`🧹 Closing page [${requestId}]`);
          await page.close();
        } catch (cleanupError: any) {
          // Ignore cleanup errors if page is already closed
          if (!cleanupError.message?.includes('closed') && !cleanupError.message?.includes('detached')) {
            console.error(`Page cleanup error [${requestId}]:`, cleanupError.message || cleanupError);
          }
        }
      }
      page = null;
      
      // Close context (incognito browser context)
      if (context) {
        try {
          pdfLog(`🧹 Closing incognito context [${requestId}]`);
          await context.close();
        } catch (cleanupError: any) {
          console.error(`Context cleanup error [${requestId}]:`, cleanupError.message || cleanupError);
        }
      }
      context = null;
      
      // ✅ REQUIREMENT 2: Always remove lock in finally, even if error occurs early
      if (this.exportLocks.has(techpackId)) {
        this.exportLocks.delete(techpackId);
        pdfLog(`🔓 Released export lock for TechPack ${techpackId} [${requestId}]`);
      }
      
      this.activeGenerations--;
    }
  }

  /**
   * Get header template for PDF
   * NOTE: Currently not used - header/footer are embedded in HTML template
   */
  // @ts-ignore - Kept for potential future use
  private async getHeaderTemplate(data: any): Promise<string> {
    try {
      const headerPath = path.join(this.templateDir, 'partials', 'header.ejs');
      
      if (this.templateCache.has(headerPath)) {
        return ejs.render(this.templateCache.get(headerPath)!, { meta: data.meta });
      }
      
      const headerContent = await fs.readFile(headerPath, 'utf-8');
      this.templateCache.set(headerPath, headerContent);
      return ejs.render(headerContent, { meta: data.meta });
    } catch {
      return '<div style="font-size: 10px; text-align: center; width: 100%; padding: 10px;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>';
    }
  }

  /**
   * Get footer template for PDF
   * Footer content is inlined here to avoid file loading issues across different machines
   */
  private async getFooterTemplate(data: any): Promise<string> {
    try {
      // Inline footer template - no need to load from file
      // Puppeteer yêu cầu footer phải là một dòng HTML hợp lệ (không có line breaks)
      const designerName = data?.meta?.technicalDesignerId || data?.meta?.designer || data?.meta?.technicalDesigner;
      const displayName = (designerName && String(designerName).trim() && designerName !== '—' && designerName !== '-') 
        ? designerName 
        : 'Technical Designer';
      
      // Escape HTML để tránh XSS và đảm bảo hiển thị đúng
      const safeDisplayName = String(displayName)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      // Tạo footer HTML - QUAN TRỌNG: Phải là một dòng duy nhất, không có line breaks
      // Puppeteer yêu cầu footer template phải được format trên một dòng
      const footerHTML = `<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#1e293b;padding:2px 6mm;border-top:1px solid #333;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;background:#fff;height:20px;"><div style="text-align:left;flex:1;font-size:8pt;">Created by: ${safeDisplayName}</div><div style="text-align:center;flex:1;font-weight:600;font-size:8pt;color:#0f172a;">By: iBC connecting</div><div style="text-align:right;flex:1;font-size:8pt;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div></div>`;
      
      // Validate footer có chứa pageNumber và totalPages
      if (!footerHTML.includes('pageNumber') || !footerHTML.includes('totalPages')) {
        pdfWarn('⚠️  Footer template missing pageNumber or totalPages classes');
      }
      
    pdfLog('✅ Footer template generated, length:', footerHTML.length);
    // Avoid dumping full footer HTML to logs (very noisy); enable with PDF_DEBUG if needed.
    pdfLog('📋 Footer template preview (first 200 chars):', footerHTML.substring(0, 200));
      
      return footerHTML;
    } catch (error: any) {
      console.error('❌ Error generating footer template:', error.message || error);
      // Fallback footer với inline styles - đơn giản và chắc chắn hoạt động
      return '<div style="width:100%;font-family:Arial,sans-serif;font-size:8pt;color:#1e293b;padding:2px 6mm;border-top:1px solid #333;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;background:#fff;height:20px;"><div style="text-align:left;flex:1;">Created by: Technical Designer</div><div style="text-align:center;flex:1;font-weight:600;">By: iBC connecting</div><div style="text-align:right;flex:1;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div></div>';
    }
  }

  /**
   * Clear all caches (call periodically or when memory is low)
   */
  clearCaches(): void {
    this.imageCache.clear();
    this.templateCache.clear();
    pdfLog('🧹 Caches cleared');
  }
}

export default new PDFService();