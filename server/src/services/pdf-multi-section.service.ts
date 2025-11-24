import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import crypto from 'crypto';
import ejs from 'ejs';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import PQueue from 'p-queue';
import dayjs from 'dayjs';
import { buildRenderModel } from './pdf-renderer.service';
import { cacheService } from './cache.service';
import { PDFGenerationError, PDFErrorCode } from '../types/techpack.types';

function formatDate(date: Date, format = 'MMM D, YYYY HH:mm') {
  return dayjs(date).format(format);
}

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

// Cache for template version hash
let templateVersionHash: string | null = null;
let templateVersionHashTime: number = 0;
const TEMPLATE_VERSION_CACHE_TTL = 60_000; // 1 minute cache for template hash

const TEMPLATE_DIR = path.join(__dirname, '../templates');
const TMP_DIR = process.env.PDF_TMP_DIR || path.join(os.tmpdir(), 'techpack-pdf');
const PDF_TIMEOUT = Number(process.env.PDF_TIMEOUT || 600_000); // 10 minutes for multi-section with many sections
const PDF_CACHE_TTL = Number(process.env.PDF_CACHE_TTL || 21_600);
const PDF_CONCURRENCY = Number(process.env.PDF_CONCURRENCY || 1); // Reduced to 1 for stability with complex PDFs
const PDF_MAX_RETRIES = Number(process.env.PDF_MAX_RETRIES || 3); // Max retries for page crash
const PDF_SECTION_TIMEOUT = Number(process.env.PDF_SECTION_TIMEOUT || 120_000); // 2 minutes per section

interface GenerateOptions {
  techpack: any;
  printedBy: string;
  includeSections?: string[];
  force?: boolean;
}

interface PDFMetadata {
  path: string;
  size: number;
  pages: number;
  generatedAt: string;
  cached: boolean;
}

interface SectionConfig {
  name: string;
  template: string;
  landscape: boolean;
  condition?: (data: any) => boolean;
}

export class PDFMultiSectionService {
  private browserPromise: Promise<Browser> | null = null;
  private readonly queue: PQueue;
  private readonly inFlight: Map<string, Promise<PDFMetadata>>;

  constructor() {
    this.queue = new PQueue({
      concurrency: PDF_CONCURRENCY,
    });
    this.inFlight = new Map();
    this.ensureTmpDir();
  }

  private async ensureTmpDir() {
    try {
      await mkdir(TMP_DIR, { recursive: true });
    } catch (error) {
      console.warn('Unable to create PDF temp directory', TMP_DIR, error);
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
        timeout: 60000, // 60 seconds to launch browser
      });
    }
    return this.browserPromise;
  }

  /**
   * Get template version hash based on template files modification time
   * This ensures cache invalidation when templates are updated
   */
  private async getTemplateVersionHash(): Promise<string> {
    const now = Date.now();
    if (templateVersionHash && (now - templateVersionHashTime) < TEMPLATE_VERSION_CACHE_TTL) {
      return templateVersionHash;
    }

    try {
      const hash = crypto.createHash('md5');
      const partialsDir = path.join(TEMPLATE_DIR, 'partials');
      
      // Hash all template files
      const files = await readdir(partialsDir);
      const templateFiles = files.filter(f => f.endsWith('.ejs')).sort();
      
      for (const file of templateFiles) {
        const filePath = path.join(partialsDir, file);
        try {
          const stats = await stat(filePath);
          hash.update(`${file}:${stats.mtimeMs}`);
        } catch (e) {
          // File might not exist, skip
        }
      }
      
      templateVersionHash = hash.digest('hex').substring(0, 8);
      templateVersionHashTime = now;
      return templateVersionHash;
    } catch (error) {
      console.warn('[PDF] Failed to compute template version hash, using default', error);
      return 'default';
    }
  }

  private async buildCacheKey(techpack: any): Promise<string> {
    const updatedAt = techpack.updatedAt ? new Date(techpack.updatedAt).getTime() : 0;
    const templateVersion = await this.getTemplateVersionHash();
    return `pdf:techpack:${techpack._id}:v${techpack.version}:${updatedAt}:${templateVersion}:multisection`;
  }

  private async buildFilePath(techpack: any): Promise<string> {
    const safeName = String(techpack.articleCode || techpack._id).replace(/[^a-z0-9_-]+/gi, '_');
    const templateVersion = await this.getTemplateVersionHash();
    return path.join(TMP_DIR, `techpack-${safeName}-v${techpack.version}-${templateVersion}-full.pdf`);
  }

  /**
   * Clean up old temporary PDF files for this techpack
   */
  private async cleanupOldTempFiles(techpack: any): Promise<void> {
    try {
      const safeName = String(techpack.articleCode || techpack._id).replace(/[^a-z0-9_-]+/gi, '_');
      const pattern = new RegExp(`^techpack-${safeName}-v${techpack.version}-.*-full\\.pdf$`);
      
      const files = await readdir(TMP_DIR);
      const oldFiles = files.filter(f => pattern.test(f));
      
      // Keep only the current version, delete others
      const currentFile = await this.buildFilePath(techpack);
      const currentFileName = path.basename(currentFile);
      
      for (const file of oldFiles) {
        if (file !== currentFileName) {
          try {
            await unlink(path.join(TMP_DIR, file));
            console.log(`[PDF] Cleaned up old temp file: ${file}`);
          } catch (e) {
            // Ignore errors when deleting old files
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('[PDF] Failed to cleanup old temp files', error);
    }
  }

  private async renderPartial(name: string, payload: any): Promise<string> {
    const filePath = path.join(TEMPLATE_DIR, 'partials', `${name}.ejs`);
    return ejs.renderFile(filePath, payload, { async: true });
  }

  private async renderSectionTemplate(templatePath: string, payload: any): Promise<string> {
    return ejs.renderFile(templatePath, payload, { async: true });
  }

  private async generateHeaderTemplate(meta: any, printedBy: string, generatedAt: string): Promise<string> {
    return this.renderPartial('header', { meta, printedBy, generatedAt });
  }

  private async generateFooterTemplate(meta: any, printedBy: string, generatedAt: string): Promise<string> {
    return this.renderPartial('footer', { meta, printedBy, generatedAt });
  }

  private async renderSectionAsPDF(
    page: Page,
    html: string,
    landscape: boolean,
    headerTemplate: string,
    footerTemplate: string,
    outputPath: string,
    retryCount: number = 0
  ): Promise<void> {
    try {
      // Verify page is still open before setting content
      if (page.isClosed()) {
        throw new Error('Page was closed before setting content');
      }

      // Set timeout for content loading
      try {
        await page.setContent(html, {
          waitUntil: ['domcontentloaded'],
          timeout: PDF_SECTION_TIMEOUT,
        });
      } catch (contentError: any) {
        // Check if page was closed during content loading
        if (page.isClosed() || 
            (contentError.message && (
              contentError.message.includes('closed') || 
              contentError.message.includes('Connection closed') ||
              contentError.message.includes('Target closed')
            ))) {
          throw new Error('Page was closed during content loading');
        }
        
        // If timeout, try with shorter wait
        if (contentError.message && contentError.message.includes('timeout')) {
          console.warn(`[PDF] Content loading timeout (attempt ${retryCount + 1}), retrying with shorter wait`);
          if (!page.isClosed()) {
            await page.setContent(html, {
              waitUntil: ['load'],
              timeout: Math.min(PDF_SECTION_TIMEOUT / 2, 30000),
            });
          }
        } else {
          throw contentError;
        }
      }

      // Wait a bit for any dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify page is still open before generating PDF
      if (page.isClosed()) {
        throw new Error('Page was closed before generating PDF');
      }

      // Đảm bảo landscape được áp dụng đúng
      const pdfOptions: any = {
        path: outputPath,
        format: 'A4',
        landscape: landscape,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: { top: '20mm', bottom: '20mm', left: '25mm', right: '25mm' },
        timeout: PDF_SECTION_TIMEOUT,
      };

      console.log(`[PDF] Generating PDF with landscape=${landscape} for ${path.basename(outputPath)} (attempt ${retryCount + 1})`);
      
      // Generate PDF with error handling
      try {
        await page.pdf(pdfOptions);
      } catch (pdfError: any) {
        // Check if page was closed
        if (pdfError.message && (
          pdfError.message.includes('closed') || 
          pdfError.message.includes('Connection closed') ||
          pdfError.message.includes('Target closed')
        )) {
          throw new Error(`Page was closed during PDF generation. This may indicate the page crashed or timed out.`);
        }
        throw pdfError;
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error(`[PDF] Error rendering section to PDF (attempt ${retryCount + 1}):`, errorMessage);
      
      // Retry if page was closed and we haven't exceeded max retries
      if (retryCount < PDF_MAX_RETRIES && (
        errorMessage.includes('closed') ||
        errorMessage.includes('Connection closed') ||
        errorMessage.includes('Target closed') ||
        errorMessage.includes('timeout')
      )) {
        throw { retryable: true, error };
      }
      
      throw error;
    }
  }

  private getSections(htmlPayload?: any): SectionConfig[] {
    const baseSections: SectionConfig[] = [
      {
        name: 'cover-summary',
        template: path.join(TEMPLATE_DIR, 'partials', 'cover-summary.ejs'),
        landscape: true, // LANDSCAPE - All pages landscape
        condition: () => true, // Always include cover
      },
      {
        name: 'bom-table',
        template: path.join(TEMPLATE_DIR, 'partials', 'bom-table-wrapper.ejs'),
        landscape: true, // LANDSCAPE
        condition: (d) => d.bom && d.bom.rows && d.bom.rows.length > 0,
      },
      {
        name: 'bom-images',
        template: path.join(TEMPLATE_DIR, 'partials', 'bom-images-wrapper.ejs'),
        landscape: true, // LANDSCAPE
        condition: (d) => d.bomImages && d.bomImages.length > 0,
      },
      {
        name: 'measurement-table',
        template: path.join(TEMPLATE_DIR, 'partials', 'measurement-table-landscape.ejs'),
        landscape: true, // LANDSCAPE
        condition: (d) => d.measurements && d.measurements.rows && d.measurements.rows.length > 0,
      },
      {
        name: 'how-to-measure',
        template: path.join(TEMPLATE_DIR, 'partials', 'how-to-measure-wrapper.ejs'),
        landscape: true, // LANDSCAPE
        condition: (d) => d.howToMeasure && d.howToMeasure.length > 0,
      },
      {
        name: 'colorways',
        template: path.join(TEMPLATE_DIR, 'partials', 'colorways-wrapper.ejs'),
        landscape: true, // LANDSCAPE
        condition: (d) => d.colorways && d.colorways.length > 0,
      },
      {
        name: 'notes-care',
        template: path.join(TEMPLATE_DIR, 'partials', 'notes-care.ejs'),
        landscape: true, // LANDSCAPE
        condition: (d) => (d.notes && d.notes.length > 0) || (d.careSymbols && d.careSymbols.length > 0),
      },
    ];

    // Add dynamic sections for each sample round (one page per round)
    if (htmlPayload && htmlPayload.sampleRounds && htmlPayload.sampleRounds.rounds && htmlPayload.sampleRounds.rounds.length > 0) {
      htmlPayload.sampleRounds.rounds.forEach((_round: any, index: number) => {
        baseSections.push({
          name: `sample-round-${index + 1}`,
          template: path.join(TEMPLATE_DIR, 'partials', 'sample-measurement-round-single.ejs'),
          landscape: true, // LANDSCAPE - Each round on separate page
          condition: () => true, // Always include if rounds exist
        });
      });
    }

    return baseSections;
  }

  private async generateForKey(cacheKey: string, options: GenerateOptions): Promise<PDFMetadata> {
    // Validate input data
    if (!options.techpack) {
      throw new PDFGenerationError(
        PDFErrorCode.TEMPLATE_ERROR,
        'Techpack data is required'
      );
    }

    if (!options.techpack._id) {
      throw new PDFGenerationError(
        PDFErrorCode.TEMPLATE_ERROR,
        'Techpack ID is required'
      );
    }

    // Cleanup old temp files before generating new one
    await this.cleanupOldTempFiles(options.techpack);

    const filePath = await this.buildFilePath(options.techpack);
    const renderOptions: any = {
      printedBy: options.printedBy,
      generatedAt: new Date(),
    };
    if (options.includeSections !== undefined) {
      renderOptions.includeSections = options.includeSections;
    }

    let htmlPayload;
    try {
      htmlPayload = await buildRenderModel(options.techpack, renderOptions);
    } catch (error: any) {
      throw new PDFGenerationError(
        PDFErrorCode.TEMPLATE_ERROR,
        `Failed to build render model: ${error?.message || 'Unknown error'}`,
        error
      );
    }
    const sections = this.getSections(htmlPayload).filter((section) => {
      if (options.includeSections && !options.includeSections.includes(section.name)) {
        return false;
      }
      return !section.condition || section.condition(htmlPayload);
    });

    if (sections.length === 0) {
      throw new PDFGenerationError(
        PDFErrorCode.TEMPLATE_ERROR,
        'No sections to render'
      );
    }

    const generatedAtFormatted = htmlPayload.generatedAt || formatDate(new Date());
    const headerTemplate = await this.generateHeaderTemplate(
      htmlPayload.meta,
      options.printedBy,
      generatedAtFormatted
    );
    const footerTemplate = await this.generateFooterTemplate(
      htmlPayload.meta,
      options.printedBy,
      generatedAtFormatted
    );

    const browser = await this.getBrowser();
    let page: Page | null = null;

    const tempPdfPaths: string[] = [];

    try {
      // Render each section as a separate PDF
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const tempPath = path.join(TMP_DIR, `section-${i}-${Date.now()}.pdf`);

        // Create new page for each section to avoid connection issues
        // Reuse page if it's still open, otherwise create new one
        let pageNeedsCreation = false;
        if (!page) {
          pageNeedsCreation = true;
        } else {
          try {
            // Check if page is closed by trying to access a property
            const isClosed = page.isClosed();
            if (isClosed) {
              pageNeedsCreation = true;
            }
          } catch (e) {
            // Page might be in invalid state, create new one
            pageNeedsCreation = true;
            page = null;
          }
        }

        if (pageNeedsCreation) {
          if (page) {
            try {
              await page.close();
            } catch (e) {
              // Ignore if already closed
            }
          }
          page = await browser.newPage();
          // Set viewport to ensure consistent rendering
          await page.setViewport({ width: 1920, height: 1080 });
          // Set default timeout - increased for large sections
          page.setDefaultTimeout(PDF_SECTION_TIMEOUT);
          page.setDefaultNavigationTimeout(PDF_SECTION_TIMEOUT);
        }

        // Render section HTML with proper context
        const sectionContext: any = {
          ...htmlPayload,
          strings: htmlPayload.strings,
          // Pass section-specific data
          bom: htmlPayload.bom,
          bomImages: htmlPayload.bomImages,
          measurements: htmlPayload.measurements,
          sampleRounds: htmlPayload.sampleRounds,
          howToMeasure: htmlPayload.howToMeasure,
          colorways: htmlPayload.colorways,
          notes: htmlPayload.notes,
          careSymbols: htmlPayload.careSymbols,
          meta: htmlPayload.meta,
          summary: htmlPayload.summary,
          images: htmlPayload.images,
          printedBy: options.printedBy,
          generatedAt: htmlPayload.generatedAt,
        };

        // For sample round sections, pass the specific round data
        if (section.name.startsWith('sample-round-')) {
          const roundIndex = parseInt(section.name.replace('sample-round-', '')) - 1;
          if (htmlPayload.sampleRounds && htmlPayload.sampleRounds.rounds && htmlPayload.sampleRounds.rounds[roundIndex]) {
            sectionContext.round = htmlPayload.sampleRounds.rounds[roundIndex];
          }
        }

        const sectionHtml = await this.renderSectionTemplate(section.template, sectionContext);

        // Ensure it's a full HTML document
        const fullHtml = sectionHtml.includes('<!DOCTYPE') 
          ? sectionHtml 
          : `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${sectionHtml}</body></html>`;

        // Log để debug
        console.log(`[PDF] Rendering section: ${section.name}, landscape: ${section.landscape}`);
        
        let sectionRendered = false;
        let retryCount = 0;
        
        while (!sectionRendered && retryCount <= PDF_MAX_RETRIES) {
          try {
            // Verify page is still valid before rendering
            if (!page || page.isClosed()) {
              // Create new page if needed
              if (page) {
                try {
                  if (!page.isClosed()) {
                    await page.close();
                  }
                } catch (e) {
                  // Ignore close errors
                }
              }
              page = await browser.newPage();
              await page.setViewport({ width: 1920, height: 1080 });
              page.setDefaultTimeout(PDF_SECTION_TIMEOUT);
              page.setDefaultNavigationTimeout(PDF_SECTION_TIMEOUT);
            }

            await this.renderSectionAsPDF(
              page,
              fullHtml,
              section.landscape,
              headerTemplate,
              footerTemplate,
              tempPath,
              retryCount
            );

            tempPdfPaths.push(tempPath);
            sectionRendered = true;
            console.log(`[PDF] Successfully rendered section ${section.name}`);
          } catch (sectionError: any) {
            const errorMessage = sectionError?.message || String(sectionError);
            const isRetryable = sectionError?.retryable || (
              errorMessage.includes('closed') ||
              errorMessage.includes('Connection closed') ||
              errorMessage.includes('Target closed') ||
              errorMessage.includes('timeout')
            );

            if (isRetryable && retryCount < PDF_MAX_RETRIES) {
              retryCount++;
              console.warn(`[PDF] Error rendering section ${section.name} (attempt ${retryCount}/${PDF_MAX_RETRIES}), retrying...`, errorMessage);
              
              // Close and recreate page
              if (page) {
                try {
                  if (!page.isClosed()) {
                    await page.close();
                  }
                } catch (e) {
                  // Ignore close errors
                }
                page = null;
              }
              
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
              continue;
            } else {
              // Max retries exceeded or non-retryable error
              console.error(`[PDF] Failed to render section ${section.name} after ${retryCount} attempts:`, errorMessage);
              
              // Clean up temp file if it was partially created
              try {
                await unlink(tempPath);
              } catch (e) {
                // Ignore cleanup errors
              }
              
              throw new PDFGenerationError(
                PDFErrorCode.PUPPETEER_ERROR,
                `Failed to render section ${section.name} after ${retryCount} attempts: ${errorMessage}`,
                sectionError?.error || sectionError
              );
            }
          }
        }
      }

      // Merge all PDFs into one
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < tempPdfPaths.length; i++) {
        const tempPath = tempPdfPaths[i];
        const section = sections[i];
        try {
          const pdfBytes = await readFile(tempPath);
          const pdf = await PDFDocument.load(pdfBytes);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          
          // Log để debug orientation
          console.log(`[PDF] Merging section "${section.name}" (landscape: ${section.landscape}) with ${pages.length} page(s)`);
          
          pages.forEach((page) => {
            // pdf-lib sẽ tự động giữ nguyên orientation của page khi copy
            mergedPdf.addPage(page);
          });
        } catch (error) {
          console.error(`Failed to merge PDF section ${tempPath}:`, error);
        }
      }

      // Save merged PDF
      const mergedPdfBytes = await mergedPdf.save();
      await fs.promises.writeFile(filePath, mergedPdfBytes);

      // Cleanup temp files
      for (const tempPath of tempPdfPaths) {
        try {
          await unlink(tempPath);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      // Cleanup on error
      for (const tempPath of tempPdfPaths) {
        try {
          await unlink(tempPath);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    } finally {
      // Safely close page if it exists and is not closed
      if (page) {
        try {
          // Check if page is closed before attempting to close
          const isClosed = page.isClosed();
          if (!isClosed) {
            await page.close();
          }
        } catch (error: any) {
          // Ignore errors when closing page (might already be closed or in invalid state)
          // Only log if it's not a "closed" error
          if (error && error.message && 
              !error.message.includes('closed') && 
              !error.message.includes('Connection closed') &&
              !error.message.includes('Target closed')) {
            console.warn('[PDF] Error closing page (ignored):', error.message);
          }
        }
      }
    }

    const { size, pages } = await this.inspectPdf(filePath);
    const metadata: PDFMetadata = {
      path: filePath,
      size,
      pages,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    await cacheService.set(cacheKey, metadata, PDF_CACHE_TTL);
    console.log(`[PDF] Successfully generated PDF: ${filePath} (${pages} pages, ${(size / 1024).toFixed(2)} KB)`);
    return metadata;
  }

  private async inspectPdf(filePath: string) {
    const stats = await stat(filePath);
    const pageCount = await this.countPages(filePath);
    return { size: stats.size, pages: pageCount };
  }

  private async countPages(filePath: string): Promise<number> {
    const stream = fs.createReadStream(filePath);
    let pages = 0;
    const pattern = /\/Type\s*\/Page[^s]/g;

    return new Promise<number>((resolve, reject) => {
      stream.on('data', (chunk) => {
        const matches = chunk.toString('utf8').match(pattern);
        if (matches) pages += matches.length;
      });
      stream.on('end', () => resolve(Math.max(pages, 1)));
      stream.on('error', reject);
    });
  }

  async getOrCreatePdf(options: GenerateOptions): Promise<PDFMetadata> {
    // Validate input
    if (!options.techpack) {
      throw new PDFGenerationError(
        PDFErrorCode.TEMPLATE_ERROR,
        'Techpack data is required'
      );
    }

    const cacheKey = await this.buildCacheKey(options.techpack);

    if (!options.force) {
      const cached = await cacheService.get<PDFMetadata>(cacheKey);
      if (cached) {
        try {
          const stats = await stat(cached.path);
          if (stats.isFile()) {
            console.log(`[PDF] Using cached PDF: ${cached.path}`);
            return { ...cached, cached: true };
          }
        } catch {
          // File doesn't exist, delete cache entry
          await cacheService.del(cacheKey);
        }
      }
    } else {
      // Force regenerate - delete cache and old files
      await cacheService.del(cacheKey);
      await this.cleanupOldTempFiles(options.techpack);
      console.log(`[PDF] Force regenerate requested, cache cleared`);
    }

    if (this.inFlight.has(cacheKey)) {
      return this.inFlight.get(cacheKey)!;
    }

    const job: Promise<PDFMetadata> = this.queue.add(async () => {
      let timer: NodeJS.Timeout | null = null;
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new PDFGenerationError(PDFErrorCode.PUPPETEER_ERROR, 'PDF generation timeout'));
          }, PDF_TIMEOUT);
        });

        const result = await Promise.race<PDFMetadata>([
          this.generateForKey(cacheKey, options),
          timeoutPromise,
        ]);

        return result;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }) as Promise<PDFMetadata>;

    this.inFlight.set(cacheKey, job);

    try {
      const result = await job;
      return result;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  async validate(techpack: any) {
    const errors: string[] = [];
    
    if (!techpack) {
      errors.push('Techpack data is required');
      return { isValid: false, errors };
    }
    
    if (!techpack._id) {
      errors.push('Techpack ID is required');
    }
    
    if (!techpack.productName) {
      errors.push('Product name is required');
    }
    
    if (!techpack.articleCode) {
      errors.push('Article code is required');
    }
    
    if (!techpack.version) {
      errors.push('Version is required');
    }

    // Validate template files exist
    try {
      const partialsDir = path.join(TEMPLATE_DIR, 'partials');
      const requiredTemplates = [
        'cover-summary.ejs',
        'bom-table-wrapper.ejs',
        'header.ejs',
        'footer.ejs',
      ];
      
      for (const template of requiredTemplates) {
        const templatePath = path.join(partialsDir, template);
        try {
          await stat(templatePath);
        } catch {
          errors.push(`Required template file missing: ${template}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to validate template files: ${(error as Error).message}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  async cleanup(filePath: string) {
    try {
      await unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn('Failed to remove temp PDF', filePath, error);
      }
    }
  }
}

export const pdfMultiSectionService = new PDFMultiSectionService();
export default pdfMultiSectionService;

