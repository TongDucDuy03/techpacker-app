import AuditLog, { IAuditLog } from '../models/audit-log.model';
import { Request } from 'express';
import { IUser } from '../models/user.model';

interface LogOptions {
  user: IUser | { _id: string; email: string };
  action: IAuditLog['action'];
  resource: IAuditLog['resource'];
  resourceId?: string;
  details?: Record<string, any>;
  req?: Request;
}

class AuditLogService {
  async log(options: LogOptions): Promise<void> {
    try {
      const { user, action, resource, resourceId, details, req } = options;

      const logEntry = new AuditLog({
        userId: user._id,
        userEmail: user.email,
        action,
        resource,
        resourceId,
        details,
        ipAddress: req?.ip,
        userAgent: req?.get('User-Agent'),
      });

      await logEntry.save();
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // We don't want to throw an error here as logging should not interrupt the main operation
    }
  }

  async getLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ logs: IAuditLog[]; pagination: any }> {
    const { page = 1, limit = 20, userId, action, resource, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      logs: logs as unknown as IAuditLog[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

export const auditLogService = new AuditLogService();
