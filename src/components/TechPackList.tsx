import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { ApiTechPack } from '../types/techpack';
import { useAuth } from '../contexts/AuthContext';
import { useTechPack } from '../contexts/TechPackContext';
import { useI18n } from '../lib/i18n';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../lib/api';
import { getFieldMetadata } from '../utils/fieldMetadata';
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
  
  // Get field metadata for translations (Single Source of Truth)
  const fieldMetadata = useMemo(() => getFieldMetadata(t), [t]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);
  const [stats, setStats] = useState<{ total: number; draft: number; inReview: number; approved: number } | null>(null);
  const [pageSize, setPageSize] = useState(10); // Track current page size
  const pageSizeRef = React.useRef(10); // Use ref to track pageSize for immediate access

  const safeTechPacks = Array.isArray(techPacks) ? techPacks : [];
  
  // Sync ref with state
  React.useEffect(() => {
    pageSizeRef.current = pageSize;
  }, [pageSize]);

  // Sync pageSize with limit from pagination if available
  useEffect(() => {
    // If we have external pagination, try to infer page size from totalPages and total
    // Or we can check if there's a limit in the pagination response
    // For now, we'll keep the default 10 and let user change it
    // The pageSize will be updated when user changes it via dropdown
  }, [externalPagination]);

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
      
      // Reload with debounced search term and filters
      const params: any = {
        page: 1,
        limit: pageSizeRef.current, // Use current pageSize from ref (always up-to-date)
        q: debouncedSearchTerm || undefined,
        status: statusFilter || undefined, // Include current status filter
        category: categoryFilter || undefined, // Include category filter if supported
        season: seasonFilter || undefined, // Include season filter if supported
      };
      
      loadTechPacks(params).catch(error => {
        console.error('Failed to reload techpacks with search:', error);
      });
      
      // Notify parent to update page
      if (onPageChange) {
        onPageChange(1);
      }
    }
  }, [debouncedSearchTerm, externalPagination, loadTechPacks, onPageChange, statusFilter, categoryFilter, seasonFilter]);

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
  const canDeleteTechPack = (_techpack: ApiTechPack): boolean => {
    // Only global admin can delete
    return user?.role === 'admin';
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'process': case 'in review': case 'pending_approval': return 'warning';
      case 'draft': return 'processing';
      case 'rejected': return 'error';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'draft':
        return t('option.status.draft');
      case 'process':
      case 'in review': // Handle legacy value
        return t('option.status.process');
      case 'approved':
        return t('option.status.approved');
      case 'rejected':
        return t('option.status.rejected');
      case 'archived':
        return t('option.status.archived');
      default:
        return status || '';
    }
  };

  // All available status options (complete list from TechPackStatus type)
  const allStatusOptions: Array<{ value: string; label: string }> = useMemo(() => [
    { value: 'Draft', label: t('option.status.draft') },
    { value: 'Process', label: t('option.status.process') },
    { value: 'Approved', label: t('option.status.approved') },
    { value: 'Rejected', label: t('option.status.rejected') },
    { value: 'Archived', label: t('option.status.archived') }
  ], [t]);

  // Get product class label from metadata
  const getProductClassLabel = (productClass: string): string => {
    if (!productClass) return '';
    
    // Use fieldMetadata to get translated label
    const productClassMeta = fieldMetadata.productClass || fieldMetadata.category;
    if (productClassMeta?.options) {
      const option = productClassMeta.options.find(opt => 
        opt.value === productClass || 
        opt.value.toLowerCase() === productClass.toLowerCase()
      );
      if (option) {
        return option.label;
      }
    }
    
    // Fallback to original value if not found
    return productClass;
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

  // When server-side pagination is used, server should handle filtering
  // But we still apply client-side filter as a safety net in case server doesn't filter correctly
  // Only filter client-side if no server pagination (local data mode)
  const filteredTechPacks = useMemo(() => {
    // If using server-side pagination, still apply client-side filter as safety net
    // This ensures filter works even if server doesn't filter correctly
    // Note: This might cause issues if server returns all data but we filter client-side
    // In that case, pagination counts might be off, but at least filtering will work
    if (externalPagination && !statusFilter && !categoryFilter && !seasonFilter && !debouncedSearchTerm) {
      // Only skip client-side filtering if no filters are active
      return safeTechPacks;
    }
    
    // Otherwise, filter client-side for local data
    const filtered = safeTechPacks.filter(tp => {
      const articleName = tp.articleName || (tp as any).articleInfo?.articleName || (tp as any).productName || tp.name || '';
      const articleCode = tp.articleCode || '';
      const category = (tp as any).productClass || (tp as any).category || tp.metadata?.category || '';
      const season = (tp as any).season || tp.metadata?.season || '';
      const techPackStatus = tp.status || '';

      // Search filter
      const matchesSearch = !debouncedSearchTerm || 
        articleName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
        articleCode.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter) {
        const statusLower = techPackStatus.toLowerCase();
        const filterLower = statusFilter.toLowerCase();
        matchesStatus = 
          statusLower === filterLower || 
          // Handle legacy "In Review" value when filtering for "Process"
          (statusFilter === 'Process' && (techPackStatus === 'In Review' || statusLower === 'in review'));
      }
      
      // Category filter
      const matchesCategory = !categoryFilter || category === categoryFilter;
      
      // Season filter
      const matchesSeason = !seasonFilter || season === seasonFilter;
      
      return matchesSearch && matchesStatus && matchesCategory && matchesSeason;
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
      filters: [...new Set(safeTechPacks.map(tp => tp.status))].map((s) => ({ text: getStatusLabel(s), value: s })),
      onFilter: (value: any, record: any) => record.status.indexOf(value) === 0,
      render: (status: string) => <Tag color={getStatusColor(status)} className="status-tag">{getStatusLabel(status)}</Tag>
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
              value={stats?.inReview ?? safeTechPacks.filter(tp => {
                const statusLower = (tp.status || '').toLowerCase();
                return statusLower === 'process' || statusLower === 'pending_approval' || statusLower === 'in review';
              }).length} 
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
                      loadTechPacks({ page: 1, limit: pageSizeRef.current, q: value || undefined }).catch(console.error);
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
                    const newStatusFilter = value || '';
                    setStatusFilter(newStatusFilter);
                    
                    // Reload from server with status filter when using server-side pagination
                    if (externalPagination && loadTechPacks) {
                      const params: any = {
                        page: 1,
                        limit: pageSizeRef.current,
                        q: debouncedSearchTerm || undefined,
                      };
                      
                      // Only add status if it's not empty
                      if (newStatusFilter) {
                        params.status = newStatusFilter;
                      }
                      
                      console.log('🔍 Filtering by status:', newStatusFilter, 'with params:', params);
                      loadTechPacks(params).catch(error => {
                        console.error('Failed to load techpacks with status filter:', error);
                      });
                      
                      if (onPageChange) {
                        onPageChange(1);
                      }
                    }
                    // Note: For client-side filtering, the useMemo will automatically re-filter
                    // when statusFilter changes because it's in the dependency array
                  }}
                  value={statusFilter || undefined}
                  style={{ width: 150 }} 
                  allowClear
                >
                  {allStatusOptions.map((opt) => (
                    <Option key={opt.value} value={opt.value}>{opt.label}</Option>
                  ))}
                </Select>
                <Select 
                  placeholder={`${t('common.filter')} ${t('form.articleInfo.category').toLowerCase()}`} 
                  onChange={(value) => {
                    setCategoryFilter(value || '');
                    // Note: Category filter may need backend support
                    // For now, keep client-side filtering for category
                  }}
                  value={categoryFilter || undefined}
                  style={{ width: 200 }} 
                  allowClear
                >
                  {[...new Set(safeTechPacks.map(tp => (tp as any).productClass || (tp as any).category || tp.metadata?.category))].filter(Boolean).map((c) => (
                    <Option key={c} value={c}>{getProductClassLabel(c)}</Option>
                  ))}
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
            pageSize: pageSize, // Use state instead of hardcoded 10
            total: externalPagination?.total ?? filteredTechPacks.length,
            // Fix: If no data (total === 0), always show page 1
            // Also ensure current page doesn't exceed total pages
            current: (() => {
              const total = externalPagination?.total ?? filteredTechPacks.length;
              const requestedPage = externalPagination?.page ?? 1;
              // Use totalPages from server if available, otherwise calculate
              const totalPages = (externalPagination?.totalPages ?? Math.ceil(total / pageSize)) || 1;
              
              if (total === 0 || requestedPage > totalPages) {
                return 1;
              }
              return requestedPage;
            })(),
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'], // Available page size options
            onChange: (page, newPageSize) => {
              // onChange is called when page number changes OR when page size changes
              // newPageSize will be provided when size changes, otherwise undefined
              const effectivePageSize = newPageSize || pageSizeRef.current;
              
              // Update ref if page size changed
              if (newPageSize && newPageSize !== pageSizeRef.current) {
                pageSizeRef.current = newPageSize;
                setPageSize(newPageSize);
              }
              
              // Load data with correct page and size
              if (loadTechPacks) {
                loadTechPacks({ page, limit: effectivePageSize }).catch(console.error);
              }
              
              // Notify parent component about page change
              if (onPageChange) {
                onPageChange(page);
              }
            },
            onShowSizeChange: (current, size) => {
              // onShowSizeChange is also called, but we handle everything in onChange
              // Just update the ref and state here to keep them in sync
              pageSizeRef.current = size;
              setPageSize(size);
              // Note: onChange will be called automatically by Ant Design Table after this
              // so we don't need to call loadTechPacks here (would cause double-load)
            },
          }}
          onRow={(record) => ({
            onDoubleClick: () => onEditTechPack?.(record),
          })}
          rowClassName="techpack-row"
        />
      </Card>

      {showCreateWorkflow && (
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
      )}
    </div>
  );
};

export const TechPackList = memo(TechPackListComponent);
