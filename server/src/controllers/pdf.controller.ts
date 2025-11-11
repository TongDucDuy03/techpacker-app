import { Response } from 'express';
import fs from 'fs';
import { Types } from 'mongoose';
import TechPack from '../models/techpack.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { hasViewAccess } from '../utils/access-control.util';
import pdfService from '../services/pdf.service';
import pdfMultiSectionService from '../services/pdf-multi-section.service';
import { logActivity } from '../utils/activity-logger';
import { ActivityAction } from '../models/activity.model';
import { buildRenderModel } from '../services/pdf-renderer.service';

const CACHE_MAX_AGE = Number(process.env.PDF_CACHE_TTL || 21_600);

const streamFile = (filePath: string, res: Response): Promise<void> =>
  new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });

function getPrintedBy(user: any): string {
  if (user?.fullName) return user.fullName;
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'TechPacker User';
}

function estimatePages(model: Awaited<ReturnType<typeof buildRenderModel>>) {
  const bomPages = model.bom.rows.length ? Math.max(1, Math.ceil(model.bom.rows.length / 14)) : 0;
  const bomImagePages = model.bomImages.length ? Math.ceil(model.bomImages.length / 12) : 0;
  const measurementRows = model.measurements.rows.filter((row) => !row.isGroup).length;
  const measurementPages = measurementRows ? Math.max(1, Math.ceil(measurementRows / 18)) : 0;
  const howToMeasurePages = model.howToMeasure.length ? Math.ceil(model.howToMeasure.length / 2) : 0;
  const notesPages = model.notes.length ? Math.ceil(model.notes.length / 10) : 0;
  const carePages = model.careSymbols.length ? 1 : 0;
  return 1 + bomPages + bomImagePages + measurementPages + howToMeasurePages + notesPages + carePages;
}

export class PDFController {
  async exportTechPackPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id)
        .populate('technicalDesignerId', 'firstName lastName email role')
        .lean();

      if (!techpack) {
        res.status(404).json({ success: false, message: 'TechPack not found' });
        return;
      }

      if (!hasViewAccess(techpack, user)) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      // Use multi-section service for full PDF with landscape measurement table
      const metadata = await pdfMultiSectionService.getOrCreatePdf({
        techpack,
        printedBy: getPrintedBy(user),
      });

      const filename = `Techpack_${techpack.articleCode || techpack._id}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', metadata.size);
      res.setHeader('Cache-Control', `private, max-age=${Math.min(CACHE_MAX_AGE, 3600)}`);

      await streamFile(metadata.path, res);

      await logActivity({
        userId: user._id,
        userName: getPrintedBy(user),
        action: ActivityAction.PDF_EXPORT,
        target: {
          type: 'TechPack',
          id: techpack._id as Types.ObjectId,
          name: techpack.productName,
        },
        details: {
          pages: metadata.pages,
          size: metadata.size,
          cached: metadata.cached,
        },
        req,
      });
    } catch (error: any) {
      console.error('PDF export error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to generate TechPack PDF',
          error: error?.message || 'Unknown error',
        });
      }
    }
  }

  async generatePDFPreview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id)
        .populate('technicalDesignerId', 'firstName lastName email role')
        .lean();

      if (!techpack) {
        res.status(404).json({ success: false, message: 'TechPack not found' });
        return;
      }

      if (!hasViewAccess(techpack, user)) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      const preview = await pdfService.generatePreview({
        techpack,
        printedBy: getPrintedBy(user),
      });

      res.json({
        success: true,
        data: {
          previewUrl: preview,
        },
      });
    } catch (error: any) {
      console.error('PDF preview error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate preview',
        error: error?.message || 'Unknown error',
      });
    }
  }

  async getPDFInfo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;

      const techpack = await TechPack.findById(id)
        .populate('technicalDesignerId', 'firstName lastName email role')
        .lean();

      if (!techpack) {
        res.status(404).json({ success: false, message: 'TechPack not found' });
        return;
      }

      if (!hasViewAccess(techpack, user)) {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
      }

      const validation = await pdfService.validate(techpack);
      const renderModel = await buildRenderModel(techpack, {
        printedBy: getPrintedBy(user),
        generatedAt: new Date(),
      });

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
          estimatedPages: estimatePages(renderModel),
          lastModified: techpack.updatedAt,
          canGeneratePDF: validation.isValid,
          summary: renderModel.summary,
        },
      });
    } catch (error: any) {
      console.error('PDF info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get PDF info',
        error: error?.message || 'Unknown error',
      });
    }
  }
}

export default new PDFController();
