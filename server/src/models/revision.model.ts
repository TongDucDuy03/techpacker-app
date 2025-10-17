import { Schema, model, Document, Types } from 'mongoose';

export type ChangeType = 'auto' | 'manual' | 'approval' | 'rollback';

export interface IRevisionChange {
  summary: string; // e.g., "BOM: 1 added, 2 modified. Measurements: 1 modified."
  details: Record<string, { added?: number; modified?: number; removed?: number }>;
}

export interface IRevision extends Document {
  techPackId: Types.ObjectId;
  version: string;
  changes: IRevisionChange;
  createdBy: Types.ObjectId;
  createdByName: string;
  description?: string; // User-provided reason for the change
  changeType: ChangeType;
  statusAtChange: string; // The status of the TechPack when this revision was created
  approvedBy?: Types.ObjectId;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  snapshot: any; // Full TechPack data at this revision
}

const RevisionChangeSchema = new Schema<IRevisionChange>(
  {
    summary: { type: String, required: true },
    details: { type: Schema.Types.Mixed, required: true },
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
    changes: { type: RevisionChangeSchema, required: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdByName: {
      type: String,
      required: true
    },
    description: { type: String, trim: true },
    changeType: { type: String, enum: ['auto', 'manual', 'approval', 'rollback'], required: true },
    statusAtChange: { type: String, required: true },
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
