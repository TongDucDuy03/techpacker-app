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
  // Note: technicalDesignerId is now a string (name), not a user reference

  // Check shared access
  const sharedAccess = techPack.sharedWith?.find((share: any) => {
    const shareUserId = share.userId?._id || share.userId;
    return shareUserId === user._id;
  });

  const hasSharedViewAccess = !!sharedAccess && ['owner', 'admin', 'editor', 'viewer', 'factory'].includes(sharedAccess.role);
  const hasSharedEditAccess = !!sharedAccess && ['owner', 'admin', 'editor'].includes(sharedAccess.role);

  // View access: Admin, Owner, or Shared users (all roles)
  const canView = isAdmin || isOwner || hasSharedViewAccess;

  // Edit access: Admin, Owner, or Shared Editor
  const canEdit = isAdmin || isOwner || hasSharedEditAccess;

  // Approve/Reject access: Admin or Merchandiser
  const canApprove = isAdmin || isMerchandiser;

  return { canView, canEdit, canApprove };
};


