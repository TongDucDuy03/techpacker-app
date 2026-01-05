import { getEffectiveRole, isValidRoleForSystemRole } from './access-control.util';
import { UserRole } from '../models/user.model';
import { TechPackRole } from '../models/techpack.model';

describe('access-control util - getEffectiveRole', () => {
  test('Admin can be assigned any role (owner..factory)', () => {
    expect(getEffectiveRole(UserRole.Admin, TechPackRole.Owner)).toBe(TechPackRole.Owner);
    expect(getEffectiveRole(UserRole.Admin, TechPackRole.Admin)).toBe(TechPackRole.Admin);
    expect(getEffectiveRole(UserRole.Admin, TechPackRole.Editor)).toBe(TechPackRole.Editor);
    expect(getEffectiveRole(UserRole.Admin, TechPackRole.Viewer)).toBe(TechPackRole.Viewer);
    expect(getEffectiveRole(UserRole.Admin, TechPackRole.Factory)).toBe(TechPackRole.Factory);
  });

  test('System Role limits maximum TechPack Role', () => {
    // Viewer: max Viewer or Factory
    expect(isValidRoleForSystemRole(UserRole.Viewer, TechPackRole.Viewer)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Viewer, TechPackRole.Factory)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Viewer, TechPackRole.Editor)).toBe(false);
    expect(isValidRoleForSystemRole(UserRole.Viewer, TechPackRole.Owner)).toBe(false);
    expect(getEffectiveRole(UserRole.Viewer, TechPackRole.Owner)).toBe(TechPackRole.Viewer); // Downgraded
    
    // Merchandiser: max Editor
    expect(isValidRoleForSystemRole(UserRole.Merchandiser, TechPackRole.Editor)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Merchandiser, TechPackRole.Viewer)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Merchandiser, TechPackRole.Factory)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Merchandiser, TechPackRole.Admin)).toBe(false);
    expect(isValidRoleForSystemRole(UserRole.Merchandiser, TechPackRole.Owner)).toBe(false);
    expect(getEffectiveRole(UserRole.Merchandiser, TechPackRole.Owner)).toBe(TechPackRole.Editor); // Downgraded
    
    // Designer: max Owner (but not Factory)
    expect(isValidRoleForSystemRole(UserRole.Designer, TechPackRole.Owner)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Designer, TechPackRole.Admin)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Designer, TechPackRole.Editor)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Designer, TechPackRole.Viewer)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Designer, TechPackRole.Factory)).toBe(false); // Designer cannot have Factory
  });
});
