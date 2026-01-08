import TechPack, { TechPackRole } from '../models/techpack.model';
import { UserRole } from '../models/user.model';
import { Types } from 'mongoose';
import CacheInvalidationUtil from './cache-invalidation.util';

/**
 * Maps global UserRole to maximum allowed TechPackRole level
 */
const globalRoleToTechPackRoleLevel: { [key: string]: number } = {
  'admin': 4,      // Admin global role -> Admin techpack role
  'designer': 3,    // Designer global role -> Editor techpack role
  'merchandiser': 2, // Merchandiser global role -> Viewer techpack role
  'viewer': 2,      // Viewer global role -> Viewer techpack role
};

/**
 * Maps TechPackRole to numeric level for comparison
 */
const techPackRoleLevels: { [key in TechPackRole]: number } = {
  [TechPackRole.Owner]: 5,
  [TechPackRole.Admin]: 4,
  [TechPackRole.Editor]: 3,
  [TechPackRole.Viewer]: 2,
  [TechPackRole.Factory]: 1,
};

/**
 * Maps TechPackRole level to TechPackRole enum value
 */
const levelToTechPackRole: { [level: number]: TechPackRole } = {
  4: TechPackRole.Admin,
  3: TechPackRole.Editor,
  2: TechPackRole.Viewer,
  1: TechPackRole.Factory,
};

/**
 * Gets the maximum allowed TechPackRole for a given global UserRole
 */
export function getMaxAllowedTechPackRole(globalRole: UserRole): TechPackRole | null {
  const roleKey = globalRole?.toLowerCase() || '';
  const maxLevel = globalRoleToTechPackRoleLevel[roleKey] || 0;
  
  if (maxLevel === 0) {
    return null;
  }
  
  return levelToTechPackRole[maxLevel] || TechPackRole.Viewer;
}

/**
 * Normalizes TechPack sharing permissions for a user when their global role changes.
 * 
 * If the user's global role is downgraded (e.g., Designer -> Viewer),
 * all TechPack sharing permissions that exceed the new global role's max level
 * will be automatically adjusted or removed.
 * 
 * @param userId - The user ID whose role has changed
 * @param newGlobalRole - The new global role assigned to the user
 * @param oldGlobalRole - The previous global role (optional, for logging)
 * @returns Object with stats about normalized permissions
 */
export async function normalizeTechPackPermissionsForUser(
  userId: Types.ObjectId | string,
  newGlobalRole: UserRole,
  oldGlobalRole?: UserRole
): Promise<{
  techpacksUpdated: number;
  permissionsAdjusted: number;
  permissionsRemoved: number;
  affectedTechPackIds: string[];
}> {
  const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const maxAllowedRole = getMaxAllowedTechPackRole(newGlobalRole);
  
  if (!maxAllowedRole) {
    console.warn(`[normalizeTechPackPermissions] No max role mapping for global role: ${newGlobalRole}`);
    return {
      techpacksUpdated: 0,
      permissionsAdjusted: 0,
      permissionsRemoved: 0,
      affectedTechPackIds: [],
    };
  }
  
  const maxAllowedLevel = techPackRoleLevels[maxAllowedRole];
  
  console.log(`[normalizeTechPackPermissions] Normalizing permissions for user ${userIdObj}`, {
    oldGlobalRole,
    newGlobalRole,
    maxAllowedRole,
    maxAllowedLevel,
  });
  
  // Find all TechPacks where this user has sharing access
  const techpacks = await TechPack.find({
    'sharedWith.userId': userIdObj,
  }).lean();
  
  let techpacksUpdated = 0;
  let permissionsAdjusted = 0;
  let permissionsRemoved = 0;
  const affectedTechPackIds: string[] = [];
  
  for (const techpack of techpacks) {
    if (!techpack.sharedWith || techpack.sharedWith.length === 0) {
      continue;
    }
    
    const shareIndex = techpack.sharedWith.findIndex(
      (s: any) => s.userId.toString() === userIdObj.toString()
    );
    
    if (shareIndex === -1) {
      continue;
    }
    
    const currentShare = techpack.sharedWith[shareIndex];
    const currentRole = currentShare.role as TechPackRole;
    const currentLevel = techPackRoleLevels[currentRole] || 0;
    
    // If current role level exceeds max allowed level, adjust it
    if (currentLevel > maxAllowedLevel) {
      affectedTechPackIds.push(techpack._id.toString());
      
      // Update the TechPack document
      const techpackDoc = await TechPack.findById(techpack._id);
      if (!techpackDoc) {
        continue;
      }
      
      if (currentLevel > maxAllowedLevel) {
        // Adjust to max allowed role
        techpackDoc.sharedWith[shareIndex].role = maxAllowedRole;
        // Update backward compatibility field
        techpackDoc.sharedWith[shareIndex].permission = 
          maxAllowedRole === TechPackRole.Viewer || maxAllowedRole === TechPackRole.Factory 
            ? 'view' 
            : 'edit';
        
        permissionsAdjusted++;
        console.log(
          `[normalizeTechPackPermissions] Adjusted permission for user ${userIdObj} in TechPack ${techpack._id}`,
          {
            oldRole: currentRole,
            newRole: maxAllowedRole,
            techpackId: techpack._id.toString(),
          }
        );
      }
      
      await techpackDoc.save();
      techpacksUpdated++;
      
      // Invalidate cache for this techpack
      CacheInvalidationUtil.invalidateTechPackCache(techpack._id.toString());
    }
  }
  
  console.log(`[normalizeTechPackPermissions] Normalization complete for user ${userIdObj}`, {
    techpacksUpdated,
    permissionsAdjusted,
    permissionsRemoved,
    affectedTechPackIds: affectedTechPackIds.length,
  });
  
  return {
    techpacksUpdated,
    permissionsAdjusted,
    permissionsRemoved,
    affectedTechPackIds,
  };
}

