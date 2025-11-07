import React, { useState, useEffect, useMemo } from 'react';
import { ApiTechPack, TechPackRole, ShareableUser, AccessListItem } from '../../../types/techpack';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { User, Share2, Eye, Trash2, Crown, Shield, PenTool, Factory, UserPlus } from 'lucide-react';
import { showSuccess, showError } from '../../../lib/toast';

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
          console.log('📋 Fetching shareable users...', { techpackId: resolvedTechpackId, includeAdmins: true });
          // Fetching shareable users for techpack (include admins to avoid empty list in small envs)
          const usersRes = await api.getShareableUsers(resolvedTechpackId, { includeAdmins: true });
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
      showError('Failed to load sharing information.');
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
        showError('Failed to load sharing information.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [resolvedTechpackId, currentUserId]);

  // Removed duplicate shareable users fetch to avoid overwriting state

  const handleShare = async () => {
    if (!selectedUserId || !resolvedTechpackId) return;

    setIsSubmitting(true);
    try {
      await api.shareTechPack(resolvedTechpackId, { userId: selectedUserId, role: selectedRole });
      showSuccess('Access granted successfully.');
      setSelectedUserId('');
      setSelectedRole(TechPackRole.Viewer);
      fetchData(); // Refresh both lists
    } catch (error: any) {
      showError(error.response?.data?.message || error.message || 'Failed to grant access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: TechPackRole) => {
    if (!resolvedTechpackId) return;

    try {
      await api.updateShareRole(resolvedTechpackId, userId, { role });
      showSuccess('Role updated successfully.');
      fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || error.message || 'Failed to update role.');
    }
  };

  const handleRevoke = async (userId: string, userName: string) => {
    if (!resolvedTechpackId) return;
    if (!window.confirm(`Are you sure you want to remove access for ${userName}?`)) return;

    try {
      await api.revokeShare(resolvedTechpackId, userId);
      showSuccess('Access removed successfully.');
      fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || error.message || 'Failed to remove access.');
    }
  };

  if (mode === 'create' || !techPack) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Share2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-lg font-medium">Sharing is not available yet</h2>
        <p className="mt-2">Please save the Tech Pack first to enable sharing options.</p>
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
        <h2 className="text-lg font-medium">You have view-only access to this TechPack</h2>
        <p className="mt-2">
          {currentUserTechPackRole === TechPackRole.Viewer
            ? "You can view all content but cannot make changes or manage sharing."
            : currentUserTechPackRole === TechPackRole.Editor
            ? "You can edit content but cannot manage sharing settings."
            : "Only the owner or administrators can manage sharing for this TechPack."
          }
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <strong>Your current role:</strong> {currentUserTechPackRole || 'No access'} (Global: {currentUser?.role})
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">Loading Sharing Settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sharing & Access Control</h1>
        <p className="text-sm text-gray-600 mt-1">Manage who can view or edit this Tech Pack.</p>
      </div>

      {/* Add New Share Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <UserPlus className="w-5 h-5 mr-2" />
          Grant Access to a User
        </h2>
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex-grow">
            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a user...</option>
              {shareableUsers.length === 0 ? (
                <option value="" disabled>No users available to share</option>
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
            <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              id="role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as TechPackRole)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(TechPackRole).filter(r => r !== TechPackRole.Owner).map(role => (
                <option key={role} value={role} className="capitalize">{role}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleShare}
            disabled={!selectedUserId || isSubmitting}
            className="w-full md:w-auto bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? 'Adding...' : 'Add User'}
          </button>
        </div>
        {shareableUsers.length === 0 && !loading && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>No users available to share with.</strong>
            </p>
            <div className="text-xs text-yellow-600 mt-1">
              <p>This could be because:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All users have already been shared with this TechPack</li>
                <li>There are no other users in the system</li>
                <li>All users are either admins or the technical designer</li>
              </ul>
            </div>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
              <strong>Debug Info:</strong><br/>
              shareableUsers.length: {shareableUsers.length}<br/>
              canManage: {canManage.toString()}<br/>
              currentUserRole: {currentUser?.role}<br/>
              currentUserTechPackRole: {currentUserTechPackRole || 'undefined'}
            </div>
          </div>
        )}
        {shareableUsers.length > 0 && (
          <p className="text-sm text-gray-500 mt-4">
            {shareableUsers.length} user{shareableUsers.length !== 1 ? 's' : ''} available to share with.
          </p>
        )}
      </div>

      {/* Current Shares Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Currently Shared With ({accessList.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shared By</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Shared</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
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
                        <div className="text-sm font-medium text-gray-900">{item.user?.firstName || 'Unknown'} {item.user?.lastName || ''}</div>
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
                        {Object.values(TechPackRole).map(role => (
                          <option key={role} value={role} disabled={role === TechPackRole.Owner}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.sharedBy ? `${(item.sharedBy as any)?.firstName || ''} ${(item.sharedBy as any)?.lastName || ''}`.trim() : 'N/A'}
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
          <p className="text-center py-8 text-sm text-gray-500">This Tech Pack has not been shared with anyone yet.</p>
        )}
      </div>
    </div>
  );
};

export default SharingTab;

