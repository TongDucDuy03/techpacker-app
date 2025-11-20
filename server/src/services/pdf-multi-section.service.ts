import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
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

const TEMPLATE_DIR = path.join(__dirname, '../templates');
const TMP_DIR = process.env.PDF_TMP_DIR || path.join(os.tmpdir(), 'techpack-pdf');
const PDF_TIMEOUT = Number(process.env.PDF_TIMEOUT || 300_000); // 5 minutes for multi-section with many sections
const PDF_CACHE_TTL = Number(process.env.PDF_CACHE_TTL || 21_600);
const PDF_CONCURRENCY = Number(process.env.PDF_CONCURRENCY || 1); // Reduced to 1 for stability with complex PDFs

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

  private buildCacheKey(techpack: any) {
    const updatedAt = techpack.updatedAt ? new Date(techpack.updatedAt).getTime() : 0;
    return `pdf:techpack:${techpack._id}:v${techpack.version}:${updatedAt}:multisection`;
  }

  private buildFilePath(techpack: any) {
    const safeName = String(techpack.articleCode || techpack._id).replace(/[^a-z0-9_-]+/gi, '_');
    return path.join(TMP_DIR, `techpack-${safeName}-v${techpack.version}-full.pdf`);
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
    outputPath: string
  ): Promise<void> {
    try {
      // Verify page is still open before setting content
      if (page.isClosed()) {
        throw new Error('Page was closed before setting content');
      }

      // Set timeout for content loading
      // Use a more lenient wait strategy to avoid timeouts
      try {
        await page.setContent(html, {
          waitUntil: ['domcontentloaded'], // Use domcontentloaded for faster loading
          timeout: 30000, // 30 seconds timeout
        });
      } catch (contentError: any) {
        // Check if page was closed during content loading
        if (page.isClosed() || 
            (contentError.message && (
              contentError.message.includes('closed') || 
              contentError.message.includes('Connection closed')
            ))) {
          throw new Error('Page was closed during content loading');
        }
        
        // If timeout, try with shorter wait
        if (contentError.message && contentError.message.includes('timeout')) {
          console.warn(`[PDF] Content loading timeout, retrying with shorter wait`);
          if (!page.isClosed()) {
            await page.setContent(html, {
              waitUntil: ['load'], // Even shorter wait
              timeout: 20000,
            });
          }
        } else {
          throw contentError;
        }
      }

      // Wait a bit for any dynamic content to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify page is still open before generating PDF
      if (page.isClosed()) {
        throw new Error('Page was closed before generating PDF');
      }

      // Đảm bảo landscape được áp dụng đúng
      const pdfOptions: any = {
        path: outputPath,
        format: 'A4',
        landscape: landscape, // Explicitly set landscape
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        timeout: 60000, // 60 seconds timeout for PDF generation
      };

      console.log(`[PDF] Generating PDF with landscape=${landscape} for ${outputPath}`);
      
      // Generate PDF with error handling
      try {
        await page.pdf(pdfOptions);
      } catch (pdfError: any) {
        // Check if page was closed
        if (pdfError.message && (pdfError.message.includes('closed') || pdfError.message.includes('Connection closed'))) {
          throw new Error(`Page was closed during PDF generation. This may indicate the page crashed or timed out.`);
        }
        throw pdfError;
      }
    } catch (error) {
      console.error(`[PDF] Error rendering section to PDF:`, error);
      throw error;
    }
  }

  private getSections(): SectionConfig[] {
    return [
      {
        name: 'cover-summary',
        template: path.join(TEMPLATE_DIR, 'partials', 'cover-summary.ejs'),
        landscape: false,
        condition: () => true, // Always include cover
      },
      {
        name: 'bom-table',
        template: path.join(TEMPLATE_DIR, 'partials', 'bom-table-wrapper.ejs'),
        landscape: false,
        condition: (d) => d.bom && d.bom.rows && d.bom.rows.length > 0,
      },
      {
        name: 'bom-images',
        template: path.join(TEMPLATE_DIR, 'partials', 'bom-images-wrapper.ejs'),
        landscape: false,
        condition: (d) => d.bomImages && d.bomImages.length > 0,
      },
      {
        name: 'measurement-table',
        template: path.join(TEMPLATE_DIR, 'partials', 'measurement-table-landscape.ejs'),
        landscape: true, // LANDSCAPE
        condition: (d) => d.measurements && d.measurements.rows && d.measurements.rows.length > 0,
      },
      {
        name: 'sample-measurement-rounds',
        template: path.join(TEMPLATE_DIR, 'partials', 'sample-measurement-rounds-wrapper.ejs'),
        landscape: true, // LANDSCAPE
        condition: (d) => d.sampleRounds && d.sampleRounds.rounds && d.sampleRounds.rounds.length > 0,
      },
      {
        name: 'how-to-measure',
        template: path.join(TEMPLATE_DIR, 'partials', 'how-to-measure-wrapper.ejs'),
        landscape: false,
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
        landscape: false,
        condition: (d) => (d.notes && d.notes.length > 0) || (d.careSymbols && d.careSymbols.length > 0),
      },
    ];
  }

  private async generateForKey(cacheKey: string, options: GenerateOptions): Promise<PDFMetadata> {
    const filePath = this.buildFilePath(options.techpack);
    const renderOptions: any = {
      printedBy: options.printedBy,
      generatedAt: new Date(),
    };
    if (options.includeSections !== undefined) {
      renderOptions.includeSections = options.includeSections;
    }

    const htmlPayload = await buildRenderModel(options.techpack, renderOptions);
    const sections = this.getSections().filter((section) => {
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
          // Set default timeout
          page.setDefaultTimeout(60000);
          page.setDefaultNavigationTimeout(60000);
        }

        // Render section HTML with proper context
        const sectionContext = {
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

        const sectionHtml = await this.renderSectionTemplate(section.template, sectionContext);

        // Ensure it's a full HTML document
        const fullHtml = sectionHtml.includes('<!DOCTYPE') 
          ? sectionHtml 
          : `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${sectionHtml}</body></html>`;

        // Log để debug
        console.log(`[PDF] Rendering section: ${section.name}, landscape: ${section.landscape}`);
        
        try {
          // Verify page is still valid before rendering
          if (!page || page.isClosed()) {
            throw new Error(`Page is closed or invalid before rendering section ${section.name}`);
          }

          await this.renderSectionAsPDF(
            page,
            fullHtml,
            section.landscape,
            headerTemplate,
            footerTemplate,
            tempPath
          );

          tempPdfPaths.push(tempPath);
        } catch (sectionError: any) {
          console.error(`[PDF] Error rendering section ${section.name}:`, sectionError);
          
          // If page was closed or crashed, mark it for recreation
          if (page && (
            page.isClosed() || 
            (sectionError.message && (
              sectionError.message.includes('closed') || 
              sectionError.message.includes('Connection closed') ||
              sectionError.message.includes('Target closed')
            ))
          )) {
            console.warn(`[PDF] Page was closed/crashed, will recreate for next section`);
            try {
              if (!page.isClosed()) {
                await page.close();
              }
            } catch (e) {
              // Ignore close errors
            }
            page = null; // Force recreation on next iteration
          }
          
          // Re-throw to stop processing
          throw sectionError;
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
    const cacheKey = this.buildCacheKey(options.techpack);

    if (!options.force) {
      const cached = await cacheService.get<PDFMetadata>(cacheKey);
      if (cached) {
        try {
          const stats = await stat(cached.path);
          if (stats.isFile()) {
            return { ...cached, cached: true };
          }
        } catch {
          await cacheService.del(cacheKey);
        }
      }
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
    if (!techpack.productName) errors.push('Product name is required');
    if (!techpack.articleCode) errors.push('Article code is required');
    if (!techpack.version) errors.push('Version is required');
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

