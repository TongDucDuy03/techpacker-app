import { UserRole } from '../models/user.model';
import { TechPackRole } from '../models/techpack.model';

/**
 * TechPack Role hierarchy (from highest to lowest):
 * Owner > Admin > Editor > Viewer = Factory
 * 
 * System Role limits the maximum TechPack Role a user can have:
 * - Viewer: max Viewer or Factory (read-only)
 * - Merchandiser: max Editor (can edit, but not Owner/Admin)
 * - Designer: max Owner (can have full access, but not Factory)
 * - Admin: all roles (no limit)
 */
const TECH_PACK_ROLE_HIERARCHY: Record<TechPackRole, number> = {
  [TechPackRole.Owner]: 5,
  [TechPackRole.Admin]: 4,
  [TechPackRole.Editor]: 3,
  [TechPackRole.Viewer]: 2,
  [TechPackRole.Factory]: 2, // Same level as Viewer
};

/**
 * Maximum TechPack Role allowed for each System Role
 */
const MAX_TECHPACK_ROLE_BY_SYSTEM_ROLE: Record<UserRole, TechPackRole> = {
  [UserRole.Admin]: TechPackRole.Owner, // Admin can have any role (highest)
  [UserRole.Designer]: TechPackRole.Owner, // Designer can have Owner (but not Factory)
  [UserRole.Merchandiser]: TechPackRole.Editor, // Merchandiser max Editor
  [UserRole.Viewer]: TechPackRole.Viewer, // Viewer max Viewer (or Factory)
};

/**
 * Get the maximum TechPack Role allowed for a System Role
 */
function getMaxTechPackRole(systemRole: UserRole | string | undefined): TechPackRole {
  const role = (systemRole as UserRole) || UserRole.Viewer;
  return MAX_TECHPACK_ROLE_BY_SYSTEM_ROLE[role] || TechPackRole.Viewer;
}

/**
 * Check if a TechPack Role is within the allowed range for a System Role
 * System Role limits the maximum TechPack Role (can assign equal or lower)
 */
function isTechPackRoleAllowed(systemRole: UserRole | string | undefined, techpackRole: TechPackRole | string): boolean {
  // System Admin can have any role
  if (systemRole === UserRole.Admin) {
    return true;
  }
  
  const maxRole = getMaxTechPackRole(systemRole);
  const requestedRole = (techpackRole || TechPackRole.Viewer) as TechPackRole;
  
  // Check hierarchy: requested role must be <= max role
  const maxLevel = TECH_PACK_ROLE_HIERARCHY[maxRole];
  const requestedLevel = TECH_PACK_ROLE_HIERARCHY[requestedRole];
  
  // Special case: Designer cannot have Factory role (even though Factory is same level as Viewer)
  if (systemRole === UserRole.Designer && requestedRole === TechPackRole.Factory) {
    return false;
  }
  
  return requestedLevel <= maxLevel;
}

/**
 * Get the effective TechPackRole for a user
 * If the requested TechPack Role exceeds the System Role limit, downgrade to the maximum allowed
 * System Admin has override (full access)
 */
export function getEffectiveRole(systemRole: UserRole | string | undefined, techpackRole: TechPackRole | string): TechPackRole {
  // System Admin has override - always return the requested role (they have full access)
  if (systemRole === UserRole.Admin) {
    return (techpackRole || TechPackRole.Viewer) as TechPackRole;
  }
  
  const requestedRole = (techpackRole || TechPackRole.Viewer) as TechPackRole;
  
  // If requested role is allowed, return it
  if (isTechPackRoleAllowed(systemRole, requestedRole)) {
    return requestedRole;
  }
  
  // Otherwise, downgrade to maximum allowed role
  return getMaxTechPackRole(systemRole);
}

/**
 * Check if a TechPack Role is valid for a System Role
 * System Role limits the maximum TechPack Role (can assign equal or lower)
 */
export function isValidRoleForSystemRole(systemRole: UserRole | string | undefined, techpackRole: TechPackRole | string): boolean {
  return isTechPackRoleAllowed(systemRole, techpackRole);
}

/**
 * Helper function to check if user has edit access to TechPack
 * Uses effective role (may be downgraded if TechPack Role exceeds System Role limit)
 */
export function hasEditAccess(techpack: any, user: any): boolean {
  if (user.role === UserRole.Admin) return true; // System Admin has override
  
  // Check if user is owner - handle both ObjectId and populated object
  const createdById = techpack.createdBy?._id?.toString() || techpack.createdBy?.toString();
  const userId = user._id?.toString();
  const isOwner = createdById === userId;
  if (isOwner) return true; // Owner has full access
  
  const sharedAccess = techpack.sharedWith?.find((s: any) => {
    const shareUserId = s.userId?._id?.toString() || s.userId?.toString();
    return shareUserId === user._id.toString();
  });
  
  if (sharedAccess) {
    // Normalize sharedAccess.role to string for getEffectiveRole
    const sharedRoleStr = typeof sharedAccess.role === 'string' 
      ? sharedAccess.role 
      : String(sharedAccess.role);
    
    // Get effective role (may be downgraded if it exceeds System Role limit)
    const effectiveRole = getEffectiveRole(user.role, sharedRoleStr);
    
    // Normalize effectiveRole to string for comparison (handle both enum and string)
    const roleStr = typeof effectiveRole === 'string' 
      ? effectiveRole.toLowerCase() 
      : String(effectiveRole).toLowerCase();
    
    console.log('[hasEditAccess] Role check:', {
      userId: user._id.toString(),
      userRole: user.role,
      sharedRole: sharedAccess.role,
      sharedRoleStr,
      effectiveRole,
      roleStr,
      hasEditAccess: ['owner', 'admin', 'editor'].includes(roleStr)
    });
    
    return ['owner', 'admin', 'editor'].includes(roleStr);
  }
  return false;
}

/**
 * Helper function to check if user has view access to TechPack
 * Uses effective role (may be downgraded if TechPack Role exceeds System Role limit)
 */
export function hasViewAccess(techpack: any, user: any): boolean {
  if (user.role === UserRole.Admin) return true; // System Admin has override
  
  // Check if user is owner - handle both ObjectId and populated object
  const createdById = techpack.createdBy?._id?.toString() || techpack.createdBy?.toString();
  const userId = user._id?.toString();
  const isOwner = createdById === userId;
  if (isOwner) return true; // Owner has full access
  
  const sharedAccess = techpack.sharedWith?.find((s: any) => s.userId?.toString() === user._id.toString());
  if (sharedAccess) {
    // Get effective role (may be downgraded if it exceeds System Role limit)
    const effectiveRole = getEffectiveRole(user.role, sharedAccess.role);
    return ['owner', 'admin', 'editor', 'viewer', 'factory'].includes(effectiveRole);
  }
  return false;
}

/**
 * Check whether a user has permission to share (grant roles) on a TechPack
 * Only Owner and TechPack-level Admin can share
 * Uses effective role (may be downgraded if TechPack Role exceeds System Role limit)
 */
export function hasShareAccess(techpack: any, user: any): boolean {
  if (user.role === UserRole.Admin) return true; // System Admin has override
  const isOwner = techpack.createdBy?.toString() === user._id.toString();
  if (isOwner) return true; // Owner can share
  
  const sharedAccess = techpack.sharedWith?.find((s: any) => s.userId?.toString() === user._id.toString());
  if (sharedAccess) {
    // Get effective role (may be downgraded if it exceeds System Role limit)
    const effectiveRole = getEffectiveRole(user.role, sharedAccess.role);
    return effectiveRole === TechPackRole.Admin || effectiveRole === TechPackRole.Owner;
  }
  return false;
}

