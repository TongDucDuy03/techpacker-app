import React, { useState, useEffect } from 'react';
import { ApiTechPack, SharedAccess } from '../../../types/techpack';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { User, Share2, Eye, Edit, X, Trash2, AlertCircle } from 'lucide-react';
import { showSuccess, showError } from '../../../lib/toast';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface SharingTabProps {
  techPack?: ApiTechPack;
  mode?: 'create' | 'edit' | 'view';
  onUpdate?: (techPack: ApiTechPack) => void;
}

const SharingTab: React.FC<SharingTabProps> = ({ techPack, mode, onUpdate }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');

  // Check if current user can share
  const canShare = user?.role === 'admin' || techPack?.createdBy === user?._id;

  useEffect(() => {
    if (techPack && canShare) {
      fetchUsers();
    }
  }, [techPack, canShare]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getAllUsers({ role: '' }); // Get all users
      // Filter out admins and the technical designer
      const filteredUsers = response.users.filter((u: User) => 
        u.role !== 'admin' && 
        u._id !== techPack?.technicalDesignerId &&
        !techPack?.sharedWith?.some(share => share.userId === u._id)
      );
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedUserId || !techPack || !techPack._id) {
      if (!techPack?._id) {
        showError('Please save the Tech Pack first before sharing');
        return;
      }
      return;
    }

    setSharing(true);
    try {
      const response = await fetch(`/api/v1/techpacks/${techPack._id}/share`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: selectedUserId,
          permission: selectedPermission
        })
      });

      if (response.ok) {
        const result = await response.json();
        const updatedTechPack = { ...techPack, sharedWith: result.data };
        onUpdate?.(updatedTechPack);
        setSelectedUserId('');
        setSelectedPermission('view');
        showSuccess(`Successfully shared with ${users.find(u => u._id === selectedUserId)?.firstName} ${users.find(u => u._id === selectedUserId)?.lastName}`);
        fetchUsers(); // Refresh available users
      } else {
        // Improved error handling for non-JSON responses
        let errorMessage = 'Failed to share Tech Pack';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON (e.g., 404 HTML page), use status text
          errorMessage = response.statusText || errorMessage;
        }
        showError(errorMessage);
      }
    } catch (error) {
      console.error('Share error:', error);
      showError('Failed to share Tech Pack');
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (userId: string, userName: string) => {
    if (!techPack || !techPack._id) {
      showError('Cannot revoke access: Tech Pack not found');
      return;
    }

    if (!confirm(`Are you sure you want to remove access for ${userName}?`)) {
      return;
    }

    setRevoking(userId);
    try {
      const response = await fetch(`/api/v1/techpacks/${techPack._id}/share/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const updatedSharedWith = techPack.sharedWith.filter(share => share.userId !== userId);
        const updatedTechPack = { ...techPack, sharedWith: updatedSharedWith };
        onUpdate?.(updatedTechPack);
        showSuccess(`Access removed for ${userName}`);
        fetchUsers(); // Refresh available users
      } else {
        // Improved error handling for non-JSON responses
        let errorMessage = 'Failed to remove access';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON (e.g., 404 HTML page), use status text
          errorMessage = response.statusText || errorMessage;
        }
        showError(errorMessage);
      }
    } catch (error) {
      console.error('Revoke error:', error);
      showError('Failed to remove access');
    } finally {
      setRevoking(null);
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

  if (!canShare) {
    return (
      <div className="p-8 text-center text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h2 className="text-lg font-medium">Access Denied</h2>
        <p className="mt-2">Only the creator or an admin can manage sharing for this Tech Pack.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sharing & Access Control</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage who can view or edit this Tech Pack.
        </p>
      </div>

      {/* Current Shares Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Currently Shared With
        </h2>
        {techPack.sharedWith && techPack.sharedWith.length > 0 ? (
          <div className="space-y-3">
            {techPack.sharedWith.map((share) => {
              const user = users.find(u => u._id === share.userId);
              return (
                <div key={share.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center">
                      {share.permission === 'view' ? (
                        <Eye className="w-4 h-4 text-gray-500 mr-1" />
                      ) : (
                        <Edit className="w-4 h-4 text-gray-500 mr-1" />
                      )}
                      <span className="text-sm text-gray-600 capitalize">{share.permission} access</span>
                    </div>
                    <button
                      onClick={() => handleRevoke(share.userId, user ? `${user.firstName} ${user.lastName}` : 'User')}
                      disabled={revoking === share.userId}
                      className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {revoking === share.userId ? (
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">This Tech Pack has not been shared with anyone yet.</p>
        )}
      </div>

      {/* Add New Share Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Share2 className="w-5 h-5 mr-2" />
          Share with Others
        </h2>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500">No users available to share with.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permission Level
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="permission"
                    value="view"
                    checked={selectedPermission === 'view'}
                    onChange={(e) => setSelectedPermission(e.target.value as 'view' | 'edit')}
                    className="mr-2"
                  />
                  <Eye className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm">View only - Can view but not edit</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="permission"
                    value="edit"
                    checked={selectedPermission === 'edit'}
                    onChange={(e) => setSelectedPermission(e.target.value as 'view' | 'edit')}
                    className="mr-2"
                  />
                  <Edit className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-sm">Edit access - Can view and edit</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleShare}
              disabled={!selectedUserId || sharing}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {sharing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Tech Pack
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharingTab;

