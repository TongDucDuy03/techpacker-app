import { Schema, model, Document, Types } from 'mongoose';

export interface IRevisionChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface IRevision extends Document {
  techPackId: Types.ObjectId;
  version: string;
  changes: IRevisionChange[];
  createdBy: Types.ObjectId;
  createdByName: string;
  reason?: string;
  approvedBy?: Types.ObjectId;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  snapshot: any; // Full TechPack data at this revision
}

const RevisionChangeSchema = new Schema<IRevisionChange>(
  {
    field: {
      type: String,
      required: true
    },
    oldValue: {
      type: Schema.Types.Mixed,
      default: null
    },
    newValue: {
      type: Schema.Types.Mixed,
      default: null
    }
  },
  { _id: false }
);

const RevisionSchema = new Schema<IRevision>(
  {
    techPackId: {
      type: Schema.Types.ObjectId,
      ref: 'TechPack',
      required: true
    },
    version: {
      type: String,
      required: true
    },
    changes: [RevisionChangeSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdByName: {
      type: String,
      required: true
    },
    reason: {
      type: String,
      trim: true
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedByName: {
      type: String
    },
    approvedAt: {
      type: Date
    },
    snapshot: {
      type: Schema.Types.Mixed,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
RevisionSchema.index({ techPackId: 1, createdAt: -1 });
RevisionSchema.index({ version: 1 });

const Revision = model<IRevision>('Revision', RevisionSchema);

export default Revision;
