import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { PDFErrorCode } from '@/types/techpack.types';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error: ValidationError) => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: {
        code: PDFErrorCode.VALIDATION_ERROR,
        message: 'Request validation failed',
        details: formattedErrors
      }
    });
    return;
  }
  
  next();
};

/**
 * Middleware to validate file uploads
 */
export const validateFileUpload = (
  req: MulterRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file && req.route.path.includes('upload')) {
    res.status(400).json({
      success: false,
      message: 'File upload required',
      error: {
        code: PDFErrorCode.VALIDATION_ERROR,
        message: 'No file was uploaded'
      }
    });
    return;
  }

  if (req.file) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        message: 'Invalid file type',
        error: {
          code: PDFErrorCode.VALIDATION_ERROR,
          message: 'Only JPEG, PNG, and SVG files are allowed'
        }
      });
      return;
    }

    if (req.file.size > maxSize) {
      res.status(400).json({
        success: false,
        message: 'File too large',
        error: {
          code: PDFErrorCode.VALIDATION_ERROR,
          message: 'File size must be less than 5MB'
        }
      });
      return;
    }
  }

  next();
};

/**
 * Middleware to validate TechPack data structure
 */
export const validateTechPackData = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { techpack, materials, measurements } = req.body;

  const errors: string[] = [];

  // Validate techpack basic info
  if (!techpack) {
    errors.push('TechPack information is required');
  } else {
    if (!techpack.name) errors.push('TechPack name is required');
    if (!techpack.articleCode) errors.push('Article code is required');
    if (!(techpack as any).sampleType && !(techpack as any).version) errors.push('Sample type is required');
    if (!techpack.technicalDesignerId) errors.push('Technical designer is required');
    if (!techpack.supplier) errors.push('Supplier is required');
  }

  // Validate materials
  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    errors.push('At least one material is required');
  } else {
    materials.forEach((material, index) => {
      if (!material.materialName) {
        errors.push(`Material ${index + 1}: Material name is required`);
      }
      if (!material.quantity || material.quantity <= 0) {
        errors.push(`Material ${index + 1}: Valid quantity is required`);
      }
      if (!material.uom) {
        errors.push(`Material ${index + 1}: Unit of measure is required`);
      }
    });
  }

  // Validate measurements
  if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
    errors.push('At least one measurement is required');
  } else {
    measurements.forEach((measurement, index) => {
      if (!measurement.pomCode) {
        errors.push(`Measurement ${index + 1}: POM code is required`);
      }
      if (!measurement.pomName) {
        errors.push(`Measurement ${index + 1}: POM name is required`);
      }
      if (!measurement.sizes || Object.keys(measurement.sizes).length === 0) {
        errors.push(`Measurement ${index + 1}: At least one size measurement is required`);
      }
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'TechPack data validation failed',
      error: {
        code: PDFErrorCode.VALIDATION_ERROR,
        message: 'Invalid TechPack data structure',
        details: errors
      }
    });
    return;
  }

  next();
};

export default {
  handleValidationErrors,
  validateFileUpload,
  validateTechPackData
};
