export interface TechPack {
  _id: string;
  articleCode: string;
  name: string;
  version: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  ownerId: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
  isDeleted: boolean;
  metadata: {
    description?: string;
    category?: string;
    season?: string;
  };
  materials: MaterialSpec[];
  measurements: MeasurementSpec[];
  colorways: ColorwaySpec[];
  revisions: RevisionHistory[];
}

export interface MaterialSpec {
  _id?: string;
  name: string;
  code?: string;
  type: string;
  supplier?: string;
  color?: string;
  pantoneCode?: string;
  composition?: string;
  weight?: number;
  width?: number;
  unitPrice?: number;
  minimumOrder?: number;
  leadTime?: number;
  approved?: boolean;
  notes?: string;
}

export interface MeasurementSpec {
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

export interface ColorwaySpec {
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
  placement: string;
  materialType: string;
  supplier?: string;
  approved?: boolean;
  isDefault?: boolean;
  season?: string;
  collection?: string;
  notes?: string;
}

export interface RevisionHistory {
  _id?: string;
  version: string;
  changedBy: string;
  changedByName: string;
  changeDate: Date;
  changeType: 'created' | 'updated' | 'status_change' | 'approved' | 'rejected';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  notes?: string;
}

export interface TechPackListResponse {
  data: TechPack[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateTechPackInput {
  articleCode: string;
  name: string;
  ownerId: string;
  metadata?: {
    description?: string;
    category?: string;
    season?: string;
  };
  materials?: MaterialSpec[];
  measurements?: MeasurementSpec[];
  colorways?: ColorwaySpec[];
}

export interface BulkOperationPayload {
  ids: string[];
  action: 'delete' | 'approve' | 'setStatus';
  payload?: {
    status?: TechPack['status'];
  };
}

// Constants cho các dropdown và form
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
