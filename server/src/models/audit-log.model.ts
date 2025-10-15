import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'RESET_PASSWORD',
      'CHANGE_ROLE',
      'LOGIN',
      'LOGOUT',
      'FAILED_LOGIN',
      'CREATE_TECHPACK',
      'UPDATE_TECHPACK',
      'DELETE_TECHPACK',
      'BULK_OPERATION'
    ],
  },
  resource: {
    type: String,
    required: true,
    enum: ['user', 'techpack', 'auth', 'system'],
  },
  resourceId: {
    type: String,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, timestamp: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export default AuditLog;
