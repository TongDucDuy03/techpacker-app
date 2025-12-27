import { UserRole } from '../models/user.model';
import { TechPackRole } from '../models/techpack.model';

// Allowed roles per system-level user role (ordered highest-first)
const ALLOWED_ROLES_BY_SYSTEM_ROLE: Record<UserRole, TechPackRole[]> = {
  [UserRole.Admin]: [TechPackRole.Owner, TechPackRole.Admin, TechPackRole.Editor, TechPackRole.Viewer, TechPackRole.Factory],
  [UserRole.Designer]: [TechPackRole.Owner, TechPackRole.Editor, TechPackRole.Viewer],
  [UserRole.Merchandiser]: [TechPackRole.Editor, TechPackRole.Viewer],
  [UserRole.Viewer]: [TechPackRole.Viewer, TechPackRole.Factory]
};

/**
 * Get the effective TechPackRole for a user based on their SystemRole
 * If the requested techpackRole exceeds the user's system permissions,
 * it will be downgraded to the highest valid role (or 'viewer' as fallback)
 */
export function getEffectiveRole(systemRole: UserRole | string | undefined, techpackRole: TechPackRole | string): TechPackRole {
  const sys = (systemRole as UserRole) || UserRole.Viewer;
  const normalized = (techpackRole || '') as TechPackRole;
  const allowed = ALLOWED_ROLES_BY_SYSTEM_ROLE[sys] || ALLOWED_ROLES_BY_SYSTEM_ROLE[UserRole.Viewer];
  if (allowed.includes(normalized)) return normalized;
  return allowed[0] || TechPackRole.Viewer;
}

export function isValidRoleForSystemRole(systemRole: UserRole | string | undefined, techpackRole: TechPackRole | string): boolean {
  const sys = (systemRole as UserRole) || UserRole.Viewer;
  const normalized = (techpackRole || '') as TechPackRole;
  const allowed = ALLOWED_ROLES_BY_SYSTEM_ROLE[sys] || ALLOWED_ROLES_BY_SYSTEM_ROLE[UserRole.Viewer];
  return allowed.includes(normalized);
}

/**
 * Helper function to check if user has edit access to TechPack
 * Centralized logic to avoid code duplication. Uses getEffectiveRole.
 */
export function hasEditAccess(techpack: any, user: any): boolean {
  if (user.role === UserRole.Admin) return true; // Admin toàn quyền
  const isOwner = techpack.createdBy?.toString() === user._id.toString();
  const sharedAccess = techpack.sharedWith?.find((s: any) => s.userId?.toString() === user._id.toString());
  if (sharedAccess) {
    const effective = getEffectiveRole(user.role, sharedAccess.role);
    return isOwner || ['owner', 'admin', 'editor'].includes(effective);
  }
  return isOwner;
}

/**
 * Helper function to check if user has view access to TechPack
 */
export function hasViewAccess(techpack: any, user: any): boolean {
  if (user.role === UserRole.Admin) return true; // Admin toàn quyền
  const isOwner = techpack.createdBy?.toString() === user._id.toString();
  const sharedAccess = techpack.sharedWith?.find((s: any) => s.userId?.toString() === user._id.toString());
  if (sharedAccess) {
    const effective = getEffectiveRole(user.role, sharedAccess.role);
    return isOwner || ['owner', 'admin', 'editor', 'viewer', 'factory'].includes(effective);
  }
  return isOwner;
}

/**
 * Check whether a user has permission to share (grant roles) on a TechPack
 * Owner, Global Admin, and TechPack-level Admin may share
 */
export function hasShareAccess(techpack: any, user: any): boolean {
  if (user.role === UserRole.Admin) return true; // Admin toàn quyền
  // Designer không được chia sẻ, phân quyền
  if (user.role === UserRole.Designer) return false;
  const isOwner = techpack.createdBy?.toString() === user._id.toString();
  const sharedAccess = techpack.sharedWith?.find((s: any) => s.userId?.toString() === user._id.toString());
  const isSharedAdmin = !!sharedAccess && (sharedAccess.role === TechPackRole.Admin || sharedAccess.role === TechPackRole.Owner);
  return isOwner || isSharedAdmin;
}

