import { Response } from 'express';
import TechPack from '../models/techpack.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { logActivity } from '../utils/activity-logger';
import { ActivityAction } from '../models/activity.model';
import { TechPackData } from '../types/techpack.types';
import { Types } from 'mongoose';

// Import PDF service from existing implementation
import pdfService from '../services/pdf.service';

export class PDFController {
  /**
   * Export TechPack as PDF
   * GET /api/techpacks/:id/pdf
   */
  async exportTechPackPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { options } = req.query;

      // Get TechPack with all related data
      const techpack = await TechPack.findById(id)
        .populate('technicalDesignerId', 'firstName lastName username')
        .populate('createdBy', 'firstName lastName username')
        .populate('updatedBy', 'firstName lastName username')
        .lean();

      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions
      if (user.role === UserRole.Designer &&
          techpack.technicalDesignerId._id.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only export your own TechPacks.'
        });
        return;
      }

      // Transform TechPack data to PDF service format
      const pdfData: TechPackData = this.transformTechPackForPDF(techpack);

      // Parse PDF options if provided
      let pdfOptions = {};
      if (options && typeof options === 'string') {
        try {
          pdfOptions = JSON.parse(options);
        } catch (error) {
          console.warn('Invalid PDF options format:', options);
        }
      }

      // Generate PDF using existing service
      const result = await pdfService.generateTechPackPDF(pdfData, pdfOptions);

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: 'Failed to generate PDF',
          error: result.error
        });
        return;
      }

      // Log activity
      await logActivity({
        userId: user._id,
        userName: user.fullName,
        action: ActivityAction.PDF_EXPORT,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName
        },
        details: {
          filename: result.data?.filename,
          size: result.data?.size,
          pages: result.data?.pages
        },
        req
      });

      // Set response headers for PDF download
      const filename = result.data?.filename || `${techpack.articleCode}_${techpack.version}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', result.data?.size || 0);
      res.setHeader('Cache-Control', 'no-cache');

      // Send PDF buffer
      res.send(result.data?.buffer);

    } catch (error: any) {
      console.error('PDF export error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during PDF export',
        error: error.message
      });
    }
  }

  /**
   * Generate PDF preview
   * GET /api/techpacks/:id/pdf/preview
   */
  async generatePDFPreview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, options } = req.query;
      const user = req.user!;

      // Get TechPack data
      const techpack = await TechPack.findById(id)
        .populate('designer', 'firstName lastName username')
        .lean();

      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions
      if (user.role === UserRole.Designer &&
          techpack.technicalDesignerId._id.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only preview your own TechPacks.'
        });
        return;
      }

      // Transform data and generate preview
      const pdfData: TechPackData = this.transformTechPackForPDF(techpack);

      let pdfOptions = {};
      if (options && typeof options === 'string') {
        try {
          pdfOptions = JSON.parse(options);
        } catch (error) {
          console.warn('Invalid PDF options format:', options);
        }
      }

      const result = await pdfService.generatePDFPreview(
        pdfData,
        parseInt(page as string) || 1,
        pdfOptions
      );

      res.json(result);

    } catch (error: any) {
      console.error('PDF preview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate PDF preview',
        error: error.message
      });
    }
  }

  /**
   * Get PDF generation info
   * GET /api/techpacks/:id/pdf/info
   */
  async getPDFInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id).lean();

      if (!techpack) {
        res.status(404).json({
          success: false,
          message: 'TechPack not found'
        });
        return;
      }

      // Check access permissions
      if (user.role === UserRole.Designer &&
          techpack.technicalDesignerId.toString() !== user._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only view info for your own TechPacks.'
        });
        return;
      }

      // Transform data for validation
      const pdfData: TechPackData = this.transformTechPackForPDF(techpack);
      const validation = pdfService.validateTechPackData(pdfData);

      res.json({
        success: true,
        data: {
          techpackId: id,
          articleCode: techpack.articleCode,
          version: techpack.version,
          productName: techpack.productName,
          status: techpack.status,
          isValid: validation.isValid,
          validationErrors: validation.errors,
          estimatedPages: this.estimatePageCount(pdfData),
          lastModified: techpack.updatedAt,
          canGeneratePDF: validation.isValid,
          supportedFormats: ['A4', 'Letter', 'Legal'],
          supportedOrientations: ['portrait', 'landscape']
        }
      });

    } catch (error: any) {
      console.error('PDF info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get PDF info',
        error: error.message
      });
    }
  }

  /**
   * Transform TechPack model data to PDF service format
   */
  private transformTechPackForPDF(techpack: any): TechPackData {
    return {
      techpack: {
        _id: techpack._id,
        name: techpack.productName,
        articleCode: techpack.articleCode,
        version: techpack.version,
        designer: techpack.technicalDesignerId ? `${techpack.technicalDesignerId.firstName} ${techpack.technicalDesignerId.lastName}` : 'Unknown Designer',
        supplier: techpack.supplier,
        season: techpack.season,
        fabricDescription: techpack.fabricDescription,
        lifecycleStage: techpack.status,
        createdAt: techpack.createdAt,
        lastModified: techpack.updatedAt,
        category: techpack.category,
        gender: techpack.gender,
        brand: techpack.brand,
        collection: techpack.collection,
        retailPrice: techpack.retailPrice,
        currency: techpack.currency,
        description: techpack.description,
        notes: techpack.notes
      },
      materials: techpack.bom || [],
      measurements: techpack.measurements || [],
      howToMeasure: techpack.howToMeasure || [],
      colorways: techpack.colorways || [],
      logoUrl: this.getLogoUrl(techpack.supplier)
    };
  }

  /**
   * Get logo URL based on supplier
   */
  private getLogoUrl(supplier: string): string {
    // This could be enhanced to fetch actual logos from a database or service
    const logoMap: { [key: string]: string } = {
      'LS Apparel': 'https://example.com/logos/ls-apparel.png',
      'Fashion Co': 'https://example.com/logos/fashion-co.png',
      'Textile Mills': 'https://example.com/logos/textile-mills.png'
    };

    return logoMap[supplier] || 'https://example.com/logos/default.png';
  }

  /**
   * Estimate page count based on content
   */
  private estimatePageCount(data: TechPackData): number {
    let pages = 1; // Header page

    // BOM pages
    if (data.materials.length > 0) {
      pages += Math.ceil(data.materials.length / 15); // ~15 materials per page
    }

    // Measurement pages
    if (data.measurements.length > 0) {
      pages += Math.ceil(data.measurements.length / 20); // ~20 measurements per page
    }

    // How to measure pages
    if (data.howToMeasure.length > 0) {
      pages += Math.ceil(data.howToMeasure.length / 3); // ~3 instructions per page
    }

    // Colorways page
    if (data.colorways.length > 0) {
      pages += 1;
    }

    return pages;
  }

}

export default new PDFController();
