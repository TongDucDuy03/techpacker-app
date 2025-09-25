export interface TechPack {
  id: string;
  name: string;
  category: string;
  status: 'draft' | 'review' | 'approved' | 'production';
  dateCreated: Date;
  lastModified: Date;
  season: string;
  brand: string;
  designer: string;
  images: string[];
  materials: Material[];
  measurements: Measurement[];
  constructionDetails: string[];
  colorways: Colorway[];
}

export interface Material {
  id: string;
  name: string;
  composition: string;
  supplier: string;
  color: string;
  consumption: string;
  // Advanced BOM fields
  specifications?: string;
  position?: string;
  quantity?: number;
  unit?: string;
  technicalNotes?: string;
  subMaterials?: Array<{
    id: string;
    specifications: string;
    quantity?: number;
    unit?: string;
  }>;
}

export interface Measurement {
  id: string;
  point: string;
  tolerance: string;
  sizes: { [key: string]: string };
}

export interface Colorway {
  id: string;
  name: string;
  colors: { part: string; color: string; pantone?: string }[];
}

export interface Activity {
  id: string;
  action: string;
  item: string;
  time: string;
  user: string;
}

export interface RevisionComment {
  id: string;
  user: string;
  message: string;
  createdAt: string;
}

export interface TechPackRevision {
  id: string;
  techpackId: string;
  version: number;
  createdAt: string;
  user: string;
  status: 'pending' | 'approved' | 'rejected';
  changes: any; // minimal diff payload
  comments: RevisionComment[];
}

export type PartClassification = 'Fabric' | 'Trims' | 'Labels' | 'Packaging';
export type Placement = 'Collar' | 'Placket' | 'Pocket' | 'Sleeve' | 'Body' | 'Cuff' | 'Hem' | 'Seam' | 'Buttonhole' | 'Zipper' | 'Other';
export type UOM = 'Yards' | 'Meters' | 'Pieces' | 'Dozen' | 'Rolls' | 'Sheets' | 'Feet' | 'Inches' | 'Grams' | 'Kilograms';

export interface BOMItem {
  id: string;
  part: PartClassification;
  materialCode: string;
  placement: Placement;
  sizeSpec: string;
  quantity: number;
  uom: UOM;
  supplier: string;
  comments: string[];
  images?: string[];
  color?: string;
  weight?: number;
  cost?: number;
  leadTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  specialties: PartClassification[];
  rating: number;
}

export interface BOMTemplate {
  id: string;
  name: string;
  category: string;
  items: BOMItem[];
  createdAt: Date;
  updatedAt: Date;
}

// Point of Measurement (POM) System Types
export type SizeRange = 'XXS-XLT' | '2XL-8XLT' | 'Regular/Tall';
export type SizeVariation = 'Regular' | 'Tall' | 'Short';
export type MeasurementStatus = 'Required' | 'Not Required' | 'Optional';

export interface POMCode {
  code: string;
  name: string;
  description: string;
  category: 'Body' | 'Sleeve' | 'Collar' | 'Pocket' | 'Other';
  unit: 'inches' | 'cm';
  howToMeasure: string;
  imageUrl?: string;
}

export interface Tolerance {
  minusTol: number;
  plusTol: number;
  unit: 'inches' | 'cm';
}

export interface POMSpecification {
  id: string;
  pomCode: string;
  pomName: string;
  tolerances: Tolerance;
  measurements: Record<string, number | 'NR'>; // size -> measurement value
  howToMeasure: string;
  category: string;
  unit: 'inches' | 'cm';
  gradeRules?: GradeRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeRule {
  id: string;
  fromSize: string;
  toSize: string;
  increment: number;
  direction: 'up' | 'down';
}

export interface SizeChart {
  id: string;
  name: string;
  sizeRange: SizeRange;
  sizes: string[];
  variations: SizeVariation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeasurementComparison {
  id: string;
  pomCode: string;
  currentValue: number;
  targetValue: number;
  tolerance: Tolerance;
  status: 'Pass' | 'Fail' | 'Warning';
  deviation: number;
}

// Size Grading & Fit Management System Types
export type FitType = 'Regular' | 'Tall' | 'Big & Tall' | 'Petite' | 'Plus';
export type SizeRegion = 'US' | 'EU' | 'UK' | 'JP' | 'AU';
export type GradingCurve = 'Linear' | 'Exponential' | 'Custom';

export interface SizeConversion {
  region: SizeRegion;
  sizes: Record<string, string>; // US size -> Regional size
}

export interface GradingIncrement {
  measurement: string; // POM code
  increment: number;
  curve: GradingCurve;
  customCurve?: number[]; // For custom curves
}

export interface GradingRule {
  id: string;
  name: string;
  baseSize: string;
  sizeRanges: string[];
  fitType: FitType;
  increments: GradingIncrement[];
  region: SizeRegion;
  createdAt: Date;
  updatedAt: Date;
}

export interface SizeSet {
  id: string;
  name: string;
  region: SizeRegion;
  fitType: FitType;
  sizes: string[];
  measurements: Record<string, Record<string, number | 'NR'>>; // size -> pomCode -> value
  gradingRules: GradingRule[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GradingTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  fitType: FitType;
  region: SizeRegion;
  gradingRules: GradingRule[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FitAnalysis {
  id: string;
  sizeSetId: string;
  measurements: Record<string, number>;
  fitScore: number;
  recommendations: string[];
  issues: string[];
  createdAt: Date;
}

export interface SizeAvailability {
  styleId: string;
  sizeSetId: string;
  availableSizes: string[];
  unavailableSizes: string[];
  notes: Record<string, string>; // size -> note
}

// Refit Management & Version Control System Types
export type VersionStatus = 'Draft' | 'Review' | 'Approved' | 'Active' | 'Rejected' | 'Archived';
export type ChangeType = 'Measurement' | 'Material' | 'Construction' | 'Color' | 'Size' | 'Other';
export type ApprovalLevel = 'Designer' | 'Technical' | 'Production' | 'Quality' | 'Final';
export type RefitReason = 'Fit Issue' | 'Measurement Error' | 'Material Change' | 'Construction Update' | 'Customer Request' | 'Quality Issue' | 'Other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string;
}

export interface Change {
  id: string;
  field: string;
  oldValue: any;
  newValue: any;
  changeType: ChangeType;
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
}

export interface Approval {
  id: string;
  level: ApprovalLevel;
  userId: string;
  userName: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  comments?: string;
  timestamp: Date;
  required: boolean;
}

export interface TechPackVersion {
  id: string;
  techPackId: string;
  version: string;
  status: VersionStatus;
  changes: Change[];
  approvals: Approval[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  parentVersionId?: string;
  isActive: boolean;
  refitRequestId?: string;
}

export interface RefitRequest {
  id: string;
  techPackId: string;
  versionId: string;
  reason: RefitReason;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  requestedBy: string;
  requestedAt: Date;
  status: 'Open' | 'In Progress' | 'Completed' | 'Cancelled';
  beforeMeasurements: Record<string, any>;
  afterMeasurements: Record<string, any>;
  impactAnalysis: string;
  implementationNotes: string;
  completedAt?: Date;
  completedBy?: string;
}

export interface VersionComparison {
  id: string;
  version1Id: string;
  version2Id: string;
  differences: Change[];
  summary: {
    totalChanges: number;
    measurementChanges: number;
    materialChanges: number;
    constructionChanges: number;
    otherChanges: number;
  };
  createdAt: Date;
  createdBy: string;
}

export interface ConflictResolution {
  id: string;
  techPackId: string;
  conflictType: 'Simultaneous Edit' | 'Version Mismatch' | 'Approval Conflict';
  conflictingUsers: string[];
  resolution: 'Manual' | 'Auto-Merge' | 'User Choice';
  resolvedBy: string;
  resolvedAt: Date;
  notes: string;
}

export interface AuditTrail {
  id: string;
  techPackId: string;
  versionId?: string;
  action: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Construction Details & Technical Drawings System Types
export type ConstructionCategory = 'Seams' | 'Pockets' | 'Collar' | 'Sleeves' | 'Closures' | 'Hems' | 'Pleats' | 'Darts' | 'Other';
export type SeamType = 'Flat Fell' | 'French Seam' | 'Overlock' | 'Straight Stitch' | 'Zigzag' | 'Blind Stitch' | 'Topstitch' | 'Basting';
export type PocketType = 'Welt' | 'Patch' | 'Zippered' | 'Side' | 'Chest' | 'Kangaroo' | 'Hidden' | 'Flap';
export type CollarType = 'Spread' | 'Button-Down' | 'Band' | 'Stand' | 'Shawl' | 'Notched' | 'Peak' | 'Mandarin';
export type ClosureType = 'Buttonholes' | 'Zippers' | 'Snaps' | 'Hooks' | 'Velcro' | 'Toggles' | 'Drawstrings' | 'Elastic';

export interface ThreadSpecification {
  id: string;
  color: string;
  weight: string;
  type: string; // Polyester, Cotton, Nylon, etc.
  brand?: string;
  code?: string;
}

export interface SeamSpecification {
  id: string;
  seamType: SeamType;
  spi: number; // Stitches Per Inch
  threadSpec: ThreadSpecification;
  needleSize: string;
  presserFoot: string;
  tension: string;
  specialInstructions?: string;
}

export interface ConstructionDetail {
  id: string;
  category: ConstructionCategory;
  name: string;
  description: string;
  specifications: SeamSpecification[];
  sequence: number;
  qualityCheckpoints: string[];
  specialInstructions: string[];
  materials: string[];
  tools: string[];
  estimatedTime: number; // in minutes
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert';
  diagram?: string; // SVG or image URL
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
}

export interface DrawingElement {
  id: string;
  type: 'line' | 'circle' | 'rectangle' | 'text' | 'symbol' | 'arrow' | 'dimension';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  symbolType?: string;
  layer: string;
  visible: boolean;
  locked: boolean;
}

export interface DrawingLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  color: string;
  elements: DrawingElement[];
}

export interface TechnicalDrawing {
  id: string;
  name: string;
  description: string;
  category: ConstructionCategory;
  layers: DrawingLayer[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  grid: {
    enabled: boolean;
    size: number;
    color: string;
  };
  units: 'inches' | 'cm' | 'mm';
  scale: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ConstructionSymbol {
  id: string;
  name: string;
  category: ConstructionCategory;
  svg: string;
  description: string;
  tags: string[];
  isDefault: boolean;
}

export interface DrawingTemplate {
  id: string;
  name: string;
  category: ConstructionCategory;
  description: string;
  layers: DrawingLayer[];
  symbols: ConstructionSymbol[];
  isDefault: boolean;
  createdAt: Date;
  createdBy: string;
}

export interface Annotation {
  id: string;
  type: 'measurement' | 'callout' | 'note' | 'dimension';
  x: number;
  y: number;
  text: string;
  arrow?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
  style: {
    fontSize: number;
    color: string;
    backgroundColor?: string;
    borderColor?: string;
  };
  layer: string;
}

export interface ConstructionLibrary {
  id: string;
  name: string;
  description: string;
  category: ConstructionCategory;
  details: ConstructionDetail[];
  templates: DrawingTemplate[];
  symbols: ConstructionSymbol[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WorkInstruction {
  id: string;
  constructionDetailId: string;
  sequence: number;
  instruction: string;
  image?: string;
  estimatedTime: number;
  tools: string[];
  materials: string[];
  qualityCheckpoint: boolean;
  specialNotes?: string;
}

export interface ConstructionChecklist {
  id: string;
  name: string;
  category: ConstructionCategory;
  items: {
    id: string;
    description: string;
    required: boolean;
    checked: boolean;
    notes?: string;
  }[];
  createdAt: Date;
  createdBy: string;
}

// Care Instructions & Compliance Management System Types
export type CareSymbolType = 'wash' | 'dry' | 'iron' | 'bleach' | 'dryclean' | 'warning' | 'temperature' | 'special';
export type CareSymbolStandard = 'ISO' | 'ASTM' | 'GINETEX' | 'JIS' | 'AS' | 'Custom';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar';
export type ComplianceRegion = 'US' | 'EU' | 'UK' | 'CA' | 'AU' | 'JP' | 'CN' | 'Global';
export type FlammabilityClass = 'Class 1' | 'Class 2' | 'Class 3' | 'Not Applicable';
export type ChemicalRestriction = 'AZO' | 'Formaldehyde' | 'Lead' | 'Phthalates' | 'PFAS' | 'Other';

export interface CareSymbol {
  id: string;
  name: string;
  type: CareSymbolType;
  standard: CareSymbolStandard;
  svg: string;
  description: string;
  temperature?: {
    min?: number;
    max?: number;
    unit: 'C' | 'F';
  };
  warnings?: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CareInstruction {
  id: string;
  language: Language;
  symbols: CareSymbol[];
  textInstructions: string[];
  specialInstructions?: string[];
  warnings?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FiberContent {
  id: string;
  fiberType: string;
  percentage: number;
  genericName?: string;
  tradeName?: string;
}

export interface ComplianceInfo {
  id: string;
  fiberContent: FiberContent[];
  countryOfOrigin: string;
  flammabilityClass?: FlammabilityClass;
  chemicalRestrictions: ChemicalRestriction[];
  testingRequirements: string[];
  certifications: string[];
  lastUpdated: Date;
  validUntil?: Date;
}

export interface CareLabel {
  id: string;
  name: string;
  instructions: CareInstruction[];
  compliance: ComplianceInfo;
  layout: {
    width: number;
    height: number;
    symbolSize: number;
    fontSize: number;
    spacing: number;
  };
  printSpecs: {
    resolution: number;
    format: 'PDF' | 'SVG' | 'PNG';
    colorMode: 'CMYK' | 'RGB';
  };
  placement: {
    location: string;
    attachment: 'Sewn' | 'Ironed' | 'Adhesive';
    size: string;
  };
  costPerLabel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Regulation {
  id: string;
  name: string;
  region: ComplianceRegion;
  category: 'Care' | 'Safety' | 'Labeling' | 'Chemical' | 'Testing';
  description: string;
  requirements: string[];
  effectiveDate: Date;
  expiryDate?: Date;
  lastUpdated: Date;
  source: string;
  url?: string;
}

export interface ComplianceCheck {
  id: string;
  regulationId: string;
  regulationName: string;
  status: 'Pass' | 'Fail' | 'Warning' | 'Not Applicable';
  details: string;
  recommendations?: string[];
  checkedAt: Date;
  checkedBy: string;
}

export interface CareTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultSymbols: CareSymbol[];
  defaultInstructions: Record<Language, string[]>;
  complianceRequirements: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface LabelDesign {
  id: string;
  name: string;
  elements: {
    id: string;
    type: 'symbol' | 'text' | 'logo' | 'barcode';
    x: number;
    y: number;
    width: number;
    height: number;
    content: string | CareSymbol;
    style?: {
      fontSize?: number;
      color?: string;
      alignment?: 'left' | 'center' | 'right';
    };
  }[];
  canvas: {
    width: number;
    height: number;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Translation {
  id: string;
  sourceLanguage: Language;
  targetLanguage: Language;
  sourceText: string;
  translatedText: string;
  confidence: number;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface CareValidation {
  id: string;
  careLabelId: string;
  checks: {
    symbolConsistency: ComplianceCheck;
    instructionCompleteness: ComplianceCheck;
    complianceRequirements: ComplianceCheck[];
    regionalCompliance: ComplianceCheck[];
  };
  overallStatus: 'Pass' | 'Fail' | 'Warning';
  recommendations: string[];
  validatedAt: Date;
  validatedBy: string;
}

// Professional Export & PDF Generation System Types
export type ExportTemplateType = 'full-techpack' | 'summary-techpack' | 'bom-only' | 'measurements-only' | 'construction-only' | 'care-instructions' | 'custom';
export type ExportFormat = 'PDF' | 'DOCX' | 'XLSX' | 'HTML' | 'JSON';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type PageOrientation = 'portrait' | 'landscape';
export type DocumentSecurity = 'public' | 'confidential' | 'restricted' | 'internal';

export interface PDFMetadata {
  id: string;
  title: string;
  subject: string;
  author: string;
  creator: string;
  producer: string;
  keywords: string[];
  version: string;
  createdDate: Date;
  modifiedDate: Date;
  securityLevel: DocumentSecurity;
  watermark?: string;
  digitalSignature?: {
    signer: string;
    signedAt: Date;
    certificate: string;
  };
}

export interface PageLayout {
  id: string;
  name: string;
  type: 'cover' | 'content' | 'bom' | 'measurements' | 'construction' | 'care' | 'appendix';
  orientation: PageOrientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  header: {
    enabled: boolean;
    height: number;
    content: string;
    style: TextStyle;
  };
  footer: {
    enabled: boolean;
    height: number;
    content: string;
    style: TextStyle;
    pageNumber: boolean;
  };
  columns: number;
  columnGap: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'lighter' | 'bolder' | number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  color: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textDecoration?: 'none' | 'underline' | 'line-through';
}

export interface ExportTemplate {
  id: string;
  name: string;
  type: ExportTemplateType;
  description: string;
  pages: PageLayout[];
  metadata: PDFMetadata;
  branding: {
    logo?: string;
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ExportJob {
  id: string;
  techPackId: string;
  templateId: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  fileName: string;
  fileSize?: number;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  settings: {
    includeImages: boolean;
    imageQuality: number;
    includeComments: boolean;
    includeRevisions: boolean;
    pageRange?: {
      start: number;
      end: number;
    };
  };
}

export interface ExportQueue {
  id: string;
  jobs: ExportJob[];
  isProcessing: boolean;
  currentJob?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualityCheck {
  id: string;
  jobId: string;
  checks: {
    completeness: {
      status: 'Pass' | 'Fail' | 'Warning';
      details: string;
      missingItems: string[];
    };
    imageResolution: {
      status: 'Pass' | 'Fail' | 'Warning';
      details: string;
      lowResImages: string[];
    };
    textReadability: {
      status: 'Pass' | 'Fail' | 'Warning';
      details: string;
      issues: string[];
    };
    layoutConsistency: {
      status: 'Pass' | 'Fail' | 'Warning';
      details: string;
      inconsistencies: string[];
    };
  };
  overallStatus: 'Pass' | 'Fail' | 'Warning';
  recommendations: string[];
  checkedAt: Date;
  checkedBy: string;
}

export interface ExportSettings {
  id: string;
  defaultTemplate: string;
  defaultFormat: ExportFormat;
  imageSettings: {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'JPEG' | 'PNG' | 'SVG';
  };
  textSettings: {
    defaultFont: string;
    fontSize: number;
    lineHeight: number;
  };
  layoutSettings: {
    defaultOrientation: PageOrientation;
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  securitySettings: {
    defaultSecurity: DocumentSecurity;
    requirePassword: boolean;
    allowPrinting: boolean;
    allowCopying: boolean;
    allowModification: boolean;
  };
  distributionSettings: {
    emailDistribution: string[];
    cloudStorage: {
      enabled: boolean;
      provider: 'Google Drive' | 'Dropbox' | 'OneDrive';
      folderId: string;
    };
  };
}

export interface ExportHistory {
  id: string;
  jobId: string;
  techPackId: string;
  fileName: string;
  fileSize: number;
  format: ExportFormat;
  template: string;
  status: ExportStatus;
  createdAt: Date;
  downloadedAt?: Date;
  downloadCount: number;
  createdBy: string;
}

export interface InteractiveForm {
  id: string;
  name: string;
  fields: {
    id: string;
    type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature';
    label: string;
    required: boolean;
    options?: string[];
    validation?: {
      pattern?: string;
      minLength?: number;
      maxLength?: number;
    };
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }[];
  pageNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PDFNavigation {
  bookmarks: {
    id: string;
    title: string;
    pageNumber: number;
    level: number;
    children?: PDFNavigation['bookmarks'];
  }[];
  hyperlinks: {
    id: string;
    text: string;
    target: string;
    pageNumber: number;
    position: {
      x: number;
      y: number;
    };
  }[];
  tableOfContents: {
    id: string;
    title: string;
    pageNumber: number;
    level: number;
  }[];
}

export interface BatchExportJob {
  id: string;
  name: string;
  techPackIds: string[];
  templateId: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  completedJobs: number;
  totalJobs: number;
  errors: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  settings: ExportJob['settings'];
}