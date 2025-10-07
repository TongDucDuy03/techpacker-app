import { Schema, model, Document, Types } from 'mongoose';

export enum TechPackStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface MaterialSpec {
  _id?: Types.ObjectId;
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

export interface ColorwaySpec {
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
  collection?: string;
  notes?: string;
}

export interface RevisionHistory {
  _id?: Types.ObjectId;
  version: string;
  changedBy: Types.ObjectId;
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

export interface ITechPack extends Document {
  _id: Types.ObjectId;
  articleCode: string;
  name: string;
  version: string;
  status: TechPackStatus;
  createdAt: Date;
  updatedAt: Date;
  ownerId: Types.ObjectId;
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

const MaterialSpecSchema = new Schema<MaterialSpec>({
  name: { type: String, required: true },
  code: { type: String },
  type: { type: String, required: true },
  supplier: { type: String },
  color: { type: String },
  pantoneCode: { type: String },
  composition: { type: String },
  weight: { type: Number, min: 0 },
  width: { type: Number, min: 0 },
  unitPrice: { type: Number, min: 0 },
  minimumOrder: { type: Number, min: 0 },
  leadTime: { type: Number, min: 0 },
  approved: { type: Boolean, default: false },
  notes: { type: String }
});

const MeasurementSpecSchema = new Schema<MeasurementSpec>({
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

const ColorwaySpecSchema = new Schema<ColorwaySpec>({
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
  collection: { type: String },
  notes: { type: String }
});

const RevisionHistorySchema = new Schema<RevisionHistory>({
  version: { type: String, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  changedByName: { type: String, required: true },
  changeDate: { type: Date, default: Date.now },
  changeType: {
    type: String,
    enum: ['created', 'updated', 'status_change', 'approved', 'rejected'],
    required: true
  },
  changes: [{
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed }
  }],
  notes: { type: String }
});

const TechPackSchema = new Schema<ITechPack>(
  {
    articleCode: {
      type: String,
      required: [true, 'Article code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    version: {
      type: String,
      default: 'V1'
    },
    status: {
      type: String,
      enum: Object.values(TechPackStatus),
      default: TechPackStatus.DRAFT
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    metadata: {
      description: { type: String, trim: true },
      category: { type: String, trim: true },
      season: { type: String, trim: true }
    },
    materials: [MaterialSpecSchema],
    measurements: [MeasurementSpecSchema],
    colorways: [ColorwaySpecSchema],
    revisions: [RevisionHistorySchema]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance and search
TechPackSchema.index({ articleCode: 1 });
TechPackSchema.index({ ownerId: 1, createdAt: -1 });
TechPackSchema.index({ status: 1, updatedAt: -1 });
TechPackSchema.index({ isDeleted: 1 });
TechPackSchema.index({ createdAt: -1 });

// Text indexes for search functionality
TechPackSchema.index({
  name: 'text',
  articleCode: 'text',
  'metadata.description': 'text'
});

// Compound indexes for filtering
TechPackSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
TechPackSchema.index({ isDeleted: 1, ownerId: 1, createdAt: -1 });

const TechPack = model<ITechPack>('TechPack', TechPackSchema);

export default TechPack;
