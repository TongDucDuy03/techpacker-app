// TypeScript interfaces for TechPack PDF Generator

export interface TechPackData {
  techpack: ArticleInfo;
  materials: Material[];
  measurements: Measurement[];
  howToMeasure: HowToMeasureItem[];
  colorways: Colorway[];
  logoUrl?: string;
  watermark?: WatermarkConfig;
}

export interface ArticleInfo {
  _id?: string;
  name: string;
  articleCode: string;
  version: string;
  designer: string;
  supplier: string;
  season: string;
  fabricDescription: string;
  lifecycleStage: string;
  createdAt: string;
  lastModified: string;
  category?: string;
  gender?: 'Men' | 'Women' | 'Unisex' | 'Kids';
  brand?: string;
  collection?: string;
  retailPrice?: number;
  currency?: string;
  description?: string;
  notes?: string;
}

export interface Material {
  _id?: string;
  part: string;
  materialName: string;
  placement: string;
  size: string;
  quantity: number;
  uom: string; // Unit of Measure
  supplier: string;
  materialCode?: string;
  color?: string;
  pantoneCode?: string;
  comments?: string;
  unitPrice?: number;
  totalPrice?: number;
  leadTime?: number;
  minimumOrder?: number;
  approved?: boolean;
  approvedBy?: string;
  approvedDate?: string;
}

export interface Measurement {
  _id?: string;
  pomCode: string;
  pomName: string;
  toleranceMinus: number;
  tolerancePlus: number;
  sizes: {
    XS?: number;
    S?: number;
    M?: number;
    L?: number;
    XL?: number;
    XXL?: number;
    XXXL?: number;
    [key: string]: number | undefined;
  };
  notes?: string;
  critical?: boolean;
  measurementType?: 'Body' | 'Garment' | 'Finished';
  category?: string;
}

export interface HowToMeasureItem {
  _id?: string;
  pomCode: string;
  pomName: string;
  description: string;
  imageUrl: string;
  stepNumber: number;
  instructions: string[];
  tips?: string[];
  commonMistakes?: string[];
  relatedMeasurements?: string[];
}

export interface ColorwayPart {
  _id?: string;
  bomItemId?: string;
  partName: string;
  colorName: string;
  pantoneCode?: string;
  hexCode?: string;
  rgbCode?: string;
  imageUrl?: string;
  supplier?: string;
  colorType?: 'Solid' | 'Print' | 'Embroidery' | 'Applique';
}

export interface Colorway {
  _id?: string;
  name: string;
  code: string;
  pantoneCode?: string;
  hexColor?: string;
  rgbColor?: {
    r: number;
    g: number;
    b: number;
  };
  cmykColor?: {
    c: number;
    m: number;
    y: number;
    k: number;
  };
  placement: string;
  materialType: string;
  supplier?: string;
  approved?: boolean;
  isDefault?: boolean;
  season?: string;
  collection?: string;
  notes?: string;
  parts?: ColorwayPart[];
}

export interface WatermarkConfig {
  text: string;
  opacity: number;
  rotation: number;
  fontSize: number;
  color: string;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface PDFGenerationOptions {
  format: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margin: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  printBackground: boolean;
  displayHeaderFooter: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
  scale: number;
  preferCSSPageSize: boolean;
  generateTaggedPDF: boolean;
  watermark?: WatermarkConfig;
  includeImages: boolean;
  imageQuality: number;
  compressImages: boolean;
}

export interface PDFResponse {
  success: boolean;
  message: string;
  data?: {
    buffer?: Buffer;
    base64?: string;
    filename: string;
    size: number;
    pages: number;
    generatedAt: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PDFPreviewResponse {
  success: boolean;
  message: string;
  data?: {
    base64: string;
    filename: string;
    previewUrl: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Template data structure for EJS rendering
export interface TemplateData extends TechPackData {
  generatedAt: string;
  pageTitle: string;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  customCSS?: string;
  showWatermark: boolean;
  pageBreaks: {
    afterHeader: boolean;
    afterBOM: boolean;
    afterMeasurements: boolean;
    afterHowToMeasure: boolean;
  };
}

// Validation schemas
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Size configuration for measurements
export interface SizeConfig {
  sizes: string[];
  defaultSizes: string[];
  customSizes?: string[];
  sizeChart?: {
    [sizeName: string]: {
      chest?: number;
      waist?: number;
      hip?: number;
      length?: number;
    };
  };
}

// Export configuration
export interface ExportConfig {
  includeImages: boolean;
  imageResolution: 'low' | 'medium' | 'high';
  compressImages: boolean;
  includeColorways: boolean;
  includeRevisionHistory: boolean;
  language: 'en' | 'vi' | 'zh' | 'es' | 'fr';
  currency: string;
  units: 'metric' | 'imperial';
}

// API Request/Response types
export interface GeneratePDFRequest {
  techpackId: string;
  options?: Partial<PDFGenerationOptions>;
  exportConfig?: Partial<ExportConfig>;
}

export interface PreviewPDFRequest {
  techpackId: string;
  page?: number;
  options?: Partial<PDFGenerationOptions>;
}

// Error types
export enum PDFErrorCode {
  TECHPACK_NOT_FOUND = 'TECHPACK_NOT_FOUND',
  INVALID_DATA = 'INVALID_DATA',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  PUPPETEER_ERROR = 'PUPPETEER_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR'
}

export class PDFGenerationError extends Error {
  constructor(
    public code: PDFErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PDFGenerationError';
  }
}

// Utility types
export type SizeKey = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
export type MeasurementUnit = 'cm' | 'inch' | 'mm';
export type MaterialUOM = 'pcs' | 'yards' | 'meters' | 'kg' | 'lbs' | 'sets';
export type LifecycleStage = 'Concept' | 'Development' | 'Sampling' | 'Production' | 'Discontinued';
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Revision Required';

// Database model interfaces (if using MongoDB/Mongoose)
export interface TechPackDocument extends ArticleInfo {
  materials: Material[];
  measurements: Measurement[];
  howToMeasure: HowToMeasureItem[];
  colorways: Colorway[];
  revisionHistory?: RevisionEntry[];
  createdBy: string;
  updatedBy: string;
  status: ApprovalStatus;
  tags?: string[];
}

export interface RevisionEntry {
  version: string;
  changes: string[];
  changedBy: string;
  changedAt: string;
  reason: string;
  approvedBy?: string;
  approvedAt?: string;
}
