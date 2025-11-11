import { Schema, model, Document, Types } from 'mongoose';

export enum TechPackStatus {
  Draft = 'Draft',
  InReview = 'In Review',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Archived = 'Archived'
}

export interface IBOMItem {
  _id?: Types.ObjectId;
  part: string;
  materialName: string;
  materialCode?: string;
  placement: string;
  size: string;
  quantity: number;
  uom: string;
  supplier: string;
  supplierCode?: string;
  color?: string;
  pantoneCode?: string;
  unitPrice?: number;
  totalPrice?: number;
  leadTime?: number;
  minimumOrder?: number;
  approved?: boolean;
  approvedBy?: string;
  approvedDate?: Date;
  comments?: string;
}

export interface IMeasurement {
  _id?: Types.ObjectId;
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

export interface IColorway {
  _id?: Types.ObjectId;
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
  collectionName?: string;
  notes?: string;
}

export interface IHowToMeasure {
  _id?: Types.ObjectId;
  pomCode: string;
  pomName: string;
  description: string;
  imageUrl?: string;
  stepNumber: number;
  instructions: string[];
  tips?: string[];
  commonMistakes?: string[];
  relatedMeasurements?: string[];
}

export enum TechPackRole {
  Owner = 'owner',
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer',
  Factory = 'factory'
}

export interface ISharedAccess {
  userId: Types.ObjectId;
  role: TechPackRole;
  sharedAt: Date;
  sharedBy: Types.ObjectId;
  // Keep backward compatibility
  permission?: 'view' | 'edit';
}

export interface IAuditLogEntry {
  action: 'share_granted' | 'share_revoked' | 'role_changed';
  performedBy: Types.ObjectId;
  targetUser: Types.ObjectId;
  role: TechPackRole;
  timestamp: Date;
  techpackId: Types.ObjectId;
  // Keep backward compatibility
  permission: 'view' | 'edit';
}

export interface ITechPack extends Document {
  productName: string;
  articleCode: string;
  version: string;
  technicalDesignerId: Types.ObjectId;
  customerId?: string;
  supplier: string;
  season: string;
  fabricDescription: string;
  productDescription: string;
  designSketchUrl?: string;
  status: TechPackStatus;
  lifecycleStage?: 'Concept' | 'Design' | 'Development' | 'Pre-production' | 'Production' | 'Shipped';
  category?: string;
  gender?: 'Men' | 'Women' | 'Unisex' | 'Kids';
  brand?: string;
  collectionName?: string;
  targetMarket?: string;
  pricePoint?: 'Value' | 'Mid-range' | 'Premium' | 'Luxury';
  retailPrice?: number;
  currency?: string;
  description?: string;
  notes?: string;
  bom: IBOMItem[];
  measurements: IMeasurement[];
  colorways: IColorway[];
  howToMeasure: IHowToMeasure[];
  createdBy: Types.ObjectId;
  createdByName: string;
  updatedBy: Types.ObjectId;
  updatedByName: string;
  createdAt: Date;
  updatedAt: Date;
  sharedWith: ISharedAccess[];
  auditLogs: IAuditLogEntry[];
}

const BOMItemSchema = new Schema<IBOMItem>({
  part: { type: String, required: true },
  materialName: { type: String, required: true },
  materialCode: { type: String },
  placement: { type: String, required: true },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  uom: { type: String, required: true },
  supplier: { type: String, required: true },
  supplierCode: { type: String },
  color: { type: String },
  pantoneCode: { type: String },
  unitPrice: { type: Number, min: 0 },
  totalPrice: { type: Number, min: 0 },
  leadTime: { type: Number, min: 0 },
  minimumOrder: { type: Number, min: 0 },
  approved: { type: Boolean, default: false },
  approvedBy: { type: String },
  approvedDate: { type: Date },
  comments: { type: String }
});

const MeasurementSchema = new Schema<IMeasurement>({
  pomCode: { type: String, required: true },
  pomName: { type: String, required: true },
  toleranceMinus: { type: Number, required: true },
  tolerancePlus: { type: Number, required: true },
  sizes: {
    XS: { type: Number },
    S: { type: Number },
    M: { type: Number },
    L: { type: Number },
    XL: { type: Number },
    XXL: { type: Number },
    XXXL: { type: Number }
  },
  notes: { type: String },
  critical: { type: Boolean, default: false },
  measurementType: { type: String, enum: ['Body', 'Garment', 'Finished'] },
  category: { type: String }
});

const ColorwaySchema = new Schema<IColorway>({
  name: { type: String, required: true },
  code: { type: String, required: true },
  pantoneCode: { type: String },
  hexColor: { type: String },
  rgbColor: {
    r: { type: Number, min: 0, max: 255 },
    g: { type: Number, min: 0, max: 255 },
    b: { type: Number, min: 0, max: 255 }
  },
  placement: { type: String, required: true },
  materialType: { type: String, required: true },
  supplier: { type: String },
  approved: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  season: { type: String },
  collectionName: { type: String },
  notes: { type: String }
});

const HowToMeasureSchema = new Schema<IHowToMeasure>({
  pomCode: { type: String, required: true },
  pomName: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String },
  stepNumber: { type: Number, required: true },
  instructions: [{ type: String }],
  tips: [{ type: String }],
  commonMistakes: [{ type: String }],
  relatedMeasurements: [{ type: String }]
});

const SharedAccessSchema = new Schema<ISharedAccess>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: Object.values(TechPackRole), required: true },
  sharedAt: { type: Date, default: Date.now },
  sharedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Keep backward compatibility
  permission: { type: String, enum: ['view', 'edit'] }
});

const AuditLogEntrySchema = new Schema<IAuditLogEntry>({
  action: { type: String, enum: ['share_granted', 'share_revoked', 'role_changed'], required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  targetUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: Object.values(TechPackRole), required: true },
  timestamp: { type: Date, default: Date.now },
  techpackId: { type: Schema.Types.ObjectId, ref: 'TechPack', required: true },
  // Keep backward compatibility
  permission: { type: String, enum: ['view', 'edit'] }
});

const TechPackSchema = new Schema<ITechPack>(
  {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    articleCode: {
      type: String,
      required: [true, 'Article code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    version: {
      type: String,
      default: 'V1'
    },
    technicalDesignerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    customerId: { type: String, trim: true },
    sharedWith: [SharedAccessSchema],
    auditLogs: [AuditLogEntrySchema],
    supplier: {
      type: String,
      required: [true, 'Supplier is required'],
      trim: true
    },
    season: {
      type: String,
      required: [true, 'Season is required'],
      trim: true
    },
    fabricDescription: {
      type: String,
      required: [true, 'Fabric description is required'],
      trim: true
    },
    productDescription: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true
    },
    designSketchUrl: {
      type: String,
      trim: true,
      // Conditionally required based on lifecycle stage
      required: function(this: ITechPack) {
        return ['Concept', 'Design'].includes(this.lifecycleStage || '');
      }
    },
    status: {
      type: String,
      enum: Object.values(TechPackStatus),
      default: TechPackStatus.Draft
    },
    lifecycleStage: { type: String, enum: ['Concept', 'Design', 'Development', 'Pre-production', 'Production', 'Shipped'] },
    category: { type: String, trim: true },
    gender: { type: String, enum: ['Men', 'Women', 'Unisex', 'Kids'] },
    brand: { type: String, trim: true },
    collectionName: { type: String, trim: true },
    targetMarket: { type: String, trim: true },
    pricePoint: { type: String, enum: ['Value', 'Mid-range', 'Premium', 'Luxury'] },
    retailPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'USD' },
    description: { type: String, trim: true },
    notes: { type: String, trim: true },
    bom: [BOMItemSchema],
    measurements: [MeasurementSchema],
    colorways: [ColorwaySchema],
    howToMeasure: [HowToMeasureSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    createdByName: {
      type: String
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedByName: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance - optimized for common query patterns
 // `articleCode` schema path is declared with `unique: true`, which creates an index.
 // Avoid declaring a duplicate index here to prevent Mongoose warnings.
TechPackSchema.index({ technicalDesignerId: 1, createdAt: -1 }); // Designer's techpacks
TechPackSchema.index({ createdBy: 1, createdAt: -1 }); // Owner's techpacks
TechPackSchema.index({ customerId: 1, createdAt: -1 }); // Customer filter
TechPackSchema.index({ 'sharedWith.userId': 1 }); // Shared access lookup
TechPackSchema.index({ status: 1, updatedAt: -1 }); // Status filter with sorting
TechPackSchema.index({ season: 1, brand: 1 }); // Season/brand filter
TechPackSchema.index({ createdAt: -1 }); // General sorting
// Compound index for common list query pattern
TechPackSchema.index({ status: 1, createdAt: -1 });
// Text search index for productName and articleCode
TechPackSchema.index({ productName: 'text', articleCode: 'text' });

// Performance optimization: Compound indexes for complex queries in getTechPacks
// These indexes optimize the $or queries with status filtering
TechPackSchema.index({ createdBy: 1, status: 1, updatedAt: -1 }); // For Admin/Designer queries
TechPackSchema.index({ technicalDesignerId: 1, status: 1, updatedAt: -1 }); // For Designer queries
TechPackSchema.index({ 'sharedWith.userId': 1, status: 1, updatedAt: -1 }); // For shared access queries
// Compound index for the most complex query pattern (createdBy OR sharedWith)
TechPackSchema.index({ 
  createdBy: 1, 
  'sharedWith.userId': 1, 
  status: 1, 
  updatedAt: -1 
}, { name: 'complex_query_optimization' });

// Removed virtual 'lifecycleStage' because it's now a real schema path

const TechPack = model<ITechPack>('TechPack', TechPackSchema);

export default TechPack;
