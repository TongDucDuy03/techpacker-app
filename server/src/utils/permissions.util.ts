import { UserRole } from '../models/user.model';
import { TechPackRole } from '../models/techpack.model';

export interface Permission {
  resource: string;
  action: string;
  roles: UserRole[];
}

// Define all permissions for the application
export const PERMISSIONS: Permission[] = [
  // User Management Permissions
  { resource: 'users', action: 'create', roles: [UserRole.Admin] },
  { resource: 'users', action: 'read', roles: [UserRole.Admin] },
  { resource: 'users', action: 'update', roles: [UserRole.Admin] },
  { resource: 'users', action: 'delete', roles: [UserRole.Admin] },
  { resource: 'users', action: 'manage_roles', roles: [UserRole.Admin] },
  { resource: 'users', action: 'reset_password', roles: [UserRole.Admin] },

  // Tech Pack Permissions
  { resource: 'techpacks', action: 'create', roles: [UserRole.Admin, UserRole.Designer] },
  { resource: 'techpacks', action: 'read', roles: [UserRole.Admin, UserRole.Designer, UserRole.Merchandiser, UserRole.Viewer] },
  { resource: 'techpacks', action: 'update', roles: [UserRole.Admin, UserRole.Designer] },
  { resource: 'techpacks', action: 'delete', roles: [UserRole.Admin, UserRole.Designer] },
  { resource: 'techpacks', action: 'duplicate', roles: [UserRole.Admin, UserRole.Designer] },
  { resource: 'techpacks', action: 'bulk_operations', roles: [UserRole.Admin] },
  { resource: 'techpacks', action: 'export', roles: [UserRole.Admin, UserRole.Designer, UserRole.Merchandiser, UserRole.Viewer] },

  // Profile Permissions
  { resource: 'profile', action: 'read', roles: [UserRole.Admin, UserRole.Designer, UserRole.Merchandiser, UserRole.Viewer] },
  { resource: 'profile', action: 'update', roles: [UserRole.Admin, UserRole.Designer, UserRole.Merchandiser, UserRole.Viewer] },

  // System Permissions
  { resource: 'system', action: 'admin_panel', roles: [UserRole.Admin] },
  { resource: 'system', action: 'user_stats', roles: [UserRole.Admin] },
  { resource: 'system', action: 'audit_logs', roles: [UserRole.Admin] },
];

export class PermissionManager {
  /**
   * Check if a user role has permission for a specific resource and action
   */
  static hasPermission(userRole: UserRole, resource: string, action: string): boolean {
    const permission = PERMISSIONS.find(p => p.resource === resource && p.action === action);
    if (!permission) {
      return false;
    }
    return permission.roles.includes(userRole);
  }

  /**
   * Get all permissions for a specific role
   */
  static getPermissionsForRole(role: UserRole): Permission[] {
    return PERMISSIONS.filter(p => p.roles.includes(role));
  }

  /**
   * Check if a user can access admin features
   */
  static canAccessAdmin(userRole: UserRole): boolean {
    return userRole === UserRole.Admin;
  }

  /**
   * Check if a user can manage tech packs
   */
  static canManageTechPacks(userRole: UserRole): boolean {
    return [UserRole.Admin, UserRole.Designer].includes(userRole);
  }

  /**
   * Check if a user can view tech packs
   */
  static canViewTechPacks(userRole: UserRole): boolean {
    return [UserRole.Admin, UserRole.Designer, UserRole.Merchandiser, UserRole.Viewer].includes(userRole);
  }

  /**
   * Check if a user can perform bulk operations
   */
  static canPerformBulkOperations(userRole: UserRole): boolean {
    return userRole === UserRole.Admin;
  }

  /**
   * Get role hierarchy (higher number = more permissions)
   */
  static getRoleLevel(role: UserRole): number {
    switch (role) {
      case UserRole.Viewer:
        return 1;
      case UserRole.Merchandiser:
        return 2;
      case UserRole.Designer:
        return 3;
      case UserRole.Admin:
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Check if one role has higher or equal permissions than another
   */
  static hasHigherOrEqualRole(userRole: UserRole, requiredRole: UserRole): boolean {
    return this.getRoleLevel(userRole) >= this.getRoleLevel(requiredRole);
  }

  /**
   * Get human-readable role description
   */
  static getRoleDescription(role: UserRole): string {
    switch (role) {
      case UserRole.Admin:
        return 'Administrator - Full system access including user management';
      case UserRole.Designer:
        return 'Designer - Can create, edit, and delete tech packs they own';
      case UserRole.Merchandiser:
        return 'Merchandiser - Read-only access to all tech packs for review';
      case UserRole.Viewer:
        return 'Viewer - Read-only access to tech packs';
      default:
        return 'Unknown role';
    }
  }

  /**
   * Get available actions for a role on a specific resource
   */
  static getAvailableActions(userRole: UserRole, resource: string): string[] {
    return PERMISSIONS
      .filter(p => p.resource === resource && p.roles.includes(userRole))
      .map(p => p.action);
  }

  /**
   * Validate if a role transition is allowed
   */
  static canChangeRole(currentUserRole: UserRole, _targetRole: UserRole, _subjectRole: UserRole): boolean {
    // Only admins can change roles
    if (currentUserRole !== UserRole.Admin) {
      return false;
    }

    // Admins can change any role to any role except their own admin role
    // (to prevent accidentally removing the last admin)
    return true;
  }

  /**
   * Check if a user can create tech packs
   */
  static canCreateTechPacks(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'techpacks', 'create');
  }

  /**
   * Check if a user can edit tech packs
   */
  static canEditTechPacks(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'techpacks', 'update');
  }

  /**
   * Check if a user can delete tech packs
   */
  static canDeleteTechPacks(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'techpacks', 'delete');
  }

  /**
   * Check if a user has read-only access
   */
  static isReadOnlyRole(userRole: UserRole): boolean {
    return [UserRole.Merchandiser, UserRole.Viewer].includes(userRole);
  }

  /**
   * Check if a user can perform write operations on tech packs
   */
  static canWriteTechPacks(userRole: UserRole): boolean {
    return [UserRole.Admin, UserRole.Designer].includes(userRole);
  }

  /**
   * Checks if a TechPackRole allows viewing the tech pack.
   */
  static canViewTechPack(role: TechPackRole): boolean {
    return [TechPackRole.Owner, TechPackRole.Admin, TechPackRole.Editor, TechPackRole.Viewer, TechPackRole.Factory].includes(role);
  }

  /**
   * Checks if a TechPackRole allows editing the tech pack.
   */
  static canEditTechPackContent(role: TechPackRole): boolean {
    return [TechPackRole.Owner, TechPackRole.Admin, TechPackRole.Editor].includes(role);
  }

  /**
   * Checks if a TechPackRole allows sharing and managing access.
   */
  static canManageSharing(role: TechPackRole): boolean {
    return [TechPackRole.Owner, TechPackRole.Admin].includes(role);
  }

  /**
   * Checks if a TechPackRole allows deleting the tech pack.
   */
  static canDeleteTechPack(role: TechPackRole): boolean {
    return role === TechPackRole.Owner;
  }

  /**
   * Checks if a TechPackRole can view sensitive tabs (e.g., Costing, Revisions).
   */
  static canViewSensitiveTabs(role: TechPackRole): boolean {
    return role !== TechPackRole.Factory;
  }
}

// Export role constants for easy access
export const ROLES = {
  ADMIN: UserRole.Admin,
  DESIGNER: UserRole.Designer,
  MERCHANDISER: UserRole.Merchandiser,
  VIEWER: UserRole.Viewer,
} as const;

export const TECHPACK_ROLES = {
  OWNER: TechPackRole.Owner,
  ADMIN: TechPackRole.Admin,
  EDITOR: TechPackRole.Editor,
  VIEWER: TechPackRole.Viewer,
  FACTORY: TechPackRole.Factory,
} as const;

// Export permission checking functions for middleware
export const checkPermission = (resource: string, action: string) => {
  return (userRole: UserRole): boolean => {
    return PermissionManager.hasPermission(userRole, resource, action);
  };
};

export default PermissionManager;
