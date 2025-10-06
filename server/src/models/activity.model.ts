import { Schema, model, Document, Types } from 'mongoose';

export enum ActivityAction {
  TECHPACK_CREATE = 'TECHPACK_CREATE',
  TECHPACK_UPDATE = 'TECHPACK_UPDATE',
  TECHPACK_DELETE = 'TECHPACK_DELETE',
  BOM_ADD = 'BOM_ADD',
  BOM_UPDATE = 'BOM_UPDATE',
  BOM_DELETE = 'BOM_DELETE',
  MEASUREMENT_ADD = 'MEASUREMENT_ADD',
  MEASUREMENT_UPDATE = 'MEASUREMENT_UPDATE',
  MEASUREMENT_DELETE = 'MEASUREMENT_DELETE',
  COLORWAY_ADD = 'COLORWAY_ADD',
  COLORWAY_UPDATE = 'COLORWAY_UPDATE',
  COLORWAY_DELETE = 'COLORWAY_DELETE',
  STATUS_CHANGE_APPROVED = 'STATUS_CHANGE_APPROVED',
  STATUS_CHANGE_REJECTED = 'STATUS_CHANGE_REJECTED',
  STATUS_CHANGE_SUBMITTED = 'STATUS_CHANGE_SUBMITTED',
  PDF_EXPORT = 'PDF_EXPORT',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT'
}

export interface IActivityTarget {
  type: string;
  id: Types.ObjectId;
  name: string;
}

export interface IActivity extends Document {
  userId: Types.ObjectId;
  userName: string;
  action: ActivityAction;
  target: IActivityTarget;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const ActivityTargetSchema = new Schema<IActivityTarget>(
  {
    type: {
      type: String,
      required: true,
      enum: ['TechPack', 'BOM', 'Measurement', 'Colorway', 'User']
    },
    id: {
      type: Schema.Types.ObjectId,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const ActivitySchema = new Schema<IActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    action: {
      type: String,
      enum: Object.values(ActivityAction),
      required: true
    },
    target: {
      type: ActivityTargetSchema,
      required: true
    },
    details: {
      type: Schema.Types.Mixed,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false // We use custom timestamp field
  }
);

// Index for efficient queries
ActivitySchema.index({ userId: 1, timestamp: -1 });
ActivitySchema.index({ 'target.type': 1, 'target.id': 1, timestamp: -1 });
ActivitySchema.index({ action: 1, timestamp: -1 });

const Activity = model<IActivity>('Activity', ActivitySchema);

export default Activity;
