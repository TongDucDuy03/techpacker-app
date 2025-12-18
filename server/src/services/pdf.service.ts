import puppeteer, { Browser } from 'puppeteer';
import path from 'path';
import ejs from 'ejs';
import { ITechPack, IBOMItem, IMeasurement, ISampleMeasurementRound, IHowToMeasure, IColorway, IColorwayPart } from '../models/techpack.model';
import fs from 'fs/promises';

// Type for PDF generation - accepts both Mongoose document and plain object (lean)
// Using 'any' to handle Mongoose's FlattenMaps type which has complex nested types
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
  imageQuality?: number;
  displayHeaderFooter?: boolean;
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
  private readonly maxConcurrent: number = 3;
  private activeGenerations: number = 0;

  constructor() {
    // Handle both dev (src/) and production (dist/) paths
    // In production, __dirname is dist/services, so go up to dist then to src/templates
    // In dev with ts-node, __dirname is src/services, so go up to src then to templates
    const possiblePaths = [
      path.join(__dirname, '../templates'),           // src/services -> src/templates (dev)
      path.join(__dirname, '../../src/templates'),    // dist/services -> src/templates (prod)
    ];
    
    // Find first existing path
    const fs = require('fs');
    this.templateDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
  }

  /**
   * Initialize browser instance (lazy loading)
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      try {
        // Build launch options
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
          ],
          timeout: 60000, // 60 seconds timeout for browser launch
        };

        // Only set executablePath if CHROME_PATH is explicitly provided
        // Otherwise, let Puppeteer use the bundled Chromium
        if (process.env.CHROME_PATH) {
          launchOptions.executablePath = process.env.CHROME_PATH;
          console.log(`Using Chrome/Chromium from: ${process.env.CHROME_PATH}`);
        } else {
          console.log('Using Puppeteer bundled Chromium');
        }

        this.browser = await puppeteer.launch(launchOptions);
        console.log('Browser launched successfully');
      } catch (error: any) {
        console.error('Failed to launch browser:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          CHROME_PATH: process.env.CHROME_PATH || 'not set',
        });
        throw new Error(`Failed to launch Puppeteer browser: ${error.message}`);
      }
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Normalize text data - remove control characters and normalize line breaks
   */
  private normalizeText(text: any): string {
    if (!text) return '—';
    const str = String(text);
    // Remove control characters (0x0B, 0x0C, 0x0D bất thường)
    let normalized = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // Normalize line breaks to spaces
    normalized = normalized.replace(/\r\n|\r|\n/g, ' ');
    // Remove multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized || '—';
  }

  /**
   * Prepare techpack data for PDF template
   */
  private prepareTechPackData(techpack: TechPackForPDF): any {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const uploadsBaseUrl = process.env.UPLOADS_BASE_URL || baseUrl;
    // SERVER_URL should point to backend server (where uploads are served)
    const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 4001}`;

    // Helper to prepare image URL - handles base64, absolute URLs, relative URLs, and provides placeholder
    const prepareImageUrl = (url?: string, placeholder?: string): string => {
      // Default placeholder SVG
      const defaultPlaceholder = placeholder || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
      
      if (!url || url.trim() === '') {
        return defaultPlaceholder;
      }
      
      const trimmedUrl = url.trim();
      
      // Already base64 image
      if (trimmedUrl.startsWith('data:image/')) {
        return trimmedUrl;
      }
      
      // Already absolute URL
      if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        return trimmedUrl;
      }
      
      // Relative URL starting with /
      if (trimmedUrl.startsWith('/')) {
        // Check if it's a server upload path
        if (trimmedUrl.startsWith('/uploads/') || trimmedUrl.startsWith('/api/uploads/')) {
          return `${serverUrl}${trimmedUrl}`;
        }
        // Static assets
        if (trimmedUrl.startsWith('/static/')) {
          return `${baseUrl}${trimmedUrl}`;
        }
        // Other relative paths
        return `${baseUrl}${trimmedUrl}`;
      }
      
      // Relative URL without leading slash - treat as upload
      return `${uploadsBaseUrl}/${trimmedUrl}`;
    };

    // Legacy helper for backward compatibility
    const toAbsoluteUrl = (url?: string): string | undefined => {
      if (!url) return undefined;
      const prepared = prepareImageUrl(url);
      // Return undefined if it's placeholder to maintain backward compatibility
      return prepared.includes('No Image') ? undefined : prepared;
    };

    // Format dates
    const formatDate = (date?: Date | string): string => {
      if (!date) return '—';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    // Get technical designer name
    const technicalDesignerName = 
      (techpack.technicalDesignerId as any)?.firstName && 
      (techpack.technicalDesignerId as any)?.lastName
        ? `${(techpack.technicalDesignerId as any).firstName} ${(techpack.technicalDesignerId as any).lastName}`
        : '—';

    // Prepare Article Summary data
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
        retailPrice: techpack.retailPrice ? `${techpack.retailPrice} ${techpack.currency || 'USD'}` : '—',
      },
      technicalInfo: {
        fitType: '—', // Not in model, add if needed
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
        materialInfo: techpack.bom?.find((item: IBOMItem) => item.part?.toLowerCase().includes('main') || item.part?.toLowerCase().includes('fabric'))?.materialComposition || '—',
      },
      tracking: {
        createdDate: formatDate(techpack.createdAt),
        updatedAt: formatDate(techpack.updatedAt),
        createdBy: techpack.createdByName || '—',
        updatedBy: techpack.updatedByName || '—',
      },
    };

    // Prepare BOM data - Group by Part and normalize fields
    // Helper to prepare image URL with placeholder
    const prepareBOMImageUrl = (url?: string): string => {
      if (!url) {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
      }
      if (url.startsWith('data:image/')) return url;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      const absoluteUrl = toAbsoluteUrl(url);
      return absoluteUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzljYTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
    };

    // Group BOM items by Part
    const bomByPart: { [key: string]: any[] } = {};
    (techpack.bom || []).forEach((item: IBOMItem) => {
      const partName = this.normalizeText(item.part) || 'Unassigned';
      if (!bomByPart[partName]) {
        bomByPart[partName] = [];
      }
      
      // Prepare colorways as chips (if multiple colors, combine into one string)
      const colorways: string[] = [];
      if (item.color) {
        const colorText = this.normalizeText(item.color);
        if (item.colorCode) {
          colorways.push(`${colorText} (${this.normalizeText(item.colorCode)})`);
        } else if (item.pantoneCode) {
          colorways.push(`${colorText} (Pantone: ${this.normalizeText(item.pantoneCode)})`);
        } else {
          colorways.push(colorText);
        }
      }

      // Build size/width/usage string
      const sizeInfo: string[] = [];
      if (item.size) sizeInfo.push(`Size: ${this.normalizeText(item.size)}`);
      if (item.width) sizeInfo.push(`Width: ${this.normalizeText(item.width)}`);
      // Usage can be derived from placement or other fields if needed
      const sizeWidthUsage = sizeInfo.length > 0 ? sizeInfo.join(' / ') : '—';

      bomByPart[partName].push({
        materialName: this.normalizeText(item.materialName),
        imageUrl: prepareBOMImageUrl(item.imageUrl),
        placement: this.normalizeText(item.placement),
        sizeWidthUsage: sizeWidthUsage,
        quantity: item.quantity || 0,
        uom: this.normalizeText(item.uom),
        supplier: this.normalizeText(item.supplier),
        unitPrice: item.unitPrice ? `${item.unitPrice} ${techpack.currency || 'USD'}` : '—',
        totalPrice: item.totalPrice ? `${item.totalPrice} ${techpack.currency || 'USD'}` : '—',
        comments: this.normalizeText(item.comments),
        colorways: colorways.length > 0 ? colorways : [],
      });
    });

    // Convert to array format for template
    const bomParts = Object.keys(bomByPart).map((partName) => ({
      partName,
      items: bomByPart[partName],
    }));

    // Prepare Measurements data
    const sizeRange = techpack.measurementSizeRange || ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const baseSize = techpack.measurementBaseSize || sizeRange[0] || 'M';
    const baseHighlightColor = techpack.measurementBaseHighlightColor || '#dbeafe';
    const rowStripeColor = techpack.measurementRowStripeColor || '#f3f4f6';

    const measurementRows = (techpack.measurements || []).map((measurement: IMeasurement) => {
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

      // Add size values
      sizeRange.forEach((size: string) => {
        row.sizes[size] = measurement.sizes?.[size] || '—';
      });

      return row;
    });

    // Prepare Sample Measurement Rounds
    // Find corresponding measurement for tolerance values
    const measurementMap = new Map();
    (techpack.measurements || []).forEach((m: IMeasurement) => {
      measurementMap.set(m.pomCode, m);
    });

    const sampleRounds = (techpack.sampleMeasurementRounds || []).map((round: ISampleMeasurementRound) => ({
      name: round.name || '—',
      measurementDate: round.measurementDate ? formatDate(round.measurementDate) : '—',
      reviewer: (round.createdBy as any)?.firstName && (round.createdBy as any)?.lastName
        ? `${(round.createdBy as any).firstName} ${(round.createdBy as any).lastName}`
        : '—',
      requestedSource: round.requestedSource || 'original',
      overallComments: round.overallComments || '—',
      measurements: (round.measurements || []).map((entry: any) => {
        // Get tolerance from entry or find corresponding measurement
        const correspondingMeasurement = measurementMap.get(entry.pomCode);
        const toleranceMinus = entry.toleranceMinus !== undefined 
          ? entry.toleranceMinus 
          : (correspondingMeasurement?.toleranceMinus || '—');
        const tolerancePlus = entry.tolerancePlus !== undefined 
          ? entry.tolerancePlus 
          : (correspondingMeasurement?.tolerancePlus || '—');

        const entryRow: any = {
          pomCode: entry.pomCode || '—',
          pomName: entry.pomName || '—',
          toleranceMinus,
          tolerancePlus,
          requested: {},
          measured: {},
          diff: {},
          revised: {},
          comments: {},
        };

        // Keep size-based data for potential future use, but we'll use base size for display
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

    // Prepare How To Measure
    const howToMeasures = (techpack.howToMeasure || []).map((item: IHowToMeasure) => ({
      stepNumber: item.stepNumber || 0,
      pomCode: item.pomCode || '—',
      pomName: item.pomName || '—',
      description: item.description || '—',
      imageUrl: toAbsoluteUrl(item.imageUrl),
      steps: item.instructions || [],
      tips: item.tips || [],
      commonMistakes: item.commonMistakes || [],
      relatedMeasurements: item.relatedMeasurements || [],
    }));

    // Prepare Colorways
    const colorways = (techpack.colorways || []).map((colorway: IColorway) => ({
      name: colorway.name || '—',
      code: colorway.code || '—',
      pantoneCode: colorway.pantoneCode || '—',
      hexColor: colorway.hexColor || '—',
      rgbColor: colorway.rgbColor ? `rgb(${colorway.rgbColor.r}, ${colorway.rgbColor.g}, ${colorway.rgbColor.b})` : '—',
      supplier: colorway.supplier || '—',
      productionStatus: '—', // Not in model
      approved: colorway.approved ? 'Yes' : 'No',
      approvalStatus: colorway.approved ? 'Approved' : 'Pending',
      season: colorway.season || techpack.season || '—',
      collectionName: colorway.collectionName || techpack.collectionName || '—',
      notes: colorway.notes || '—',
      imageUrl: toAbsoluteUrl(colorway.imageUrl),
      parts: (colorway.parts || []).map((part: IColorwayPart) => ({
        partName: part.partName || '—',
        colorName: part.colorName || '—',
        pantoneCode: part.pantoneCode || '—',
        hexCode: part.hexCode || '—',
        rgbCode: part.rgbCode || '—',
        imageUrl: toAbsoluteUrl(part.imageUrl),
        supplier: part.supplier || '—',
        colorType: part.colorType || 'Solid',
      })),
    }));

    // Prepare Revision History (will be populated from database in generatePDF method)
    const revisionHistory: any[] = [];

    // Calculate summary statistics
    const summary = {
      bomCount: bomParts.reduce((sum: number, part: any) => sum + part.items.length, 0),
      uniqueSuppliers: new Set(bomParts.flatMap((part: any) => part.items.map((item: any) => item.supplier).filter((s: string) => s && s !== '—'))).size,
      approvedMaterials: bomParts.reduce((sum: number, part: any) => sum + part.items.filter((item: any) => item.approved === 'Yes').length, 0),
      measurementCount: measurementRows.length,
      criticalMeasurements: measurementRows.filter((r: any) => r.critical).length,
      sizeRange: sizeRange.join(', '),
      howToMeasureCount: howToMeasures.length,
      howToMeasureWithImage: howToMeasures.filter((h: any) => h.imageUrl).length,
      howToMeasureTips: howToMeasures.reduce((sum: number, h: any) => sum + (h.tips?.length || 0), 0),
      notesCount: 0, // Will be calculated from packing notes
      careSymbolCount: 0,
      lastExport: formatDate(new Date()),
    };

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
        fitType: '—',
        collectionName: techpack.collectionName || '—',
        supplier: techpack.supplier || '—',
        updatedAt: formatDate(techpack.updatedAt),
        createdAt: formatDate(techpack.createdAt),
        createdByName: techpack.createdByName || '—',
        designSketchUrl: prepareImageUrl(techpack.designSketchUrl),
        productDescription: techpack.productDescription || techpack.description || '—',
        fabricDescription: techpack.fabricDescription || '—',
        lifecycleStage: techpack.lifecycleStage || '—',
        status: techpack.status || '—',
        targetMarket: techpack.targetMarket || '—',
        pricePoint: techpack.pricePoint || '—',
        retailPrice: techpack.retailPrice,
        currency: techpack.currency || 'USD',
        description: techpack.description || techpack.productDescription || '—',
        designer: technicalDesignerName,
      },
      images: (() => {
        // Helper to prepare image URL with placeholder fallback
        const prepareImageUrl = (url?: string): string => {
          if (!url) {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
          }
          if (url.startsWith('data:image/')) return url;
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          const absoluteUrl = toAbsoluteUrl(url);
          return absoluteUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
        };
        
        // Debug log
        console.log('🖼️  PDF Logo Debug:', {
          companyLogoUrl: techpack.companyLogoUrl,
          companyLogoProcessed: prepareImageUrl(techpack.companyLogoUrl),
          designSketchUrl: techpack.designSketchUrl
        });
        
        return {
          companyLogo: prepareImageUrl(techpack.companyLogoUrl),
          coverImage: prepareImageUrl(techpack.designSketchUrl),
        };
      })(),
      articleSummary,
      bom: {
        parts: bomParts,
        // Calculate statistics from all items across all parts
        stats: (() => {
          const allItems = bomParts.flatMap((part) => part.items);
          return {
            bomCount: allItems.length,
            uniqueSuppliers: new Set(allItems.map((item: any) => item.supplier).filter((s: string) => s && s !== '—')).size,
            approvedMaterials: allItems.filter((item: any) => item.approved === 'Yes').length,
          };
        })(),
      },
      measurements: {
        rows: measurementRows,
        sizeRange,
        baseSize,
        baseHighlightColor,
        rowStripeColor,
      },
      sampleMeasurementRounds: sampleRounds,
      howToMeasures,
      colorways,
      packingNotes: techpack.packingNotes || '—',
      revisionHistory,
      summary,
      printedBy: techpack.updatedByName || techpack.createdByName || 'System',
      generatedAt: formatDate(new Date()),
    };
  }

  /**
   * Generate PDF from techpack data
   */
  async generatePDF(techpack: TechPackForPDF, options: PDFOptions = {}): Promise<PDFGenerationResult> {
    if (this.activeGenerations >= this.maxConcurrent) {
      throw new Error('Maximum concurrent PDF generations reached. Please try again later.');
    }

    this.activeGenerations++;

    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      // Prepare template data
      const templateData = this.prepareTechPackData(techpack);
      
      // Fetch revision history
      try {
        const Revision = (await import('../models/revision.model')).default;
        const revisions = await Revision.find({ techPackId: techpack._id })
          .populate('createdBy', 'firstName lastName')
          .sort({ createdAt: -1 })
          .lean();
        
        templateData.revisionHistory = revisions.map((rev: any) => ({
          version: rev.version || '—',
          modifiedBy: rev.createdByName || 
            (rev.createdBy?.firstName && rev.createdBy?.lastName 
              ? `${rev.createdBy.firstName} ${rev.createdBy.lastName}` 
              : '—'),
          modifiedAt: rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : '—',
          description: rev.description || (rev.changes?.summary) || '—',
          status: rev.statusAtChange || '—',
        }));
      } catch (error) {
        console.warn('Could not fetch revision history:', error);
        templateData.revisionHistory = [];
      }

      // Read and render main template
      // Try templates in order of preference
      let templateContent: string = '';
      const templatePaths = [
        path.join(this.templateDir, 'techpack-full-template.ejs'),
        path.join(this.templateDir, 'techpack-template.ejs'),
      ];
      
      let templateLoaded = false;
      for (const templatePath of templatePaths) {
        try {
          templateContent = await fs.readFile(templatePath, 'utf-8');
          console.log(`Using template: ${path.basename(templatePath)}`);
          templateLoaded = true;
          break;
        } catch {
          console.warn(`Template not found: ${path.basename(templatePath)}`);
        }
      }
      
      if (!templateLoaded || !templateContent) {
        throw new Error('No PDF template found. Please ensure template files exist in the templates directory.');
      }

      // Render HTML with EJS
      const html = await ejs.render(
        templateContent,
        templateData,
        {
          async: false,
          root: this.templateDir,
        }
      );

      // Set content
      // Changed from 'networkidle0' to 'domcontentloaded' to avoid waiting for all images
      // This significantly improves performance for templates with many external images
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 120000, // 120 seconds
      });

      // Wait a bit for critical styles and layout to settle
      // Using setTimeout instead of deprecated waitForTimeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate PDF - Default to landscape for better table display
      const pdfOptions: any = {
        format: options.format || 'A4',
        landscape: options.orientation !== 'portrait', // Default to landscape
        printBackground: true,
        timeout: 60000, // 60 seconds for PDF generation
        margin: {
          top: options.margin?.top || '10mm',
          bottom: options.margin?.bottom || '10mm',
          left: options.margin?.left || '8mm',
          right: options.margin?.right || '8mm',
        },
        displayHeaderFooter: options.displayHeaderFooter !== false,
        headerTemplate: options.displayHeaderFooter !== false
          ? await this.getHeaderTemplate(templateData)
          : '',
        footerTemplate: options.displayHeaderFooter !== false
          ? await this.getFooterTemplate(templateData)
          : '',
      };

      const pdfBuffer = await page.pdf(pdfOptions);

      await page.close();

      // Generate filename
      const sampleType = (techpack as any).sampleType || (techpack as any).version || 'V1';
      const filename = `Techpack_${techpack.articleCode}_${sampleType}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

      return {
        buffer: pdfBuffer,
        filename,
        size: pdfBuffer.length,
        pages: Math.ceil(pdfBuffer.length / 10000), // Rough estimate
      };
    } catch (error: any) {
      console.error('PDF generation error:', error);
      console.error('Error stack:', error.stack);
      
      // Try to close page if it exists
      try {
        const pages = await this.browser?.pages();
        if (pages && pages.length > 1) {
          await pages[pages.length - 1].close();
        }
      } catch (cleanupError) {
        console.error('Page cleanup error:', cleanupError);
      }
      
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      this.activeGenerations--;
    }
  }

  /**
   * Get header template for PDF
   */
  private async getHeaderTemplate(data: any): Promise<string> {
    try {
      const headerPath = path.join(this.templateDir, 'partials', 'header.ejs');
      const headerContent = await fs.readFile(headerPath, 'utf-8');
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
      const footerContent = await fs.readFile(footerPath, 'utf-8');
      return ejs.render(footerContent, { meta: data.meta });
    } catch {
      return '<div style="font-size: 9px; text-align: center; width: 100%; padding: 10px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>';
    }
  }
}

export default new PDFService();

