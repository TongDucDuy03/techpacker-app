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
  collection?: string;
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

export interface ITechPack extends Document {
  productName: string;
  articleCode: string;
  version: string;
  designer: Types.ObjectId;
  designerName: string;
  supplier: string;
  season: string;
  fabricDescription: string;
  status: TechPackStatus;
  category?: string;
  gender?: 'Men' | 'Women' | 'Unisex' | 'Kids';
  brand?: string;
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
  collection: { type: String },
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
    designer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    designerName: {
      type: String,
      required: true
    },
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
    status: {
      type: String,
      enum: Object.values(TechPackStatus),
      default: TechPackStatus.Draft
    },
    category: { type: String, trim: true },
    gender: { type: String, enum: ['Men', 'Women', 'Unisex', 'Kids'] },
    brand: { type: String, trim: true },
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
      ref: 'User',
      required: true
    },
    createdByName: {
      type: String,
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedByName: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
TechPackSchema.index({ articleCode: 1 });
TechPackSchema.index({ designer: 1, createdAt: -1 });
TechPackSchema.index({ status: 1, updatedAt: -1 });
TechPackSchema.index({ season: 1, brand: 1 });
TechPackSchema.index({ createdAt: -1 });

// Virtual for lifecycle stage (compatibility with PDF service)
TechPackSchema.virtual('lifecycleStage').get(function (this: ITechPack) {
  return this.status;
});

const TechPack = model<ITechPack>('TechPack', TechPackSchema);

export default TechPack;
