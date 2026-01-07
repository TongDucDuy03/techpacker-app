import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Table, Input, Select, Tag, Space, Tooltip, Modal, message, Card, Row, Col, Statistic, Typography, Switch } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined, TeamOutlined, RiseOutlined } from '@ant-design/icons';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
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
  const { t } = useI18n();

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
      message.error(t('admin.users.fetchError'));
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
      title: t('admin.users.delete.title'),
      content: t('admin.users.delete.content', { name: `${user.firstName} ${user.lastName}` }),
      okText: t('admin.users.delete.ok'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          await api.deleteUser(user._id);
          message.success(t('admin.users.delete.success'));
          fetchUsers();
          fetchStats();
        } catch (error) {
          message.error(t('admin.users.delete.error'));
        }
      },
    });
  };

  const handleToggleTwoFactor = async (user: User, enabled: boolean) => {
    setTwoFactorLoadingIds(prev => [...prev, user._id]);
    try {
      await api.updateUserTwoFactor(user._id, enabled);
      message.success(
        enabled
          ? t('admin.users.twoFactor.enabled', { email: user.email })
          : t('admin.users.twoFactor.disabled', { email: user.email })
      );
      fetchUsers();
    } catch (error) {
      message.error(t('admin.users.twoFactor.error', { email: user.email }));
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
    { title: t('admin.users.columns.name'), dataIndex: 'firstName', sorter: true, render: (text: string, record: User) => `${record.firstName} ${record.lastName}` },
    { title: t('admin.users.columns.email'), dataIndex: 'email', sorter: true },
    { title: t('admin.users.columns.role'), dataIndex: 'role', sorter: true, render: (role: string) => <Tag color={roleColors[role]}>{role.toUpperCase()}</Tag> },
    { title: t('admin.users.columns.createdAt'), dataIndex: 'createdAt', sorter: true, render: (date: string) => new Date(date).toLocaleDateString() },
    { title: t('admin.users.columns.lastLogin'), dataIndex: 'lastLogin', sorter: true, render: (date: string) => date ? new Date(date).toLocaleString() : t('admin.users.na') },
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
      title: t('common.actions'),
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
      <Col span={8}><Card><Statistic title={t('admin.users.stats.totalUsers')} value={stats?.totalUsers} prefix={<TeamOutlined />} /></Card></Col>
      <Col span={8}><Card><Statistic title={t('admin.users.stats.mostCommonRole')} value={Object.keys(stats?.roleDistribution || {}).reduce((a, b) => (stats?.roleDistribution[a] || 0) > (stats?.roleDistribution[b] || 0) ? a : b, t('admin.users.na'))} prefix={<UserOutlined />} /></Card></Col>
      <Col span={8}><Card><Statistic title={t('admin.users.stats.newUsers')} value={stats?.recentUsers.length} prefix={<RiseOutlined />} /></Card></Col>
    </Row>
  ), [stats, t]);

  return (
    <div className="user-list-page">
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <Button icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} />
              <div>
                <Title level={3} style={{ marginBottom: 0 }}>{t('admin.users.title')}</Title>
                <Text type="secondary">{t('admin.users.subtitle')}</Text>
              </div>
            </Space>
          </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedUser(null); setModalMode('create'); setIsModalOpen(true); }}>
                {t('admin.users.addNew')}
              </Button>
            </Col>
        </Row>
      </div>

      {userStats}

      <Card className="table-card">
        <div className="table-header">
          <Row justify="space-between" align="middle">
            <Col><Title level={4}>{t('admin.users.allUsers')}</Title></Col>
            <Col>
              <Space>
                <Search
                  placeholder={t('admin.users.searchPlaceholder')}
                  onSearch={value => setFilters({ ...filters, search: value })}
                  style={{ width: 250 }}
                  allowClear
                />
                <Select
                  placeholder={t('admin.users.filterByRole')}
                  onChange={value => setFilters({ ...filters, role: value as string })}
                  style={{ width: 150 }}
                  allowClear
                >
                  <Option value="admin">{t('admin.users.roles.admin')}</Option>
                  <Option value="designer">{t('admin.users.roles.designer')}</Option>
                  <Option value="merchandiser">{t('admin.users.roles.merchandiser')}</Option>
                  <Option value="viewer">{t('admin.users.roles.viewer')}</Option>
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
