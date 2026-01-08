import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { ApiTechPack } from '../types/techpack';
import { useAuth } from '../contexts/AuthContext';
import { useTechPack } from '../contexts/TechPackContext';
import { useI18n } from '../lib/i18n';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../lib/api';
import CreateTechPackWorkflow from './CreateTechPackWorkflow';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Tooltip,
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  message
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import './TechPackList.css';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface TechPackListProps {
  techPacks: ApiTechPack[];
  onViewTechPack?: (techPack: ApiTechPack) => void;
  onEditTechPack?: (techPack: ApiTechPack) => void;
  onCreateTechPack?: () => void;
  onDeleteTechPack?: (id: string) => void;
  pagination?: { page: number; total: number; totalPages: number };
  onPageChange?: (page: number) => void;
}

const TechPackListComponent: React.FC<TechPackListProps> = ({
  techPacks,
  onViewTechPack,
  onEditTechPack,
  onCreateTechPack,
  onDeleteTechPack,
  pagination: externalPagination,
  onPageChange,
}) => {
  const { loadTechPacks, addTechPackToList } = useTechPack();
  const { user } = useAuth();
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [stats, setStats] = useState<{ total: number; draft: number; inReview: number; approved: number } | null>(null);

  const safeTechPacks = Array.isArray(techPacks) ? techPacks : [];

  // Load stats from server when component mounts or pagination changes
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await api.getTechPackStats();
        setStats(statsData);
      } catch (error) {
        console.error('Failed to load techpack stats:', error);
        // Fallback to calculating from current page data
        setStats(null);
      }
    };
    
    if (externalPagination) {
      loadStats();
    }
  }, [externalPagination?.total]); // Reload stats when total changes

  // Reload from server when debounced search term changes (only if using server-side pagination)
  // Status filter is handled by onChange handler, so we only need to handle debounced search here
  const prevSearchRef = React.useRef('');
  
  useEffect(() => {
    if (externalPagination && loadTechPacks && prevSearchRef.current !== debouncedSearchTerm) {
      prevSearchRef.current = debouncedSearchTerm;
      
      // Reload with debounced search term
      const params: any = {
        page: 1,
        limit: 10, // Match frontend pageSize
        q: debouncedSearchTerm || undefined,
        status: statusFilter || undefined, // Include current status filter
      };
      
      loadTechPacks(params).catch(error => {
        console.error('Failed to reload techpacks with search:', error);
      });
      
      // Notify parent to update page
      if (onPageChange) {
        onPageChange(1);
      }
    }
  }, [debouncedSearchTerm, externalPagination, loadTechPacks, onPageChange, statusFilter]);

  const canCreate = user?.role === 'admin' || user?.role === 'designer';
  
  // Helper function to get user's techpack role for a specific techpack
  const getUserTechPackRole = (techpack: ApiTechPack): string | undefined => {
    if (!user || !techpack) return undefined;
    
    const userId = String((user as any)?.id || (user as any)?._id || '');
    
    // Check if user is owner
    const createdBy = (techpack as any).createdBy;
    const createdById = createdBy && typeof createdBy === 'object' ? createdBy._id : createdBy;
    if (createdById && String(createdById) === userId) {
      return 'owner'; // Owner has full access
    }
    
    // Check if user is global admin
    if (user.role?.toLowerCase() === 'admin') {
      return 'admin'; // Global admin has admin access
    }
    
    // Check sharedWith array
    const sharedWith = (techpack as any).sharedWith || [];
    const shared = sharedWith.find((s: any) => {
      const shareUserId = s.userId?._id?.toString() || s.userId?.toString();
      return shareUserId === userId;
    });
    
    return shared?.role?.toLowerCase();
  };
  
  // Helper function to check if user can edit a specific techpack
  const canEditTechPack = (techpack: ApiTechPack): boolean => {
    // Global admin and designer can edit if they have Editor role or higher
    if (user?.role === 'admin' || user?.role === 'designer') {
      const techPackRole = getUserTechPackRole(techpack);
      // Can edit if role is owner, admin, or editor
      return techPackRole === 'owner' || techPackRole === 'admin' || techPackRole === 'editor';
    }
    return false;
  };
  
  // Helper function to check if user can delete a specific techpack
  const canDeleteTechPack = (techpack: ApiTechPack): boolean => {
    // Only global admin can delete
    return user?.role === 'admin';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'in review': case 'pending_approval': return 'warning';
      case 'draft': return 'processing';
      case 'rejected': return 'error';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const formatDateTime = useCallback((value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // When server-side pagination is used, don't filter client-side
  // Server already handles pagination and filtering
  // Only filter client-side if no server pagination (local data mode)
  const filteredTechPacks = useMemo(() => {
    // If using server-side pagination, return data as-is (server already filtered)
    if (externalPagination) {
      return safeTechPacks;
    }
    
    // Otherwise, filter client-side for local data
    const filtered = safeTechPacks.filter(tp => {
      const articleName = tp.articleName || (tp as any).articleInfo?.articleName || (tp as any).productName || tp.name || '';
      const articleCode = tp.articleCode || '';
      const category = (tp as any).productClass || (tp as any).category || tp.metadata?.category || '';
      const season = (tp as any).season || tp.metadata?.season || '';

      return (
        (articleName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
         articleCode.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) &&
        (statusFilter ? tp.status === statusFilter : true) &&
        (categoryFilter ? category === categoryFilter : true) &&
        (seasonFilter ? season === seasonFilter : true)
      );
    });

    return filtered.sort((a, b) => {
      const aCreated = new Date(a.createdAt || 0).getTime();
      const bCreated = new Date(b.createdAt || 0).getTime();
      return bCreated - aCreated;
    });
  }, [safeTechPacks, debouncedSearchTerm, statusFilter, categoryFilter, seasonFilter, externalPagination]);

  const showDeleteConfirm = (id: string) => {
    Modal.confirm({
      title: t('techpack.list.deleteConfirm'),
      icon: <ExclamationCircleOutlined />,
      content: t('common.warning'),
      okText: t('common.yes'),
      okType: 'danger',
      cancelText: t('common.no'),
      onOk: () => {
        onDeleteTechPack?.(id);
        message.success(t('techpack.list.deleteSuccess'));
      },
    });
  };

  const columns = [
    {
      title: t('techpack.list.title'),
      dataIndex: 'name',
      sorter: (a: any, b: any) => {
        const aName = a.articleName || a.articleInfo?.articleName || (a as any).productName || a.name || '';
        const bName = b.articleName || b.articleInfo?.articleName || (b as any).productName || b.name || '';
        return aName.localeCompare(bName);
      },
      render: (_: string, record: any) => {
        const articleInfo = record.articleInfo || {};
        const articleName = record.articleName || articleInfo.articleName || (record as any).productName || record.name || '';
        return (
            <Tooltip title={articleInfo.productDescription || record.productDescription || t('techpack.list.noDescription')}>
            <Text strong>{articleName}</Text>
            <br />
            <Text type="secondary">{articleInfo.productClass || record.productClass || record.metadata?.category}</Text>
          </Tooltip>
        );
      }
    },
    { 
      title: t('techpack.list.articleCode'), 
      dataIndex: 'articleCode', 
      sorter: (a: any, b: any) => (a.articleCode || '').localeCompare(b.articleCode || '') 
    },
    {
      title: t('techpack.list.status'),
      dataIndex: 'status',
      filters: [...new Set(safeTechPacks.map(tp => tp.status))].map((s) => ({ text: s, value: s })),
      onFilter: (value: any, record: any) => record.status.indexOf(value) === 0,
      render: (status: string) => <Tag color={getStatusColor(status)} className="status-tag">{status.toUpperCase()}</Tag>
    },
    { 
      title: t('techpack.list.season'), 
      dataIndex: 'season', 
      sorter: (a: any, b: any) => ((a.season || '') || (a.metadata?.season || '')).localeCompare((b.season || '') || (b.metadata?.season || '')), 
      render: (s: string, r: any) => s || r.metadata?.season || '—' 
    },
    {
      title: t('techpack.list.createdDate'),
      dataIndex: 'createdAt',
      defaultSortOrder: 'descend' as 'ascend' | 'descend' | undefined,
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => formatDateTime(date),
    },
    {
      title: t('techpack.list.lastUpdated'),
      dataIndex: 'updatedAt',
      sorter: (a: any, b: any) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (date: string) => formatDateTime(date),
    },
    {
      title: t('techpack.list.actions'),
      key: 'actions',
      render: (_: any, record: ApiTechPack) => {
        const canEditThis = canEditTechPack(record);
        const canDeleteThis = canDeleteTechPack(record);
        return (
        <Space className="action-buttons">
            <Tooltip title={t('techpack.list.action.view')}><Button icon={<EyeOutlined />} onClick={() => onViewTechPack?.(record)} /></Tooltip>
            {canEditThis && <Tooltip title={t('techpack.list.action.edit')}><Button icon={<EditOutlined />} onClick={() => onEditTechPack?.(record)} /></Tooltip>}
            {canDeleteThis && <Tooltip title={t('techpack.list.action.delete')}><Button icon={<DeleteOutlined />} danger onClick={() => showDeleteConfirm(record._id)} /></Tooltip>}
        </Space>
        );
      },
    },
  ];

  return (
    <div className="techpack-list-container">
      <div className="techpack-header">
        <Title level={2}>{t('nav.techpacks')}</Title>
        <Text>{t('tpl.header.subtitle')}</Text>
      </div>

      <Row gutter={16} className="techpack-stats">
        {/* Use stats from server API when available, otherwise fallback to pagination or local data */}
        <Col span={6}>
          <Card>
            <Statistic 
              title={t('dash.stat.total')} 
              value={stats?.total ?? externalPagination?.total ?? safeTechPacks.length} 
              prefix={<FileTextOutlined />} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title={t('status.draft')} 
              value={stats?.draft ?? safeTechPacks.filter(tp => (tp.status || '').toLowerCase() === 'draft').length} 
              prefix={<EditOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title={t('status.inReview')} 
              value={stats?.inReview ?? safeTechPacks.filter(tp => (tp.status || '').toLowerCase() === 'pending_approval' || (tp.status || '').toLowerCase() === 'in review').length} 
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title={t('status.approved')} 
              value={stats?.approved ?? safeTechPacks.filter(tp => (tp.status || '').toLowerCase() === 'approved').length} 
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="techpack-table-card">
        <div className="techpack-filters">
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Search 
                  placeholder={t('tpl.search.placeholder')} 
                  onSearch={(value) => {
                    setSearchTerm(value);
                    // Reload from server with search term when using server-side pagination
                    if (externalPagination && loadTechPacks) {
                      loadTechPacks({ page: 1, limit: 10, q: value || undefined }).catch(console.error);
                      if (onPageChange) onPageChange(1);
                    }
                  }}
                  onChange={(e) => {
                    // Update search term for immediate UI feedback
                    setSearchTerm(e.target.value);
                  }}
                  value={searchTerm}
                  style={{ width: 250 }} 
                  allowClear 
                  enterButton 
                />
                <Select 
                  placeholder={`${t('common.filter')} ${t('techpack.list.status').toLowerCase()}`} 
                  onChange={(value) => {
                    setStatusFilter(value || '');
                    // Reload from server with status filter when using server-side pagination
                    if (externalPagination && loadTechPacks) {
                      loadTechPacks({ page: 1, limit: 10, status: value || undefined }).catch(console.error);
                      if (onPageChange) onPageChange(1);
                    }
                  }}
                  value={statusFilter || undefined}
                  style={{ width: 150 }} 
                  allowClear
                >
                  {[...new Set(safeTechPacks.map(tp => tp.status))].map((s) => <Option key={s} value={s}>{s}</Option>)}
                </Select>
                <Select 
                  placeholder={`${t('common.filter')} ${t('form.category').toLowerCase()}`} 
                  onChange={(value) => {
                    setCategoryFilter(value || '');
                    // Note: Category filter may need backend support
                    // For now, keep client-side filtering for category
                  }}
                  value={categoryFilter || undefined}
                  style={{ width: 150 }} 
                  allowClear
                >
                  {[...new Set(safeTechPacks.map(tp => (tp as any).productClass || (tp as any).category || tp.metadata?.category))].filter(Boolean).map((c) => <Option key={c} value={c}>{c}</Option>)}
                </Select>
                <Select 
                  placeholder={`${t('common.filter')} ${t('techpack.list.season').toLowerCase()}`} 
                  onChange={(value) => {
                    setSeasonFilter(value || '');
                    // Note: Season filter may need backend support
                    // For now, keep client-side filtering for season
                  }}
                  value={seasonFilter || undefined}
                  style={{ width: 150 }} 
                  allowClear
                >
                  {[...new Set(safeTechPacks.map(tp => (tp as any).season || tp.metadata?.season))].filter(Boolean).map((s) => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Space>
            </Col>
            <Col>
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateWorkflow(true)}>
                  {t('tpl.new')}
                </Button>
              )}
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={filteredTechPacks}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            total: externalPagination?.total ?? filteredTechPacks.length,
            // Fix: If no data (total === 0), always show page 1
            // Also ensure current page doesn't exceed total pages
            current: (() => {
              const total = externalPagination?.total ?? filteredTechPacks.length;
              const requestedPage = externalPagination?.page ?? 1;
              const totalPages = Math.ceil(total / 10) || 1;
              
              if (total === 0 || requestedPage > totalPages) {
                return 1;
              }
              return requestedPage;
            })(),
            showSizeChanger: true,
            onChange: (page, pageSize) => {
              // Reload with correct page and limit
              // Always send limit parameter to match frontend pageSize
              if (loadTechPacks) {
                loadTechPacks({ page, limit: pageSize || 10 }).catch(console.error);
              }
              // Notify parent component about page change
              if (onPageChange) {
                onPageChange(page);
              }
            },
            onShowSizeChange: (current, size) => {
              // When user changes page size, reload with new limit and reset to page 1
              if (loadTechPacks) {
                loadTechPacks({ page: 1, limit: size }).catch(console.error);
              }
              if (onPageChange) {
                onPageChange(1);
              }
            },
          }}
          onRow={(record) => ({
            onDoubleClick: () => onEditTechPack?.(record),
          })}
          rowClassName="techpack-row"
        />
      </Card>

      <CreateTechPackWorkflow
        visible={showCreateWorkflow}
        onCancel={() => setShowCreateWorkflow(false)}
        onCreateTechPack={() => {
          setShowCreateWorkflow(false);
          if (onCreateTechPack) {
            onCreateTechPack();
          }
        }}
        onSuccess={async (newTechPack) => {
          setShowCreateWorkflow(false);
          
          if (addTechPackToList && newTechPack) {
            addTechPackToList(newTechPack);
          }
          
          loadTechPacks({ page: 1, limit: 10 }).catch(error => {
            console.error('Failed to refresh techpack list:', error);
            loadTechPacks({ page: 1, limit: 10 }).catch(fallbackError => {
              console.error('Failed to refresh techpack list (fallback):', fallbackError);
            });
          });
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (onEditTechPack && newTechPack) {
            onEditTechPack(newTechPack);
          }
        }}
      />
    </div>
  );
};

export const TechPackList = memo(TechPackListComponent);
