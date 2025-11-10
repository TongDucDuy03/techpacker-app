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

  test('Designer cannot be assigned Factory', () => {
    // Designer allowed: Owner, Editor, Viewer
    expect(isValidRoleForSystemRole(UserRole.Designer, TechPackRole.Factory)).toBe(false);
    // Requesting Factory should be downgraded to highest allowed (Owner in our mapping array order)
    expect(getEffectiveRole(UserRole.Designer, TechPackRole.Factory)).toBe(TechPackRole.Owner);
  });

  test('Merchandiser allowed Editor and Viewer only', () => {
    expect(isValidRoleForSystemRole(UserRole.Merchandiser, TechPackRole.Editor)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Merchandiser, TechPackRole.Owner)).toBe(false);
    expect(getEffectiveRole(UserRole.Merchandiser, TechPackRole.Owner)).toBe(TechPackRole.Editor);
  });

  test('Viewer only allowed Viewer/Factory', () => {
    expect(isValidRoleForSystemRole(UserRole.Viewer, TechPackRole.Viewer)).toBe(true);
    expect(isValidRoleForSystemRole(UserRole.Viewer, TechPackRole.Editor)).toBe(false);
    expect(getEffectiveRole(UserRole.Viewer, TechPackRole.Editor)).toBe(TechPackRole.Viewer);
  });
});
