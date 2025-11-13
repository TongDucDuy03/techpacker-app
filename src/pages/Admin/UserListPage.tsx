import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Table, Input, Select, Tag, Space, Tooltip, Modal, message, Card, Row, Col, Statistic, Typography, Switch } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';
import UserModal from './components/UserModal';
import './UserListPage.css';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;


interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'designer' | 'merchandiser' | 'viewer';
  createdAt: string;
  lastLogin?: string;
  is2FAEnabled?: boolean;
}

interface UserStatsData {
  totalUsers: number;
  roleDistribution: Record<string, number>;
  recentUsers: User[];
}

const UserListPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ search: '', role: '' });
  const [sorter, setSorter] = useState({ field: 'createdAt', order: 'descend' });
  const [twoFactorLoadingIds, setTwoFactorLoadingIds] = useState<string[]>([]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getAllUsers({
        page: pagination.current,
        limit: pagination.pageSize,
        search: filters.search,
        role: filters.role,
        sortBy: sorter.field,
        sortOrder: sorter.order === 'ascend' ? 'asc' : 'desc',
      });
      setUsers(response.users);
      setPagination(prev => ({ ...prev, total: response.pagination.total }));
    } catch (err) {
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await api.getUserStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.current, pagination.pageSize, filters, sorter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
    setSorter({ field: sorter.field || 'createdAt', order: sorter.order || 'descend' });
  };

  const handleUserSaved = () => {
    setIsModalOpen(false);
    fetchUsers();
    fetchStats();
  };

  const showDeleteConfirm = (user: User) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this user?',
      content: `${user.firstName} ${user.lastName} will be permanently deleted.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      onOk: async () => {
        try {
          await api.deleteUser(user._id);
          message.success('User deleted successfully');
          fetchUsers();
          fetchStats();
        } catch (error) {
          message.error('Failed to delete user');
        }
      },
    });
  };

  const handleToggleTwoFactor = async (user: User, enabled: boolean) => {
    setTwoFactorLoadingIds(prev => [...prev, user._id]);
    try {
      await api.updateUserTwoFactor(user._id, enabled);
      message.success(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'} for ${user.email}`);
      fetchUsers();
    } catch (error) {
      message.error(`Failed to update 2FA for ${user.email}`);
    } finally {
      setTwoFactorLoadingIds(prev => prev.filter(id => id !== user._id));
    }
  };

  const roleColors: { [key: string]: string } = {
    admin: 'red',
    designer: 'blue',
    merchandiser: 'green',
    viewer: 'purple',
  };

  const columns = [
    { title: 'Name', dataIndex: 'firstName', sorter: true, render: (text: string, record: User) => `${record.firstName} ${record.lastName}` },
    { title: 'Email', dataIndex: 'email', sorter: true },
    { title: 'Role', dataIndex: 'role', sorter: true, render: (role: string) => <Tag color={roleColors[role]}>{role.toUpperCase()}</Tag> },
    { title: 'Created At', dataIndex: 'createdAt', sorter: true, render: (date: string) => new Date(date).toLocaleDateString() },
    { title: 'Last Login', dataIndex: 'lastLogin', sorter: true, render: (date: string) => date ? new Date(date).toLocaleString() : 'N/A' },
    {
      title: '2FA',
      dataIndex: 'is2FAEnabled',
      render: (_: any, record: User) => (
        <Switch
          checked={record.is2FAEnabled !== false}
          onChange={(checked) => handleToggleTwoFactor(record, checked)}
          loading={twoFactorLoadingIds.includes(record._id)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: User) => (
        <Space size="middle">
          <Tooltip title="View"><Button icon={<EyeOutlined />} onClick={() => { setSelectedUser(record); setModalMode('view'); setIsModalOpen(true); }} /></Tooltip>
          <Tooltip title="Edit"><Button icon={<EditOutlined />} onClick={() => { setSelectedUser(record); setModalMode('edit'); setIsModalOpen(true); }} /></Tooltip>
          <Tooltip title="Delete"><Button icon={<DeleteOutlined />} danger onClick={() => showDeleteConfirm(record)} /></Tooltip>
        </Space>
      ),
    },
  ];

  const userStats = useMemo(() => (
    <Row gutter={16} className="stats-container">
      <Col span={8}><Card><Statistic title="Total Users" value={stats?.totalUsers} prefix={<TeamOutlined />} /></Card></Col>
      <Col span={8}><Card><Statistic title="Most Common Role" value={Object.keys(stats?.roleDistribution || {}).reduce((a, b) => (stats?.roleDistribution[a] || 0) > (stats?.roleDistribution[b] || 0) ? a : b, 'N/A')} prefix={<UserOutlined />} /></Card></Col>
      <Col span={8}><Card><Statistic title="New Users (Last 7 Days)" value={stats?.recentUsers.length} prefix={<RiseOutlined />} /></Card></Col>
    </Row>
  ), [stats]);

  return (
    <div className="user-list-page">
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <Button icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} />
              <div>
                <Title level={3} style={{ marginBottom: 0 }}>User Management</Title>
                <Text type="secondary">Administer users and roles</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedUser(null); setModalMode('create'); setIsModalOpen(true); }}>
              Add New User
            </Button>
          </Col>
        </Row>
      </div>

      {userStats}

      <Card className="table-card">
        <div className="table-header">
          <Row justify="space-between" align="middle">
            <Col><Title level={4}>All Users</Title></Col>
            <Col>
              <Space>
                <Search placeholder="Search by name or email" onSearch={value => setFilters({ ...filters, search: value })} style={{ width: 250 }} allowClear />
                <Select placeholder="Filter by role" onChange={value => setFilters({ ...filters, role: value })} style={{ width: 150 }} allowClear>
                  <Option value="admin">Admin</Option>
                  <Option value="designer">Designer</Option>
                  <Option value="merchandiser">Merchandiser</Option>
                  <Option value="viewer">Viewer</Option>
                </Select>
              </Space>
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>

      {isModalOpen && (
        <UserModal
          user={selectedUser}
          mode={modalMode}
          onClose={() => setIsModalOpen(false)}
          onSave={handleUserSaved}
        />
      )}
    </div>
  );
};

export default UserListPage;
