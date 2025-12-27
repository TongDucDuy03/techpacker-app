import User from '../models/user.model';
import TechPack from '../models/techpack.model';

export interface NotificationPayload {
  title: string;
  body: string;
  link?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Send notification to multiple users
   * This is a stub implementation - integrate with your notification system (email, push, in-app)
   */
  static async notifyUsers(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<void> {
    try {
      // Get users to notify
      const users = await User.find({ _id: { $in: userIds } }).select('email firstName lastName');
      
      // TODO: Integrate with actual notification system
      // For now, just log (can be extended to email, push notifications, in-app notifications)
      console.log('📧 Notification:', {
        users: users.map(u => ({ id: u._id, email: u.email, name: `${u.firstName} ${u.lastName}` })),
        payload
      });

      // Example: Send email notifications
      // await emailService.sendBulk(users.map(u => u.email), payload);

      // Example: Create in-app notifications
      // await InAppNotification.createMany(userIds.map(userId => ({ userId, ...payload })));

    } catch (error) {
      console.error('Failed to send notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Notify stakeholders about TechPack revert
   */
  static async notifyRevert(
    techPackId: string,
    revertedBy: { _id: any; firstName: string; lastName: string },
    targetVersion: string,
    newVersion: string
  ): Promise<void> {
    try {
      const techpack = await TechPack.findById(techPackId)
        .populate('createdBy', 'email')
        .populate('sharedWith.userId', 'email');

      const userIds: string[] = [];

      // Add owner
      if (techpack?.createdBy) {
        userIds.push(String(techpack.createdBy._id || techpack.createdBy));
      }

      // Note: technicalDesignerId is now a string (name), not a user reference, so we don't add it to userIds

      // Add shared users (editors and viewers)
      if (techpack?.sharedWith) {
        techpack.sharedWith.forEach((share: any) => {
          const userId = String(share.userId?._id || share.userId);
          if (userIds.indexOf(userId) === -1) {
            userIds.push(userId);
          }
        });
      }

      // Remove the person who performed the revert
      const revertedById = String(revertedBy._id);
      const filteredUserIds = userIds.filter(id => id !== revertedById);

      if (filteredUserIds.length > 0) {
        await this.notifyUsers(filteredUserIds, {
          title: 'TechPack Reverted',
          body: `${revertedBy.firstName} ${revertedBy.lastName} reverted TechPack "${(techpack as any)?.articleName || (techpack as any)?.productName || 'Unknown'}" to version ${targetVersion}. New version: ${newVersion}`,
          link: `/techpacks/${techPackId}`,
          type: 'info',
          metadata: {
            techPackId,
            revertedBy: revertedById,
            targetVersion,
            newVersion
          }
        });
      }
    } catch (error) {
      console.error('Failed to notify about revert:', error);
    }
  }

  /**
   * Notify about revision approval/rejection
   */
  static async notifyApproval(
    revisionId: string,
    techPackId: string,
    approvedBy: { _id: any; firstName: string; lastName: string },
    revisionCreatorId: string,
    status: 'approved' | 'rejected',
    reason?: string
  ): Promise<void> {
    try {
      const techpack = await TechPack.findById(techPackId);
      const userIds: string[] = [];

      // Notify revision creator
      userIds.push(revisionCreatorId);

      // Notify owner
      if (techpack?.createdBy) {
        const ownerId = String(techpack.createdBy._id || techpack.createdBy);
        if (ownerId !== revisionCreatorId) {
          userIds.push(ownerId);
        }
      }

      if (userIds.length > 0) {
        await this.notifyUsers(userIds, {
          title: `Revision ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          body: `${approvedBy.firstName} ${approvedBy.lastName} ${status} a revision for TechPack "${(techpack as any)?.articleName || (techpack as any)?.productName || 'Unknown'}"${reason ? `: ${reason}` : ''}`,
          link: `/techpacks/${techPackId}/revisions/${revisionId}`,
          type: status === 'approved' ? 'success' : 'warning',
          metadata: {
            revisionId,
            techPackId,
            approvedBy: String(approvedBy._id),
            status
          }
        });
      }
    } catch (error) {
      console.error('Failed to notify about approval:', error);
    }
  }
}

export default NotificationService;


