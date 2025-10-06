import { Request } from 'express';
import { Types } from 'mongoose';
import Activity, { ActivityAction, IActivityTarget } from '../models/activity.model';

export interface LogActivityParams {
  userId: Types.ObjectId;
  userName: string;
  action: ActivityAction;
  target: IActivityTarget;
  details?: any;
  req?: Request;
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const { userId, userName, action, target, details, req } = params;

    const activity = new Activity({
      userId,
      userName,
      action,
      target,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date()
    });

    await activity.save();
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

export default logActivity;
