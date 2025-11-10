import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import ejs from 'ejs';
import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer';
import PQueue from 'p-queue';
import { buildRenderModel } from './pdf-renderer.service';
import { cacheService } from './cache.service';
import { PDFGenerationError, PDFErrorCode } from '../types/techpack.types';

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

const TEMPLATE_DIR = path.join(__dirname, '../templates');
const TMP_DIR = process.env.PDF_TMP_DIR || path.join(os.tmpdir(), 'techpack-pdf');
const PDF_TIMEOUT = Number(process.env.PDF_TIMEOUT || 60_000);
const PDF_CACHE_TTL = Number(process.env.PDF_CACHE_TTL || 21_600);
const PDF_CONCURRENCY = Number(process.env.PDF_CONCURRENCY || 3);

interface GenerateOptions {
  techpack: any;
  printedBy: string;
  includeSections?: string[];
  force?: boolean;
  // If true, generate PDF in landscape orientation
  landscape?: boolean;
}

interface PDFMetadata {
  path: string;
  size: number;
  pages: number;
  generatedAt: string;
  cached: boolean;
}

interface PreviewOptions extends GenerateOptions {
  width?: number;
}

export class PDFService {
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
        ],
      });
    }
    return this.browserPromise;
  }

  private buildCacheKey(techpack: any, options?: GenerateOptions) {
    const updatedAt = techpack.updatedAt ? new Date(techpack.updatedAt).getTime() : 0;
    const orientation = options?.landscape === false ? 'portrait' : 'landscape';
    return `pdf:techpack:${techpack._id}:v${techpack.version}:${updatedAt}:${orientation}`;
  }

  private buildFilePath(techpack: any) {
    const safeName = String(techpack.articleCode || techpack._id).replace(/[^a-z0-9_-]+/gi, '_');
    return path.join(TMP_DIR, `techpack-${safeName}-v${techpack.version}.pdf`);
  }

  private async renderTemplate(payload: any): Promise<string> {
    const templatePath = path.join(TEMPLATE_DIR, 'techpack-template.ejs');
    try {
      return await ejs.renderFile(templatePath, payload, { async: true });
    } catch (error) {
      throw new PDFGenerationError(
        PDFErrorCode.TEMPLATE_ERROR,
        `Template rendering failed: ${(error as Error)?.message ?? 'unknown error'}`,
        error
      );
    }
  }

  private async renderPartial(name: string, payload: any): Promise<string> {
    const filePath = path.join(TEMPLATE_DIR, 'partials', `${name}.ejs`);
    return ejs.renderFile(filePath, payload, { async: true });
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
    const html = await this.renderTemplate(htmlPayload);

    const headerTemplate = await this.renderPartial('header', {
      meta: htmlPayload.meta,
      printedBy: options.printedBy,
      generatedAt: htmlPayload.generatedAt,
    });
    const footerTemplate = await this.renderPartial('footer', {
      meta: htmlPayload.meta,
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    const isLandscape = options.landscape !== false;

    try {
      await page.setContent(html, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
      });

      await page.pdf({
        path: filePath,
        format: 'A4',
        landscape: isLandscape,
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
    } catch (error) {
      throw new PDFGenerationError(
        PDFErrorCode.PUPPETEER_ERROR,
        `PDF generation failed: ${(error as Error)?.message ?? 'unknown error'}`,
        error
      );
    } finally {
      await page.close();
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
    const cacheKey = this.buildCacheKey(options.techpack, options);

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

  async generatePreview(options: PreviewOptions): Promise<string> {
    const renderOptions: any = {
      printedBy: options.printedBy,
      generatedAt: new Date(),
    };
    if (options.includeSections !== undefined) {
      renderOptions.includeSections = options.includeSections;
    }
    const payload = await buildRenderModel(options.techpack, renderOptions);

    const html = await this.renderTemplate(payload);
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1200, height: 1600 });
      await page.setContent(html, { waitUntil: ['networkidle0', 'domcontentloaded'] });
      const buffer = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: options.width || 1280, height: 960 },
      });
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } finally {
      await page.close();
    }
  }

  async validate(techpack: any) {
    const errors: string[] = [];
    if (!techpack.productName) errors.push('Product name is required');
    if (!techpack.articleCode) errors.push('Article code is required');
    if (!techpack.version) errors.push('Version is required');
    if (!Array.isArray(techpack.bom) || techpack.bom.length === 0) {
      errors.push('At least one BOM item is required');
    }
    if (!Array.isArray(techpack.measurements) || techpack.measurements.length === 0) {
      errors.push('At least one measurement is required');
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

export const pdfService = new PDFService();
export default pdfService;
