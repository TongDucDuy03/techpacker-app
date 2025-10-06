import puppeteer, { Browser, Page, PDFOptions } from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs/promises';
import { 
  TechPackData, 
  PDFGenerationOptions, 
  PDFResponse, 
  PDFPreviewResponse,
  TemplateData,
  PDFGenerationError,
  PDFErrorCode
} from '@/types/techpack.types';

export class PDFService {
  private browser: Browser | null = null;
  private readonly templatePath: string;
  private readonly defaultOptions: PDFGenerationOptions;

  constructor() {
    this.templatePath = path.join(__dirname, '../templates');
    this.defaultOptions = {
      format: 'A4',
      orientation: 'portrait',
      margin: {
        top: '30px',
        bottom: '40px',
        left: '20px',
        right: '20px'
      },
      printBackground: true,
      displayHeaderFooter: true,
      scale: 1,
      preferCSSPageSize: false,
      generateTaggedPDF: true,
      includeImages: true,
      imageQuality: 90,
      compressImages: true
    };
  }

  /**
   * Initialize Puppeteer browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
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
   * Generate PDF from TechPack data
   */
  async generateTechPackPDF(
    data: TechPackData, 
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<PDFResponse> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const templateData = this.prepareTemplateData(data);
      
      // Render HTML from EJS template
      const html = await this.renderTemplate(templateData);
      
      // Generate PDF using Puppeteer
      const pdfBuffer = await this.generatePDFFromHTML(html, mergedOptions);
      
      const filename = `${data.techpack.articleCode}_v${data.techpack.version}.pdf`;
      
      return {
        success: true,
        message: 'PDF generated successfully',
        data: {
          buffer: pdfBuffer,
          filename,
          size: pdfBuffer.length,
          pages: await this.countPDFPages(pdfBuffer),
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('PDF Generation Error:', error);
      return {
        success: false,
        message: 'Failed to generate PDF',
        error: {
          code: this.getErrorCode(error),
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        }
      };
    }
  }

  /**
   * Generate PDF preview (base64 encoded)
   */
  async generatePDFPreview(
    data: TechPackData,
    page: number = 1,
    options: Partial<PDFGenerationOptions> = {}
  ): Promise<PDFPreviewResponse> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const templateData = this.prepareTemplateData(data);
      const html = await this.renderTemplate(templateData);
      
      const browser = await this.initBrowser();
      const browserPage = await browser.newPage();
      
      await browserPage.setContent(html, { waitUntil: 'networkidle0' });
      
      // Generate screenshot of specific page
      const screenshot = await browserPage.screenshot({
        type: 'png',
        fullPage: false,
        clip: {
          x: 0,
          y: (page - 1) * 842, // A4 height in pixels at 72 DPI
          width: 595, // A4 width in pixels at 72 DPI
          height: 842
        }
      });
      
      await browserPage.close();
      
      const base64 = screenshot.toString('base64');
      const filename = `${data.techpack.articleCode}_preview_p${page}.png`;
      
      return {
        success: true,
        message: 'Preview generated successfully',
        data: {
          base64,
          filename,
          previewUrl: `data:image/png;base64,${base64}`
        }
      };
    } catch (error) {
      console.error('PDF Preview Error:', error);
      return {
        success: false,
        message: 'Failed to generate preview',
        error: {
          code: this.getErrorCode(error),
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Render EJS template with data
   */
  private async renderTemplate(data: TemplateData): Promise<string> {
    try {
      const templateFile = path.join(this.templatePath, 'techpack-template.ejs');
      const html = await ejs.renderFile(templateFile, data, {
        async: true,
        cache: false
      });
      return html;
    } catch (error) {
      throw new PDFGenerationError(
        PDFErrorCode.TEMPLATE_ERROR,
        `Template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Generate PDF from HTML using Puppeteer
   */
  private async generatePDFFromHTML(
    html: string, 
    options: PDFGenerationOptions
  ): Promise<Buffer> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Set content and wait for all resources to load
      await page.setContent(html, { 
        waitUntil: ['networkidle0', 'domcontentloaded'] 
      });
      
      // Wait for images to load
      if (options.includeImages) {
        await page.evaluate(() => {
          return Promise.all(
            Array.from(document.images, img => {
              if (img.complete) return Promise.resolve();
              return new Promise(resolve => {
                img.onload = img.onerror = resolve;
              });
            })
          );
        });
      }
      
      // Generate PDF
      const pdfOptions: PDFOptions = {
        format: options.format,
        landscape: options.orientation === 'landscape',
        margin: options.margin,
        printBackground: options.printBackground,
        displayHeaderFooter: options.displayHeaderFooter,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || this.getDefaultFooter(),
        scale: options.scale,
        preferCSSPageSize: options.preferCSSPageSize,
        tagged: options.generateTaggedPDF
      };
      
      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    } catch (error) {
      throw new PDFGenerationError(
        PDFErrorCode.PUPPETEER_ERROR,
        `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    } finally {
      await page.close();
    }
  }

  /**
   * Prepare template data with additional metadata
   */
  private prepareTemplateData(data: TechPackData): TemplateData {
    return {
      ...data,
      generatedAt: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      pageTitle: `${data.techpack.name} - Tech Pack`,
      showWatermark: !!data.watermark,
      pageBreaks: {
        afterHeader: true,
        afterBOM: true,
        afterMeasurements: true,
        afterHowToMeasure: false
      },
      logoUrl: data.logoUrl || this.getDefaultLogoUrl()
    };
  }

  /**
   * Count pages in PDF buffer
   */
  private async countPDFPages(buffer: Buffer): Promise<number> {
    // Simple page count estimation based on buffer size
    // In production, you might want to use a PDF parsing library
    const avgPageSize = 50000; // Average bytes per page
    return Math.max(1, Math.ceil(buffer.length / avgPageSize));
  }

  /**
   * Get error code from error object
   */
  private getErrorCode(error: any): string {
    if (error instanceof PDFGenerationError) {
      return error.code;
    }
    if (error.message?.includes('Template')) {
      return PDFErrorCode.TEMPLATE_ERROR;
    }
    if (error.message?.includes('Puppeteer')) {
      return PDFErrorCode.PUPPETEER_ERROR;
    }
    return PDFErrorCode.NETWORK_ERROR;
  }

  /**
   * Get default footer template
   */
  private getDefaultFooter(): string {
    return `
      <div style="font-size: 10px; text-align: center; width: 100%; color: #666; margin-top: 10px;">
        <span>Generated on <span class="date"></span> | Page <span class="pageNumber"></span> of <span class="totalPages"></span> | Powered by TechPacker App</span>
      </div>
    `;
  }

  /**
   * Get default logo URL
   */
  private getDefaultLogoUrl(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB2aWV3Qm94PSIwIDAgMTAwIDQwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8dGV4dCB4PSI1MCIgeT0iMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMzMzMiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlRlY2hQYWNrZXI8L3RleHQ+Cjwvc3ZnPgo=';
  }

  /**
   * Validate TechPack data before PDF generation
   */
  validateTechPackData(data: TechPackData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.techpack?.name) errors.push('TechPack name is required');
    if (!data.techpack?.articleCode) errors.push('Article code is required');
    if (!data.techpack?.version) errors.push('Version is required');
    if (!data.materials || data.materials.length === 0) errors.push('At least one material is required');
    if (!data.measurements || data.measurements.length === 0) errors.push('At least one measurement is required');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const pdfService = new PDFService();
export default pdfService;
