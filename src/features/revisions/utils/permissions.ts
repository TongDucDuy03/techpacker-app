import { useAuth } from '../../../contexts/AuthContext';
import { TechPack } from '../../../types/techpack';

export const useRevisionPermissions = (techPack: TechPack | undefined) => {
  const { user } = useAuth();

  if (!user || !techPack) {
    return { canView: false, canEdit: false, canApprove: false };
  }

  const isOwner = techPack.createdBy === user._id || techPack.createdBy?._id === user._id;
  const isAdmin = user.role === 'admin';
  const isMerchandiser = user.role === 'merchandiser';
  const isTechnicalDesigner = techPack.technicalDesignerId === user._id || techPack.technicalDesignerId?._id === user._id;

  // Check shared access
  const sharedAccess = techPack.sharedWith?.find((share: any) => {
    const shareUserId = share.userId?._id || share.userId;
    return shareUserId === user._id;
  });

  const hasSharedViewAccess = !!sharedAccess && ['owner', 'admin', 'editor', 'viewer', 'factory'].includes(sharedAccess.role);
  const hasSharedEditAccess = !!sharedAccess && ['owner', 'admin', 'editor'].includes(sharedAccess.role);

  // View access: Admin, Owner, Technical Designer, or Shared users (all roles)
  const canView = isAdmin || isOwner || isTechnicalDesigner || hasSharedViewAccess;

  // Edit access: Admin, Owner, or Shared Editor (Technical Designer excluded)
  const canEdit = isAdmin || isOwner || hasSharedEditAccess;

  // Approve/Reject access: Admin or Merchandiser
  const canApprove = isAdmin || isMerchandiser;

  return { canView, canEdit, canApprove };
};


