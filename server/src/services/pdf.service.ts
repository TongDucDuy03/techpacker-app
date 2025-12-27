import puppeteer, { Browser, Page, BrowserContext } from 'puppeteer';
import path from 'path';
import ejs from 'ejs';
import { ITechPack, IBOMItem, IMeasurement, ISampleMeasurementRound, IHowToMeasure, IColorway, IColorwayPart } from '../models/techpack.model';
import fs from 'fs/promises';
import { compressImagesBatch } from '../utils/image-compression.util';

type TechPackForPDF = ITechPack | any;

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
      console.warn('⚠️  Browser was disconnected, resetting...');
    }

    if (!this.browser) {
      try {
        const launchOptions: any = {
          headless: 'new',
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
          console.log(`Using Chrome/Chromium from: ${process.env.CHROME_PATH}`);
        } else {
          console.log('Using Puppeteer bundled Chromium');
        }

        this.browser = await puppeteer.launch(launchOptions);
        console.log('✅ Browser launched successfully with optimized settings');

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
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '—';
    }
  }

  /**
   * Optimized BOM data preparation with image compression
   * Maps colorway assignments to BOM items for proper color display
   */
  private async prepareBOMDataOptimized(
    bom: IBOMItem[], 
    currency: string,
    colorways?: any[], // Add colorways parameter to map colors
    imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number }
  ): Promise<any[]> {
    if (!bom || bom.length === 0) return [];
    
    console.log(`📋 Processing ${bom.length} BOM items...`);
    const bomByPart: { [key: string]: any[] } = {};
    
    // Build a map of bomItemId -> colorway parts for fast lookup
    // This maps colors assigned via colorways to BOM items
    const bomItemColorMap = new Map<string, {
      colorName?: string;
      hexCode?: string;
      pantoneCode?: string;
      colorCode?: string;
      rgbCode?: string;
    }>();
    
    if (colorways && colorways.length > 0) {
      colorways.forEach((colorway: any) => {
        if (colorway.parts && Array.isArray(colorway.parts)) {
          colorway.parts.forEach((part: any) => {
            if (part.bomItemId) {
              // Use the first matching part (or could aggregate if multiple colorways assign to same item)
              if (!bomItemColorMap.has(part.bomItemId)) {
                bomItemColorMap.set(part.bomItemId, {
                  colorName: part.colorName,
                  hexCode: part.hexCode,
                  pantoneCode: part.pantoneCode,
                  colorCode: part.hexCode || part.pantoneCode, // Use hexCode or pantoneCode as colorCode
                  rgbCode: part.rgbCode,
                });
              }
            }
          });
        }
      });
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
    console.log(`🖼️  Compressing ${imageUrls.length} BOM images...`);
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
      
      // Try to get color from colorway assignment first, then fallback to item fields
      // IBOMItem has _id (MongoDB ObjectId), but may also have id when populated
      const itemId = (item._id || (item as any).id)?.toString();
      const colorwayColor = itemId ? bomItemColorMap.get(itemId) : null;
      
      // Priority: colorway assignment > item.color/colorCode/pantoneCode
      const resolvedColorName = colorwayColor?.colorName || item.color;
      const resolvedHexCode = colorwayColor?.hexCode;
      const resolvedPantoneCode = colorwayColor?.pantoneCode || item.pantoneCode;
      const resolvedColorCode = colorwayColor?.colorCode || item.colorCode;
      
      const colorways: string[] = [];
      if (resolvedColorName) {
        const colorText = this.normalizeText(resolvedColorName);
        if (resolvedColorCode) {
          colorways.push(`${colorText} (${this.normalizeText(resolvedColorCode)})`);
        } else if (resolvedPantoneCode) {
          colorways.push(`${colorText} (Pantone: ${this.normalizeText(resolvedPantoneCode)})`);
        } else {
          colorways.push(colorText);
        }
      }

      const sizeInfo: string[] = [];
      if (item.size) sizeInfo.push(`Size: ${this.normalizeText(item.size)}`);
      if (item.width) sizeInfo.push(`Width: ${this.normalizeText(item.width)}`);

      // Use compressed image from batch (same approach as Construction)
      const imageUrl = item.imageUrl
        ? (imageMap.get(item.imageUrl) || this.getPlaceholderSVG(64, 64))
        : this.getPlaceholderSVG(64, 64);

      // Extract hexCode: prioritize colorway assignment, then try to parse from colorCode
      let hexCode: string | undefined = resolvedHexCode;
      if (!hexCode && resolvedColorCode) {
        const colorCodeStr = String(resolvedColorCode).trim();
        if (colorCodeStr.startsWith('#') && (colorCodeStr.length === 4 || colorCodeStr.length === 7)) {
          hexCode = colorCodeStr;
        }
      }

      bomByPart[partName].push({
        materialName: this.normalizeText(item.materialName),
        imageUrl,
        placement: this.normalizeText(item.placement),
        sizeWidthUsage: sizeInfo.length > 0 ? sizeInfo.join(' / ') : '—',
        quantity: item.quantity || 0,
        uom: this.normalizeText(item.uom),
        supplier: this.normalizeText(item.supplier),
        unitPrice: item.unitPrice ? `${item.unitPrice} ${currency}` : '—',
        totalPrice: item.totalPrice ? `${item.totalPrice} ${currency}` : '—',
        comments: this.normalizeText(item.comments),
        colorways,
        // Add color fields for template compatibility - prioritize colorway assignments
        color: resolvedColorName ? this.normalizeText(resolvedColorName) : undefined,
        hexCode: hexCode,
        colorCode: resolvedColorCode ? this.normalizeText(resolvedColorCode) : (hexCode || (resolvedPantoneCode ? this.normalizeText(resolvedPantoneCode) : undefined)),
        pantone: resolvedPantoneCode ? this.normalizeText(resolvedPantoneCode) : undefined,
        pantoneCode: resolvedPantoneCode ? this.normalizeText(resolvedPantoneCode) : undefined,
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
    console.log('📏 Processing measurements...');
    const sizeRange = techpack.measurementSizeRange || ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const baseSize = techpack.measurementBaseSize || sizeRange[0] || 'M';
    
    const rows = (techpack.measurements || []).map((measurement: IMeasurement) => {
      const row: any = {
        pomCode: measurement.pomCode || '—',
        pomName: measurement.pomName || '—',
        measurementType: measurement.measurementType || '—',
        category: measurement.category || '—',
        minusTolerance: measurement.toleranceMinus || 0,
        plusTolerance: measurement.tolerancePlus || 0,
        notes: measurement.notes || '—',
        critical: measurement.critical || false,
        unit: measurement.unit || 'cm',
        sizes: {},
      };

      sizeRange.forEach((size: string) => {
        row.sizes[size] = measurement.sizes?.[size] || '—';
      });

      return row;
    });

    return {
      rows,
      sizeRange,
      baseSize,
      baseHighlightColor: techpack.measurementBaseHighlightColor || '#dbeafe',
      rowStripeColor: techpack.measurementRowStripeColor || '#f3f4f6',
    };
  }

  /**
   * Optimized sample rounds preparation
   */
  private prepareSampleRoundsOptimized(techpack: any): any[] {
    console.log('🔬 Processing sample rounds...');
    const sizeRange = techpack.measurementSizeRange || ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    
    const measurementMap = new Map<string, IMeasurement>();
    (techpack.measurements || []).forEach((m: IMeasurement) => {
      measurementMap.set(m.pomCode, m);
    });

    return (techpack.sampleMeasurementRounds || []).map((round: ISampleMeasurementRound) => ({
      name: round.name || '—',
      measurementDate: round.measurementDate ? this.formatDate(round.measurementDate) : '—',
      reviewer: (round.createdBy as any)?.firstName && (round.createdBy as any)?.lastName
        ? `${(round.createdBy as any).firstName} ${(round.createdBy as any).lastName}`
        : '—',
      requestedSource: round.requestedSource || 'original',
      overallComments: round.overallComments || '—',
      measurements: (round.measurements || []).map((entry: any) => {
        const correspondingMeasurement = measurementMap.get(entry.pomCode);
        const entryRow: any = {
          pomCode: entry.pomCode || '—',
          pomName: entry.pomName || '—',
          toleranceMinus: entry.toleranceMinus !== undefined ? entry.toleranceMinus : (correspondingMeasurement?.toleranceMinus || '—'),
          tolerancePlus: entry.tolerancePlus !== undefined ? entry.tolerancePlus : (correspondingMeasurement?.tolerancePlus || '—'),
          requested: {},
          measured: {},
          diff: {},
          revised: {},
          comments: {},
        };

        sizeRange.forEach((size: string) => {
          entryRow.requested[size] = entry.requested?.[size] || '—';
          entryRow.measured[size] = entry.measured?.[size] || '—';
          entryRow.diff[size] = entry.diff?.[size] || '—';
          entryRow.revised[size] = entry.revised?.[size] || '—';
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
    console.log('📐 Processing how to measure...');
    const items = techpack.howToMeasure || [];
    
    // Collect image URLs
    const imageUrls = items.map((item: IHowToMeasure) => item.imageUrl).filter(Boolean);
    
    // Compress images in batch with timeout
    if (imageUrls.length > 0) {
      console.log(`🖼️  Compressing ${imageUrls.length} how-to-measure images...`);
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
    }));
  }

  /**
   * Optimized colorways preparation with image compression
   */
  private async prepareColorwaysOptimized(
    techpack: any,
    imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number }
  ): Promise<any[]> {
    console.log('🎨 Processing colorways...');
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
      console.log(`🖼️  Compressing ${imageUrls.length} colorway images...`);
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
      console.warn('⚠️ Revision fetch failed:', error.message);
      return [];
    }
  }

  /**
   * Prepare techpack data with parallel processing and image compression
   */
  private async prepareTechPackDataAsync(
    techpack: TechPackForPDF,
    imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number }
  ): Promise<any> {
    console.log('📦 Starting ASYNC data preparation with image compression...');
    const startTime = Date.now();

    const currency = techpack.currency || 'USD';
    const imageQuality = imageOptions?.quality || 65;
    const imageMaxWidth = imageOptions?.maxWidth || 1200;
    const imageMaxHeight = imageOptions?.maxHeight || 800;
    
    const technicalDesignerName = techpack.technicalDesignerId || '—';

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
        fitType: '—',
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

    // Compress main images (logo, cover, design sketch) using batch compression
    // ✅ UNIFIED: Same approach as Construction - collect URLs and use compressImagesBatch()
    console.log('🖼️  Compressing main images (logo, cover, design sketch)...');
    const coverImageUrl = (techpack as any).coverImageUrl || techpack.designSketchUrl;
    
    // Collect all Article image URLs
    const articleImageUrls: Array<{ url: string; type: 'logo' | 'cover' | 'designSketch'; width?: number; height?: number }> = [];
    if (techpack.companyLogoUrl) {
      articleImageUrls.push({ url: techpack.companyLogoUrl, type: 'logo', width: 400, height: 200 });
    }
    if (coverImageUrl) {
      articleImageUrls.push({ url: coverImageUrl, type: 'cover', width: imageMaxWidth, height: imageMaxHeight });
    }
    if (techpack.designSketchUrl) {
      articleImageUrls.push({ url: techpack.designSketchUrl, type: 'designSketch', width: imageMaxWidth, height: imageMaxHeight });
    }
    
    // Compress all images in batch (same as Construction)
    const articleImageUrlStrings = articleImageUrls.map(item => item.url);
    let articleImageMap = new Map<string, string>();
    
    if (articleImageUrlStrings.length > 0) {
      // Use default options for batch (logo will be resized by sharp based on actual dimensions)
      const compressedArticleImages = await compressImagesBatch(articleImageUrlStrings, {
        quality: imageQuality,
        maxWidth: imageMaxWidth, // Will be applied, sharp will resize logo appropriately
        maxHeight: imageMaxHeight,
      }, this.MAX_IMAGES_PARALLEL, this.IMAGE_COMPRESSION_TIMEOUT);
      
      articleImageUrlStrings.forEach((url, i) => {
        articleImageMap.set(url, compressedArticleImages[i]);
      });
    }
    
    // Extract compressed images by type
    const compressedLogo = techpack.companyLogoUrl 
      ? (articleImageMap.get(techpack.companyLogoUrl) || this.getPlaceholderSVG(400, 200))
      : this.getPlaceholderSVG(400, 200);
    const compressedCover = coverImageUrl
      ? (articleImageMap.get(coverImageUrl) || this.getPlaceholderSVG())
      : this.getPlaceholderSVG();
    const compressedDesignSketch = techpack.designSketchUrl
      ? (articleImageMap.get(techpack.designSketchUrl) || this.getPlaceholderSVG())
      : this.getPlaceholderSVG();

    console.log('🚀 Processing data in parallel with image compression...');
    const parallelStart = Date.now();
    
    // Prepare BOM with raw colorways data for mapping colors
    // We pass raw colorways (not prepared) to access bomItemId mapping
    const rawColorways = techpack.colorways || [];
    
    const [bomParts, measurementData, sampleRounds, howToMeasures, preparedColorways] = await Promise.all([
      this.prepareBOMDataOptimized(techpack.bom || [], currency, rawColorways, {
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
    
    console.log(`✅ Parallel processing completed in ${Date.now() - parallelStart}ms`);

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
    console.log(`✅ ASYNC data preparation completed in ${prepTime}ms`);

    return {
      meta: {
        productName: (techpack as any).articleName || (techpack as any).productName || '—',
        articleCode: techpack.articleCode || '—',
        version: (techpack as any).sampleType || (techpack as any).version || '—',
        season: techpack.season || '—',
        brand: techpack.brand || '—',
        category: techpack.category || '—',
        productClass: techpack.category || '—',
        gender: techpack.gender || '—',
        fitType: techpack.fitType || '—',
        collectionName: techpack.collectionName || '—',
        supplier: techpack.supplier || '—',
        updatedAt: this.formatDate(techpack.updatedAt),
        createdAt: this.formatDate(techpack.createdAt),
        createdByName: techpack.createdByName || '—',
        designSketchUrl: compressedDesignSketch,
        productDescription: techpack.productDescription || techpack.description || '—',
        fabricDescription: techpack.fabricDescription || '—',
        lifecycleStage: techpack.lifecycleStage || '—',
        status: techpack.status || '—',
        targetMarket: techpack.targetMarket || '—',
        pricePoint: techpack.pricePoint || '—',
        retailPrice: techpack.retailPrice,
        currency: currency,
        description: techpack.description || techpack.productDescription || '—',
        designer: technicalDesignerName,
        companyLogo: compressedLogo, // Add companyLogo to meta for header template
      },
      images: {
        companyLogo: compressedLogo,
        coverImage: compressedCover,
        designSketch: compressedDesignSketch, // Add design sketch for Article Information section
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
      colorways: preparedColorways,
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
        console.warn('Page is closed, skipping image loading');
        return;
      }

      // Wait a bit more to ensure page is fully ready
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check again after wait
      if (page.isClosed()) {
        console.warn('Page closed during wait, skipping image loading');
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
                console.log(`Images loaded: ${loaded}/${total}, timed out: ${timedOut}`);
                resolve();
              }
            };

            const processBatch = (batch: HTMLImageElement[]) => {
              batch.forEach(img => {
                const timeoutId = setTimeout(() => {
                  timedOut++;
                  console.warn(`Image timeout: ${img.src.substring(0, 50)}...`);
                  checkComplete();
                }, timeout);

                const cleanup = () => {
                  clearTimeout(timeoutId);
                  loaded++;
                  checkComplete();
                };

                img.onload = cleanup;
                img.onerror = () => {
                  console.warn(`Image load error: ${img.src.substring(0, 50)}...`);
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
                console.warn(`Global image timeout: ${loaded + timedOut}/${total} processed`);
                resolve();
              }
            }, timeout * 2);
          } catch (error) {
            console.warn('Error in image loading evaluation:', error);
            resolve(); // Resolve anyway to continue
          }
        });
      }, this.IMAGE_LOAD_TIMEOUT, this.MAX_IMAGES_PARALLEL);
    } catch (error: any) {
      // If page.evaluate fails, it's likely page is closed or not ready
      // Continue anyway as images might already be loaded
      console.warn('Image loading error (continuing):', error.message || error);
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
        console.warn(`🧹 Removing stale lock for TechPack ${id} (age: ${Math.round((now - lock.startTime) / 1000)}s)`);
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
    console.log(`🔒 Set export lock for TechPack ${techpackId} [${requestId}]`);

    this.activeGenerations++;
    const totalStartTime = Date.now();
    let page: Page | null = null;
    let context: BrowserContext | null = null;

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`🚀 Starting ASYNC PDF generation [${requestId}]`);
      console.log(`📦 TechPack ID: ${techpackId}`);
      console.log('📊 Data sizes:', {
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
        console.log(`🔒 Created isolated incognito context [${requestId}]`);
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
        console.log(`📄 Created new page in isolated context [${requestId}] [pageId: ${pageId}]`);
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
        console.log(`⚠️  Page closed event [${requestId}] [pageId: ${capturedPageId}]`);
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
      console.log(`🔄 Navigating to blank page [${requestId}]`);
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
      console.log('🔄 Running parallel operations...');
      const [templateData, revisionHistory] = await Promise.all([
        this.prepareTechPackDataAsync(techpack, imageOptions),
        this.fetchRevisionHistoryAsync(techpack._id)
      ]);
      
      templateData.revisionHistory = revisionHistory;
      console.log(`✅ Got ${revisionHistory.length} revisions`);

      // Load template
      console.log('📄 Loading template...');
      const templatePath = path.join(this.templateDir, 'techpack-full-template.ejs');
      let templateContent: string;
      
      if (this.templateCache.has(templatePath)) {
        templateContent = this.templateCache.get(templatePath)!;
      } else {
        templateContent = await fs.readFile(templatePath, 'utf-8');
        this.templateCache.set(templatePath, templateContent);
      }

      // Render HTML
      console.log('🎨 Rendering HTML...');
      const renderStart = Date.now();
      const html = await ejs.render(templateContent, templateData, {
        async: false,
        root: this.templateDir,
      });
      console.log(`✅ HTML rendered in ${Date.now() - renderStart}ms`);

      // Load content
      console.log(`📥 Loading content into page [${requestId}]`);
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
      console.log(`✅ Content loaded in ${Date.now() - contentStart}ms [${requestId}]`);

      // Wait for layout to settle and ensure page is stable
      console.log(`⏳ Waiting for layout to settle [${requestId}]`);
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
      console.log('🖼️  Loading images (with timeout)...');
      const imageStart = Date.now();
      await this.waitForImagesOptimized(page);
      
      // Check again before additional optimization
      if (page.isClosed()) {
        throw new Error('Page was closed during image loading');
      }
      
      // Additional image optimization: compress any remaining large images
      console.log('🔧 Optimizing images in page...');
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
              console.warn('Image compression failed:', e);
            }
          }
        });
      }, imageOptions.maxWidth, imageOptions.maxHeight);
      } catch (error: any) {
        // If page.evaluate fails, continue anyway - images are already compressed
        console.warn('Page image optimization failed (continuing):', error.message || error);
      }
      
      console.log(`✅ Images processed in ${Date.now() - imageStart}ms`);

      // Generate PDF
      console.log('📄 Generating PDF...');
      const pdfStart = Date.now();
      const pdfOptions: any = {
        format: options.format || 'A4',
        landscape: options.orientation !== 'portrait',
        printBackground: true,
        timeout: this.PDF_GENERATION_TIMEOUT,
        margin: {
          top: options.margin?.top || '10mm',
          bottom: options.margin?.bottom || '10mm',
          left: options.margin?.left || '8mm',
          right: options.margin?.right || '8mm',
        },
        displayHeaderFooter: options.displayHeaderFooter !== false,
        preferCSSPageSize: true,
      };

      // Add header/footer if needed
      if (options.displayHeaderFooter !== false) {
        try {
          // Check page is still open before getting templates
          if (page.isClosed()) {
            throw new Error('Page was closed before getting header/footer templates');
          }
          pdfOptions.headerTemplate = await this.getHeaderTemplate(templateData);
          pdfOptions.footerTemplate = await this.getFooterTemplate(templateData);
        } catch (error: any) {
          console.warn('Could not load header/footer templates:', error.message || error);
          // Continue without header/footer if there's an error
        }
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

      console.log(`📄 Generating PDF [${requestId}]`);
      const pdfBuffer = await page.pdf(pdfOptions);
      console.log(`✅ PDF generated in ${Date.now() - pdfStart}ms [${requestId}]`);

      // ✅ REQUIREMENT 2: Close page only after PDF is successfully generated
      // Don't close here - will be closed in finally block

      // Generate filename
      const sampleType = (techpack as any).sampleType || (techpack as any).version || 'V1';
      const filename = `Techpack_${techpack.articleCode}_${sampleType}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

      const totalTime = Date.now() - totalStartTime;
      console.log('═══════════════════════════════════════════════════════');
      console.log(`✅ PDF GENERATION SUCCESSFUL [${requestId}]`);
      console.log(`📦 TechPack ID: ${techpackId}`);
      console.log(`📊 Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`📄 File: ${filename}`);
      console.log(`📦 Size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      console.log('═══════════════════════════════════════════════════════');

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
          console.log(`🧹 Closing page [${requestId}]`);
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
          console.log(`🧹 Closing incognito context [${requestId}]`);
          await context.close();
        } catch (cleanupError: any) {
          console.error(`Context cleanup error [${requestId}]:`, cleanupError.message || cleanupError);
        }
      }
      context = null;
      
      // ✅ REQUIREMENT 2: Always remove lock in finally, even if error occurs early
      if (this.exportLocks.has(techpackId)) {
        this.exportLocks.delete(techpackId);
        console.log(`🔓 Released export lock for TechPack ${techpackId} [${requestId}]`);
      }
      
      this.activeGenerations--;
    }
  }

  /**
   * Get header template for PDF
   */
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
   */
  private async getFooterTemplate(data: any): Promise<string> {
    try {
      const footerPath = path.join(this.templateDir, 'partials', 'footer.ejs');
      
      if (this.templateCache.has(footerPath)) {
        return ejs.render(this.templateCache.get(footerPath)!, { meta: data.meta });
      }
      
      const footerContent = await fs.readFile(footerPath, 'utf-8');
      this.templateCache.set(footerPath, footerContent);
      return ejs.render(footerContent, { meta: data.meta });
    } catch {
      return '<div style="font-size: 9px; text-align: center; width: 100%; padding: 10px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';
    }
  }

  /**
   * Clear all caches (call periodically or when memory is low)
   */
  clearCaches(): void {
    this.imageCache.clear();
    this.templateCache.clear();
    console.log('🧹 Caches cleared');
  }
}

export default new PDFService();