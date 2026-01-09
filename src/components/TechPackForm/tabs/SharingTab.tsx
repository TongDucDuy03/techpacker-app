import React, { useState, useEffect, useMemo } from 'react';
import { ApiTechPack, TechPackRole, ShareableUser, AccessListItem } from '../../../types/techpack';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { User, Share2, Eye, Trash2, Crown, Shield, PenTool, Factory, UserPlus } from 'lucide-react';
import { showSuccess, showError } from '../../../lib/toast';
import { useI18n } from '../../../lib/i18n';

interface SharingTabProps {
  techPack?: ApiTechPack;
  mode?: 'create' | 'edit' | 'view';
}

const roleIcons: { [key in TechPackRole]: React.ReactNode } = {
  [TechPackRole.Owner]: <Crown className="w-4 h-4 text-yellow-500" />,
  [TechPackRole.Admin]: <Shield className="w-4 h-4 text-blue-500" />,
  [TechPackRole.Editor]: <PenTool className="w-4 h-4 text-green-500" />,
  [TechPackRole.Viewer]: <Eye className="w-4 h-4 text-gray-500" />,
  [TechPackRole.Factory]: <Factory className="w-4 h-4 text-purple-500" />,
};

// Descriptions kept for future UI enhancements if needed

const SharingTab: React.FC<SharingTabProps> = ({ techPack, mode }) => {
  const { user: currentUser } = useAuth();
  const { t } = useI18n();
  // Normalize currentUserId: prefer `id`, then `_id`, always string
  const currentUserId = String((currentUser as any)?.id || (currentUser as any)?._id || '');
  const [accessList, setAccessList] = useState<AccessListItem[]>([]);
  const [shareableUsers, setShareableUsers] = useState<ShareableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<TechPackRole>(TechPackRole.Viewer);

  // Resolve TechPack ID from props or URL (fallback)
  const resolvedTechpackId = useMemo(() => {
    const directId = (techPack as any)?._id || (techPack as any)?.id || (techPack as any)?.techPackId;
    if (directId) return String(directId);
    try {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (/^[a-fA-F0-9]{24}$/.test(last)) return last;
    } catch {}
    return undefined;
  }, [techPack]);

  const currentUserTechPackRole = useMemo(() => {
    if (!techPack || !currentUser) return undefined;

    // Global Admin should have full administrative access
    if (currentUser.role?.toLowerCase() === 'admin') {
      return TechPackRole.Admin;
    }

    // Owner detection: handle both ObjectId and populated object
    const createdByRaw: any = (techPack as any).createdBy;
    const createdById = createdByRaw && typeof createdByRaw === 'object' ? createdByRaw._id : createdByRaw;
    if (createdById && String(createdById) === String(currentUserId)) {
      return TechPackRole.Owner;
    }

    // Check for explicit sharing role (handle populated userId)
    const shared = accessList.find(item => {
      const uid: any = (item as any).userId;
      const uidValue = uid && typeof uid === 'object' ? uid._id : uid;
      return String(uidValue) === String(currentUserId);
    });
    return shared?.role;
  }, [techPack, currentUser, currentUserId, accessList]);

  const canManage = useMemo(() => {
    // Global Admin should always be able to manage
    // Check case-insensitive
    if (currentUser?.role?.toLowerCase() === 'admin') {
      return true;
    }
    return currentUserTechPackRole === TechPackRole.Owner || currentUserTechPackRole === TechPackRole.Admin;
  }, [currentUserTechPackRole, currentUser]);

  const fetchData = async () => {
    if (!resolvedTechpackId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      console.log('🔍 Fetching access list for TechPack:', resolvedTechpackId);
      console.log('👤 Current user:', {
        id: currentUserId,
        role: currentUser?.role,
        email: currentUser?.email
      });
      // Debug tokens to help diagnose 401/403 issues
      console.log('🔐 Tokens (localStorage):', {
        accessToken: localStorage.getItem('accessToken') ? 'present' : 'missing',
        refreshToken: localStorage.getItem('refreshToken') ? 'present' : 'missing'
      });
      console.log('📦 TechPack createdBy:', String((techPack as any).createdBy));
      
      // Fetching access list for techpack
      let fetchedAccessList: any[] = [];
      try {
        const accessRes = await api.getAccessList(resolvedTechpackId);
        fetchedAccessList = accessRes.data || [];
        console.log('✅ Access list fetched:', fetchedAccessList);
        setAccessList(fetchedAccessList);
      } catch (accessErr: any) {
        console.warn('⚠️ Failed to fetch access list, continuing if user is owner/admin:', accessErr?.message || accessErr);
        // Reset access list locally but don't abort — we may still be able to fetch shareable users
        fetchedAccessList = [];
        setAccessList([]);
      }

      // Determine if the current user can manage based on the fetched list
      let userRole;
      if (currentUser?.role?.toLowerCase() === 'admin') {
        userRole = TechPackRole.Admin;
      } else {
        const createdByRaw: any = (techPack as any).createdBy;
        const createdById = createdByRaw && typeof createdByRaw === 'object' ? createdByRaw._id : createdByRaw;
        if (createdById && String(createdById) === String(currentUserId)) {
          userRole = TechPackRole.Owner;
        } else {
          const match = fetchedAccessList.find((item: AccessListItem) => {
            const uid: any = (item as any).userId;
            const uidValue = uid && typeof uid === 'object' ? uid._id : uid;
            return String(uidValue) === String(currentUserId);
          });
          userRole = match?.role;
        }
      }

      console.log('🤔 Determined user role for sharing:', {
        userRole,
        isOwner: String((techPack as any).createdBy) === String(currentUserId),
        isGlobalAdmin: currentUser?.role?.toLowerCase() === 'admin',
        TechPackRoleOwner: TechPackRole.Owner,
        TechPackRoleAdmin: TechPackRole.Admin,
        comparison1: userRole === TechPackRole.Owner,
        comparison2: userRole === TechPackRole.Admin
      });

      // Check if user can manage sharing (Owner, Admin, or Global Admin)
      const canManageSharing = userRole === TechPackRole.Owner ||
                              userRole === TechPackRole.Admin ||
                              currentUser?.role?.toLowerCase() === 'admin';

      console.log('🔐 Can manage sharing:', canManageSharing);
      console.log('🔐 Conditions check:', {
        userRole,
        isOwner: userRole === TechPackRole.Owner,
        isAdmin: userRole === TechPackRole.Admin,
        isGlobalAdmin: currentUser?.role?.toLowerCase() === 'admin',
        canManageSharing
      });
      // Try to fetch shareable users when:
      // - we know the current user can manage sharing (owner/admin), OR
      // - access list fetch failed but currentUser is owner/global admin (best-effort)
  const shouldTryFetchShareable = Boolean(
        canManageSharing ||
        currentUser?.role?.toLowerCase() === 'admin' ||
        ((): boolean => {
          const createdByRaw: any = (techPack as any).createdBy;
          const createdById = createdByRaw && typeof createdByRaw === 'object' ? createdByRaw._id : createdByRaw;
          return createdById && String(createdById) === String(currentUserId);
        })()
      );

      if (shouldTryFetchShareable) {
        try {
          console.log('📋 Fetching shareable users...', { techpackId: resolvedTechpackId, includeAdmins: false });
          // Do NOT include admins to avoid showing them in dropdown
          const usersRes = await api.getShareableUsers(resolvedTechpackId, { includeAdmins: false });
          console.log('✅ Shareable users response:', usersRes);
          const users = (usersRes as any).data || usersRes;
          console.log('📋 Shareable users:', users);
          setShareableUsers(users || []);
          console.log('✅ setShareableUsers done, count:', Array.isArray(users) ? users.length : 0);
        } catch (shareableError: any) {
          console.error('❌ Could not fetch shareable users:', shareableError);
          console.error('Error details:', {
            message: shareableError.message,
            response: shareableError.response?.data,
            status: shareableError.response?.status
          });
          // Don't block the UI, just don't show shareable users dropdown
          setShareableUsers([]);
        }
      }

      console.log('Successfully loaded sharing data');
    } catch (error) {
      console.error('Failed to fetch sharing data:', error);
      showError(t('form.sharing.loadError'));
      // Reset states on error
      setAccessList([]);
      setShareableUsers([]);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (resolvedTechpackId) {
        await fetchData();
      } else {
        // Ensure loading is false when no techpack ID
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData().catch((error) => {
      console.error('Error in sharing tab useEffect:', error);
      if (isMounted) {
        setLoading(false);
        showError(t('form.sharing.loadError'));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [resolvedTechpackId, currentUserId]);

  // Removed duplicate shareable users fetch to avoid overwriting state

  // Role hierarchy: Owner > Admin > Editor > Viewer > Factory
  const getRoleLevel = (role: TechPackRole | string | undefined): number => {
    if (!role) return 0;
    
    // Normalize role to string for comparison (handle both enum and string)
    const roleStr = typeof role === 'string' ? role.toLowerCase() : String(role).toLowerCase();
    
    const levels: { [key: string]: number } = {
      'owner': 5,
      'admin': 4,
      'editor': 3,
      'viewer': 2,
      'factory': 1,
    };
    return levels[roleStr] || 0;
  };

  // Map global role to equivalent techpack role level
  const getGlobalRoleToTechPackRoleLevel = (globalRole: string | undefined): number => {
    if (!globalRole) return 0;
    const roleStr = globalRole.toLowerCase();
    // Map: admin -> Admin (4), designer -> Editor (3), merchandiser -> Viewer (2), viewer -> Viewer (2)
    const mapping: { [key: string]: number } = {
      'admin': 4,      // Admin global role -> Admin techpack role
      'designer': 3,   // Designer global role -> Editor techpack role
      'merchandiser': 2, // Merchandiser global role -> Viewer techpack role
      'viewer': 2,     // Viewer global role -> Viewer techpack role
    };
    return mapping[roleStr] || 0;
  };

  // Check if a role is higher than the current user's techpack role
  const isRoleHigherThanCurrent = (role: TechPackRole | string): boolean => {
    if (!currentUserTechPackRole) {
      console.log('[SharingTab] isRoleHigherThanCurrent - no currentUserTechPackRole');
      return false;
    }
    const roleLevel = getRoleLevel(role);
    const currentLevel = getRoleLevel(currentUserTechPackRole);
    const isHigher = roleLevel > currentLevel;
    console.log('[SharingTab] isRoleHigherThanCurrent - role:', role, 'level:', roleLevel, 'current:', currentUserTechPackRole, 'currentLevel:', currentLevel, 'isHigher:', isHigher);
    return isHigher;
  };

  // Get allowed roles for current user based on their techpack role AND target user's global role
  const getAllowedRoles = (targetUserId?: string): TechPackRole[] => {
    // Debug logging
    console.log('[SharingTab] getAllowedRoles - currentUserTechPackRole:', currentUserTechPackRole, 'targetUserId:', targetUserId);
    
    // First, filter by current user's techpack role
    let baseAllowed: TechPackRole[] = [];
    if (!currentUserTechPackRole) {
      // If no techpack role, allow all except Owner
      console.log('[SharingTab] No techpack role, allowing all except Owner');
      baseAllowed = Object.values(TechPackRole).filter(r => r !== TechPackRole.Owner);
    } else {
      // User can only share with roles equal to or lower than their current role
      const currentLevel = getRoleLevel(currentUserTechPackRole);
      console.log('[SharingTab] Current user role:', currentUserTechPackRole, 'Current level:', currentLevel);
      
      baseAllowed = Object.values(TechPackRole).filter(role => {
        const roleLevel = getRoleLevel(role);
        const isAllowed = roleLevel <= currentLevel && role !== TechPackRole.Owner;
        if (!isAllowed) {
          console.log('[SharingTab] Role filtered out:', role, 'level:', roleLevel, 'reason: level > current or is Owner');
        }
        return isAllowed;
      });
    }
    
    // If target user is selected, also filter by their global role
    if (targetUserId) {
      const targetUser = shareableUsers.find(u => u._id === targetUserId);
      if (targetUser && targetUser.role) {
        const maxAllowedLevel = getGlobalRoleToTechPackRoleLevel(targetUser.role);
        console.log('[SharingTab] Target user:', targetUser.email, 'Global role:', targetUser.role, 'Max allowed level:', maxAllowedLevel);
        
        baseAllowed = baseAllowed.filter(role => {
          const roleLevel = getRoleLevel(role);
          const isAllowed = roleLevel <= maxAllowedLevel;
          if (!isAllowed) {
            console.log('[SharingTab] Role filtered by target user global role:', role, 'level:', roleLevel, 'max allowed:', maxAllowedLevel);
          }
          return isAllowed;
        });
      }
    }
    
    console.log('[SharingTab] Final allowed roles:', baseAllowed);
    return baseAllowed;
  };

  const handleShare = async () => {
    if (!selectedUserId || !resolvedTechpackId) return;

    // Debug logging
    console.log('[SharingTab] handleShare - currentUserTechPackRole:', currentUserTechPackRole, 'selectedRole:', selectedRole);

    // Validation 1: User cannot share with a role higher than their current techpack role
    if (isRoleHigherThanCurrent(selectedRole)) {
      console.log('[SharingTab] Blocked: Selected role is higher than current role');
      showError(t('form.sharing.cannotShareHigherRole', { currentRole: currentUserTechPackRole || 'unknown' }));
      return;
    }

    // Validation 2: Cannot share with a techpack role higher than target user's global role
    const targetUser = shareableUsers.find(u => u._id === selectedUserId);
    if (targetUser && targetUser.role) {
      const targetUserGlobalRole = targetUser.role; // Get global role from user object
      const maxAllowedTechPackRoleLevel = getGlobalRoleToTechPackRoleLevel(targetUserGlobalRole);
      const selectedRoleLevel = getRoleLevel(selectedRole);
      
      console.log('[SharingTab] Target user:', targetUser.email, 'Global role:', targetUserGlobalRole, 'Max allowed techpack role level:', maxAllowedTechPackRoleLevel, 'Selected role level:', selectedRoleLevel);
      
      if (maxAllowedTechPackRoleLevel > 0 && selectedRoleLevel > maxAllowedTechPackRoleLevel) {
        console.log('[SharingTab] Blocked: Selected techpack role is higher than target user global role allows');
        showError(t('form.sharing.cannotShareHigherThanUserGlobalRole', { 
          userEmail: targetUser.email, 
          userGlobalRole: targetUserGlobalRole,
          selectedRole: selectedRole 
        }));
        return;
      }
    }

    console.log('[SharingTab] Validation passed, proceeding with share');

    setIsSubmitting(true);
    try {
      await api.shareTechPack(resolvedTechpackId, { userId: selectedUserId, role: selectedRole });
      showSuccess(t('form.sharing.accessGranted'));
      setSelectedUserId('');
      setSelectedRole(TechPackRole.Viewer);
      fetchData(); // Refresh both lists
    } catch (error: any) {
      const apiMsg = error.response?.data?.message || error.message;
      let localized = apiMsg;
      
      // Localize common error messages
      if (apiMsg === 'Cannot share with system admin or the assigned technical designer.') {
        localized = t('form.sharing.cannotShareAdminOrDesigner');
      } else if (apiMsg?.includes('Cannot share with a role higher than your current access level')) {
        // Extract currentRole from message if available
        const match = apiMsg.match(/\(([^)]+)\)/);
        const currentRole = match ? match[1] : 'unknown';
        localized = t('form.sharing.cannotShareHigherRole', { currentRole });
      } else if (apiMsg?.includes('Cannot share with role') && apiMsg?.includes('because user') && apiMsg?.includes('has global role')) {
        // Extract user email, global role, and selected role from message
        const userMatch = apiMsg.match(/user\s+([^\s]+)/);
        const roleMatch = apiMsg.match(/role\s+"([^"]+)"/);
        const globalRoleMatch = apiMsg.match(/global role\s+"([^"]+)"/);
        const userEmail = userMatch ? userMatch[1] : 'unknown';
        const selectedRole = roleMatch ? roleMatch[1] : 'unknown';
        const userGlobalRole = globalRoleMatch ? globalRoleMatch[1] : 'unknown';
        localized = t('form.sharing.cannotShareHigherThanUserGlobalRole', { 
          userEmail, 
          userGlobalRole, 
          selectedRole 
        });
      }
      
      showError(localized || t('form.sharing.grantFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: TechPackRole) => {
    if (!resolvedTechpackId) return;

    // Validation: User cannot update to a role higher than their current techpack role
    if (isRoleHigherThanCurrent(role)) {
      showError(t('form.sharing.cannotUpdateToHigherRole', { currentRole: currentUserTechPackRole || 'unknown' }));
      return;
    }

    // Validation: Cannot update to a techpack role higher than target user's global role
    const targetUserFromShareable = shareableUsers.find(u => u._id === userId);
    if (targetUserFromShareable && targetUserFromShareable.role) {
      const maxAllowedLevel = getGlobalRoleToTechPackRoleLevel(targetUserFromShareable.role);
      const selectedRoleLevel = getRoleLevel(role);
      
      console.log('[SharingTab] handleUpdateRole - Target user:', targetUserFromShareable.email, 'Global role:', targetUserFromShareable.role, 'Max allowed level:', maxAllowedLevel, 'Selected role level:', selectedRoleLevel);
      
      if (maxAllowedLevel > 0 && selectedRoleLevel > maxAllowedLevel) {
        console.log('[SharingTab] Blocked: Selected techpack role is higher than target user global role allows');
        showError(t('form.sharing.cannotShareHigherThanUserGlobalRole', { 
          userEmail: targetUserFromShareable.email, 
          userGlobalRole: targetUserFromShareable.role,
          selectedRole: role 
        }));
        return;
      }
    }

    try {
      await api.updateShareRole(resolvedTechpackId, userId, { role });
      showSuccess(t('form.sharing.roleUpdated'));
      fetchData();
    } catch (error: any) {
      const apiMsg = error.response?.data?.message || error.message;
      let localized = apiMsg;
      
      // Localize common error messages
      if (apiMsg?.includes('Cannot update to a role higher than your current access level')) {
        // Extract currentRole from message if available
        const match = apiMsg.match(/\(([^)]+)\)/);
        const currentRole = match ? match[1] : 'unknown';
        localized = t('form.sharing.cannotUpdateToHigherRole', { currentRole });
      } else if (apiMsg?.includes('Cannot update to role') && apiMsg?.includes('because user') && apiMsg?.includes('has global role')) {
        // Extract user email, global role, and selected role from message
        const userMatch = apiMsg.match(/user\s+([^\s]+)/);
        const roleMatch = apiMsg.match(/role\s+"([^"]+)"/);
        const globalRoleMatch = apiMsg.match(/global role\s+"([^"]+)"/);
        const userEmail = userMatch ? userMatch[1] : 'unknown';
        const selectedRole = roleMatch ? roleMatch[1] : 'unknown';
        const userGlobalRole = globalRoleMatch ? globalRoleMatch[1] : 'unknown';
        localized = t('form.sharing.cannotShareHigherThanUserGlobalRole', { 
          userEmail, 
          userGlobalRole, 
          selectedRole 
        });
      }
      
      showError(localized || t('form.sharing.updateRoleFailed'));
    }
  };

  const handleRevoke = async (userId: string, userName: string) => {
    if (!resolvedTechpackId) return;
    if (!window.confirm(t('form.sharing.confirmRevoke', { userName }))) return;

    try {
      await api.revokeShare(resolvedTechpackId, userId);
      showSuccess(t('form.sharing.accessRevoked'));
      fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || error.message || t('form.sharing.revokeFailed'));
    }
  };

  if (mode === 'create' || !techPack) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Share2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-lg font-medium">{t('form.sharing.notAvailableTitle')}</h2>
        <p className="mt-2">{t('form.sharing.notAvailableDescription')}</p>
      </div>
    );
  }

  console.log('🔍 Debug Sharing Tab:', {
    canManage,
    currentUserRole: currentUser?.role,
    currentUserRoleLowercase: currentUser?.role?.toLowerCase(),
    currentUserTechPackRole,
    isOwner: String((techPack as any).createdBy) === String(currentUserId),
    userGlobalRole: currentUser?.role,
    accessListLength: accessList.length,
    shareableUsersLength: shareableUsers.length,
    techpackIdForSharing: resolvedTechpackId
  });

  if (!canManage) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Eye className="w-12 h-12 mx-auto mb-4 text-blue-400" />
        <h2 className="text-lg font-medium">{t('form.sharing.viewOnlyTitle')}</h2>
        <p className="mt-2">
          {currentUserTechPackRole === TechPackRole.Viewer
            ? t('form.sharing.viewOnlyViewer')
            : currentUserTechPackRole === TechPackRole.Editor
            ? t('form.sharing.viewOnlyEditor')
            : t('form.sharing.viewOnlyOther')
          }
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>{t('form.sharing.currentRoleLabel')}</strong>{' '}
            {currentUserTechPackRole || t('form.sharing.noAccess')} (Global: {currentUser?.role})
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">{t('form.sharing.loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('form.sharing.title')}</h1>
        <p className="text-sm text-gray-600 mt-1">{t('form.sharing.subtitle')}</p>
      </div>

      {/* Add New Share Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <UserPlus className="w-5 h-5 mr-2" />
          {t('form.sharing.grantTitle')}
        </h2>
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-grow">
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.sharing.userLabel')}
            </label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => {
                const newUserId = e.target.value;
                setSelectedUserId(newUserId);
                // Reset role to Viewer when user changes, and update allowed roles based on new user's global role
                const allowedRoles = getAllowedRoles(newUserId);
                if (allowedRoles.length > 0) {
                  // Select the first allowed role (usually Viewer)
                  setSelectedRole(allowedRoles[0]);
                } else {
                  setSelectedRole(TechPackRole.Viewer);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('form.sharing.userPlaceholder')}</option>
              {shareableUsers.length === 0 ? (
                <option value="" disabled>{t('form.sharing.noUsersOption')}</option>
              ) : (
                shareableUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="w-full md:w-48">
            <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.sharing.roleLabel')}
            </label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => {
                const newRole = e.target.value as TechPackRole;
                console.log('[SharingTab] Role changed to:', newRole, 'Current user role:', currentUserTechPackRole);
                // If user tries to select a role higher than their current role, reset to Viewer
                if (isRoleHigherThanCurrent(newRole)) {
                  console.log('[SharingTab] Blocked role selection, resetting to Viewer');
                  showError(t('form.sharing.cannotShareHigherRole', { currentRole: currentUserTechPackRole || 'unknown' }));
                  setSelectedRole(TechPackRole.Viewer);
                } else {
                  setSelectedRole(newRole);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getAllowedRoles(selectedUserId).map(role => (
                <option key={role} value={role} className="capitalize">{role}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleShare}
            disabled={!selectedUserId || isSubmitting}
            className="w-full md:w-auto bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? t('form.sharing.adding') : t('form.sharing.addUser')}
          </button>
        </div>
        {shareableUsers.length === 0 && !loading && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>{t('form.sharing.noUsersTitle')}</strong>
            </p>
            <div className="text-xs text-yellow-600 mt-1">
              <p>{t('form.sharing.noUsersReasonTitle')}</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{t('form.sharing.noUsersReason1')}</li>
                <li>{t('form.sharing.noUsersReason2')}</li>
                <li>{t('form.sharing.noUsersReason3')}</li>
              </ul>
            </div>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
              <strong>{t('form.sharing.debugTitle')}</strong><br/>
              shareableUsers.length: {shareableUsers.length}<br/>
              canManage: {canManage.toString()}<br/>
              currentUserRole: {currentUser?.role}<br/>
              currentUserTechPackRole: {currentUserTechPackRole || 'undefined'}
            </div>
          </div>
        )}
        {shareableUsers.length > 0 && (
          <p className="text-sm text-gray-500 mt-4">
            {t('form.sharing.availableUsers', { count: shareableUsers.length })}
          </p>
        )}
      </div>

      {/* Current Shares Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t('form.sharing.currentlySharedTitle', { count: accessList.length })}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('form.sharing.table.user')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('form.sharing.table.role')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('form.sharing.table.sharedBy')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('form.sharing.table.dateShared')}
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">{t('common.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accessList.map((item) => (
                <tr key={item.userId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.user?.firstName || t('form.sharing.unknownUser')} {item.user?.lastName || ''}
                        </div>
                        <div className="text-sm text-gray-500">{item.user?.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {roleIcons[item.role]}
                      <select
                        value={item.role}
                        onChange={(e) => handleUpdateRole(item.userId, e.target.value as TechPackRole)}
                        className="ml-2 capitalize border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        disabled={item.role === TechPackRole.Owner || !canManage}
                      >
                        {getAllowedRoles().map(role => (
                          <option key={role} value={role} disabled={role === TechPackRole.Owner}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.sharedBy
                      ? `${(item.sharedBy as any)?.firstName || ''} ${(item.sharedBy as any)?.lastName || ''}`.trim()
                      : t('form.sharing.notAvailable')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.sharedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {item.role !== TechPackRole.Owner && (
                      <button
                        onClick={() => handleRevoke(item.userId, `${item.user.firstName} ${item.user.lastName}`)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {accessList.length === 0 && (
          <p className="text-center py-8 text-sm text-gray-500">
            {t('form.sharing.emptyAccessList')}
          </p>
        )}
      </div>
    </div>
  );
};

export default SharingTab;

