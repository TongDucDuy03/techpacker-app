import React, { useState, useEffect, useMemo } from 'react';
import { ApiTechPack, TechPackRole, ShareableUser, AccessListItem } from '../../../types/techpack';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import {
  User,
  Share2,
  Eye,
  Trash2,
  AlertCircle,
  Crown,
  Shield,
  PenTool,
  Factory,
  UserPlus
} from 'lucide-react';
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

const roleDescriptions: { [key in TechPackRole]: string } = {
  [TechPackRole.Owner]: 'Full access, can manage all settings and delete the Tech Pack.',
  [TechPackRole.Admin]: 'Can edit content and manage sharing for other users.',
  [TechPackRole.Editor]: 'Can view and edit all content in the Tech Pack.',
  [TechPackRole.Viewer]: 'Can view all content, but cannot make changes.',
  [TechPackRole.Factory]: 'Limited view-only access for production purposes.',
};

const SharingTab: React.FC<SharingTabProps> = ({ techPack, mode }) => {
  const { user: currentUser } = useAuth();
  const [accessList, setAccessList] = useState<AccessListItem[]>([]);
  const [shareableUsers, setShareableUsers] = useState<ShareableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<TechPackRole>(TechPackRole.Viewer);

  const currentUserTechPackRole = useMemo(() => {
    if (!techPack || !currentUser) return undefined;
    // Use `createdBy` which is the actual owner ID from the backend
    if (techPack.createdBy === currentUser._id) {
      return TechPackRole.Owner;
    }
    const shared = accessList.find(item => item.userId === currentUser._id);
    return shared?.role;
  }, [techPack, currentUser, accessList]);

  const canManage = currentUserTechPackRole === TechPackRole.Owner || currentUserTechPackRole === TechPackRole.Admin;

  const fetchData = async () => {
    if (!techPack?._id) return;
    setLoading(true);
    try {
      const accessRes = await api.getAccessList(techPack._id);
      const fetchedAccessList = accessRes.data || [];
      setAccessList(fetchedAccessList);

      // Determine if the current user can manage based on the fetched list
      const userRole = techPack.createdBy === currentUser?._id
        ? TechPackRole.Owner
        : fetchedAccessList.find((item: AccessListItem) => item.userId === currentUser?._id)?.role;

      if (userRole === TechPackRole.Owner || userRole === TechPackRole.Admin) {
        const usersRes = await api.getShareableUsers(techPack._id);
        setShareableUsers(usersRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sharing data:', error);
      showError('Failed to load sharing information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (techPack?._id) {
      fetchData();
    }
  }, [techPack?._id]);

  const handleShare = async () => {
    if (!selectedUserId || !techPack?._id) return;

    setIsSubmitting(true);
    try {
      await api.shareTechPack(techPack._id, { userId: selectedUserId, role: selectedRole });
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
    if (!techPack?._id) return;

    try {
      await api.updateShareRole(techPack._id, userId, { role });
      showSuccess('Role updated successfully.');
      fetchData();
    } catch (error: any) {
      showError(error.response?.data?.message || error.message || 'Failed to update role.');
    }
  };

  const handleRevoke = async (userId: string, userName: string) => {
    if (!techPack?._id) return;
    if (!window.confirm(`Are you sure you want to remove access for ${userName}?`)) return;

    try {
      await api.revokeShare(techPack._id, userId);
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

  if (!canManage) {
    return (
      <div className="p-8 text-center text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-lg font-medium">Access Denied</h2>
        <p className="mt-2">You do not have permission to manage sharing for this Tech Pack.</p>
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
              {shareableUsers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
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
          <p className="text-sm text-gray-500 mt-4">All users have been granted access.</p>
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
                        <div className="text-sm font-medium text-gray-900">{item.user.firstName} {item.user.lastName}</div>
                        <div className="text-sm text-gray-500">{item.user.email}</div>
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
                        disabled={item.role === TechPackRole.Owner || currentUserRole !== TechPackRole.Owner}
                      >
                        {Object.values(TechPackRole).map(role => (
                          <option key={role} value={role} disabled={role === TechPackRole.Owner}>{role}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.sharedBy ? `${(item.sharedBy as any).firstName} ${(item.sharedBy as any).lastName}` : 'N/A'}
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

