// =====================================================
// Tech Pack Management System - TypeScript Interfaces
// =====================================================

export interface ArticleInfo {
  id?: string;
  articleCode: string;
  productName: string;
  version: number;
  gender: 'Men' | 'Women' | 'Unisex' | 'Kids';
  productClass: string;
  fitType: 'Regular' | 'Slim' | 'Loose' | 'Relaxed' | 'Oversized';
  supplier: string;
  technicalDesigner: string;
  fabricDescription: string;
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter' | 'SS25' | 'FW25' | 'SS26' | 'FW26';
  lifecycleStage: 'Concept' | 'Design' | 'Development' | 'Pre-production' | 'Production' | 'Shipped';
  createdDate: string;
  lastModified: string;
  brand?: string;
  collection?: string;
  targetMarket?: string;
  pricePoint?: 'Value' | 'Mid-range' | 'Premium' | 'Luxury';
  notes?: string;
}

export interface BomItem {
  id: string;
  part: string;
  materialName: string;
  placement: string;
  size: string;
  quantity: number;
  uom: 'm' | 'cm' | 'mm' | 'pcs' | 'kg' | 'g' | 'yards' | 'inches';
  supplier: string;
  comments?: string;
  imageUrl?: string;
  materialComposition?: string;
  colorCode?: string;
  supplierCode?: string;
  weight?: string;
  width?: string;
  shrinkage?: string;
  careInstructions?: string;
  testingRequirements?: string;
}

export interface MeasurementPoint {
  id: string;
  pomCode: string;
  pomName: string;
  minusTolerance: string;
  plusTolerance: string;
  sizes: Record<string, number>; // XS, S, M, L, XL, XXL, etc.
  notes?: string;
  measurementMethod?: string;
  isActive: boolean;
}

export interface HowToMeasure {
  id: string;
  pomCode: string;
  description: string;
  imageUrl?: string;
  steps?: string[];
  videoUrl?: string;
  language: 'en-US' | 'vi-VN' | 'zh-CN' | 'es-ES';
}

export interface ColorwayPart {
  id: string;
  partName: string;
  colorName: string;
  pantoneCode?: string;
  hexCode?: string;
  rgbCode?: string;
  imageUrl?: string;
  supplier?: string;
  colorType: 'Solid' | 'Print' | 'Embroidery' | 'Applique';
}

export interface Colorway {
  id: string;
  colorwayName: string;
  colorwayCode: string;
  season?: string;
  isDefault: boolean;
  parts: ColorwayPart[];
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  productionStatus: 'Lab Dip' | 'Bulk Fabric' | 'Finished';
}

export interface RevisionEntry {
  id: string;
  version: number;
  changeType: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'DELETE';
  changedFields: Array<{
    field: string;
    previousValue: any;
    newValue: any;
  }>;
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  description?: string;
  approvalRequired: boolean;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
}

// Backend API TechPack type (matches database response)
export interface ApiTechPack {
  _id: string;
  name: string;
  articleCode: string;
  version: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  ownerId: string;
  isDeleted: boolean;
  metadata?: {
    description?: string;
    category?: string;
    season?: string;
  };
  revisions: any[];
  materials: any[];
  measurements: any[];
  colorways: any[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Frontend TechPack type (for form state)
export interface TechPack {
  id: string;
  articleInfo: ArticleInfo;
  bom: BomItem[];
  measurements: MeasurementPoint[];
  howToMeasures: HowToMeasure[];
  colorways: Colorway[];
  revisionHistory: RevisionEntry[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
  completeness: {
    isComplete: boolean;
    missingItems: string[];
    completionPercentage: number;
  };
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

// Form state interfaces
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface TabState {
  isValid: boolean;
  isDirty: boolean;
  errors: FormErrors;
}

export interface TechPackFormState {
  techpack: TechPack;
  currentTab: number;
  tabStates: Record<string, TabState>;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved?: string;
  hasUnsavedChanges: boolean;
}

// Safe destructuring helper types
export type SafeTechPackContext = {
  techPacks: ApiTechPack[];
  loading: boolean;
  pagination: Omit<TechPackListResponse, 'data'>;
  state: TechPackFormState;
  loadTechPacks: (params?: { page?: number; limit?: number; q?: string; status?: string }) => Promise<void>;
  createTechPack: (data: CreateTechPackInput) => Promise<ApiTechPack | undefined>;
  updateTechPack: (id: string, data: Partial<ApiTechPack>) => Promise<ApiTechPack | undefined>;
  deleteTechPack: (id: string) => Promise<void>;
  getTechPack: (id: string) => Promise<ApiTechPack | undefined>;
  setCurrentTab: (tab: number) => void;
  saveTechPack: () => Promise<void>;
  exportToPDF: () => void;
  addMeasurement: (measurement: MeasurementPoint) => void;
  updateMeasurement: (index: number, measurement: MeasurementPoint) => void;
  deleteMeasurement: (index: number) => void;
  addHowToMeasure: (howToMeasure: HowToMeasure) => void;
  updateHowToMeasure: (index: number, howToMeasure: HowToMeasure) => void;
  deleteHowToMeasure: (index: number) => void;
  addBomItem: (bomItem: BomItem) => void;
  updateBomItem: (index: number, bomItem: BomItem) => void;
  deleteBomItem: (index: number) => void;
  addColorway: (colorway: Colorway) => void;
  updateColorway: (index: number, colorway: Colorway) => void;
  deleteColorway: (index: number) => void;
};

// API Response Types
export interface CreateTechPackInput {
  articleInfo: Partial<ArticleInfo>;
  bom?: BomItem[];
  measurements?: MeasurementPoint[];
  colorways?: Colorway[];
  howToMeasures?: HowToMeasure[];
  status?: TechPack['status'];
}

export interface TechPackListResponse {
  data: ApiTechPack[];
  total: number;
  page: number;
  totalPages: number;
}

// UI Component Props
export interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number' | 'email' | 'tel' | 'url';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  maxLength?: number;
  min?: number;
  max?: number;
}

export interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }> | string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  rows?: number;
  maxLength?: number;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  width?: string;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  editable?: boolean;
  type?: 'text' | 'number' | 'select' | 'color' | 'image';
  options?: string[];
}

export interface DataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  onAdd?: () => void;
  onEdit?: (item: T, index: number) => void;
  onDelete?: (item: T, index: number) => void;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  className?: string;
  maxHeight?: string;
  showActions?: boolean;
  addButtonText?: string;
  emptyMessage?: string;
}

// Validation schemas
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | undefined;
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

// Constants
export const PRODUCT_CLASSES = [
  'Shirts',
  'Blouses', 
  'T-Shirts',
  'Polo Shirts',
  'Pants',
  'Jeans',
  'Shorts',
  'Skirts',
  'Dresses',
  'Jackets',
  'Coats',
  'Sweaters',
  'Hoodies',
  'Underwear',
  'Swimwear',
  'Activewear',
  'Sleepwear',
  'Accessories'
] as const;

export const SIZE_RANGES = {
  'Men': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
  'Women': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'Kids': ['2T', '3T', '4T', '5T', '6', '7', '8', '10', '12', '14', '16'],
  'Unisex': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
} as const;

export const UNITS_OF_MEASURE = [
  { value: 'm', label: 'Meters' },
  { value: 'cm', label: 'Centimeters' },
  { value: 'mm', label: 'Millimeters' },
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'g', label: 'Grams' },
  { value: 'yards', label: 'Yards' },
  { value: 'inches', label: 'Inches' }
] as const;

export const COMMON_MATERIALS = [
  'Main Fabric',
  'Lining',
  'Interfacing',
  'Thread',
  'Button',
  'Zipper',
  'Label - Main',
  'Label - Care',
  'Label - Size',
  'Elastic',
  'Velcro',
  'Snap Button',
  'Rivet',
  'Eyelet',
  'Drawstring',
  'Binding Tape',
  'Piping',
  'Trim',
  'Embroidery',
  'Print'
] as const;

export const COMMON_PLACEMENTS = [
  'Front Body',
  'Back Body',
  'Left Sleeve',
  'Right Sleeve',
  'Collar',
  'Cuff',
  'Pocket',
  'Waistband',
  'Hem',
  'Side Seam',
  'Shoulder',
  'Armhole',
  'Neckline',
  'Center Front',
  'Center Back',
  'All Over'
] as const;
