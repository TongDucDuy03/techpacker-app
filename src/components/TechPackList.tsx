import React, { useState, useMemo, useCallback, memo } from 'react';
import { ApiTechPack } from '../types/techpack';
import { useAuth } from '../contexts/AuthContext';
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
  SearchOutlined,
  FilterOutlined,
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
  onUpdateTechPack?: (id: string, data: Partial<ApiTechPack>) => void;
  onDeleteTechPack?: (id: string) => void;
}

const TechPackListComponent: React.FC<TechPackListProps> = ({
  techPacks,
  onViewTechPack,
  onEditTechPack,
  onCreateTechPack,
  onUpdateTechPack,
  onDeleteTechPack,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false);

  // Permission checks based on user role
  const canCreate = user?.role === 'admin' || user?.role === 'designer';
  const canEdit = user?.role === 'admin' || user?.role === 'designer';
  const canDelete = user?.role === 'admin' || user?.role === 'designer';
  const isReadOnly = user?.role === 'merchandiser' || user?.role === 'viewer';

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'in review': return 'warning';
      case 'draft': return 'processing';
      case 'rejected': return 'error';
      case 'archived': return 'default';
      default: return 'default';
    }
  };

  const filteredTechPacks = useMemo(() => {
    return techPacks.filter(tp => {
      const name = (tp as any).productName || tp.name || '';
      const category = (tp as any).productClass || (tp as any).category || tp.metadata?.category || '';
      const season = (tp as any).season || tp.metadata?.season || '';

      return (
        (name.toLowerCase().includes(searchTerm.toLowerCase()) || tp.articleCode.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (statusFilter ? tp.status === statusFilter : true) &&
        (categoryFilter ? category === categoryFilter : true) &&
        (seasonFilter ? season === seasonFilter : true)
      );
    });
  }, [techPacks, searchTerm, statusFilter, categoryFilter, seasonFilter]);

  const showDeleteConfirm = (id: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this Tech Pack?',
      icon: <ExclamationCircleOutlined />,
      content: 'This action cannot be undone.',
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'No, Cancel',
      onOk: () => {
        onDeleteTechPack?.(id);
        message.success('Tech Pack deleted successfully');
      },
    });
  };

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string, record: any) => (
        <Tooltip title={record.description || 'No description'}>
          <Text strong>{record.productName || record.name}</Text>
          <br />
          <Text type="secondary">{record.productClass || record.category || record.metadata?.category}</Text>
        </Tooltip>
      )
    },
    { title: 'Article Code', dataIndex: 'articleCode', sorter: (a: any, b: any) => a.articleCode.localeCompare(b.articleCode) },
    {
      title: 'Status',
      dataIndex: 'status',
      filters: [...new Set(techPacks.map(tp => tp.status))].map(s => ({ text: s, value: s })),
      onFilter: (value: any, record: any) => record.status.indexOf(value) === 0,
      render: (status: string) => <Tag color={getStatusColor(status)} className="status-tag">{status.toUpperCase()}</Tag>
    },
    { title: 'Season', dataIndex: 'season', sorter: (a: any, b: any) => a.season.localeCompare(b.season), render: (s, r: any) => s || r.metadata?.season },
    { title: 'Last Updated', dataIndex: 'updatedAt', sorter: (a: any, b: any) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(), render: (date: string) => new Date(date).toLocaleDateString() },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ApiTechPack) => (
        <Space className="action-buttons">
          <Tooltip title="View"><Button icon={<EyeOutlined />} onClick={() => onViewTechPack?.(record)} /></Tooltip>
          {canEdit && <Tooltip title="Edit"><Button icon={<EditOutlined />} onClick={() => onEditTechPack?.(record)} /></Tooltip>}
          {canDelete && <Tooltip title="Delete"><Button icon={<DeleteOutlined />} danger onClick={() => showDeleteConfirm(record._id)} /></Tooltip>}
        </Space>
      ),
    },
  ];

  return (
    <div className="techpack-list-container">
      <div className="techpack-header">
        <Title level={2}>Tech Packs</Title>
        <Text>Manage your fashion tech packs from draft to production.</Text>
      </div>

      <Row gutter={16} className="techpack-stats">
        <Col span={6}><Card><Statistic title="Total Packs" value={techPacks.length} prefix={<FileTextOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Draft" value={techPacks.filter(tp => tp.status === 'Draft').length} prefix={<EditOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="In Review" value={techPacks.filter(tp => tp.status === 'In Review').length} prefix={<ClockCircleOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Approved" value={techPacks.filter(tp => tp.status === 'Approved').length} prefix={<CheckCircleOutlined />} /></Card></Col>
      </Row>

      <Card className="techpack-table-card">
        <div className="techpack-filters">
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Search placeholder="Search by name or code" onSearch={setSearchTerm} style={{ width: 250 }} allowClear enterButton />
                <Select placeholder="Filter by status" onChange={setStatusFilter} style={{ width: 150 }} allowClear>
                  {[...new Set(techPacks.map(tp => tp.status))].map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
                <Select placeholder="Filter by category" onChange={setCategoryFilter} style={{ width: 150 }} allowClear>
                  {[...new Set(techPacks.map(tp => (tp as any).productClass || (tp as any).category || tp.metadata?.category))].filter(Boolean).map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
                <Select placeholder="Filter by season" onChange={setSeasonFilter} style={{ width: 150 }} allowClear>
                  {[...new Set(techPacks.map(tp => (tp as any).season || tp.metadata?.season))].filter(Boolean).map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Space>
            </Col>
            <Col>
              {canCreate && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateWorkflow(true)}>
                  Create New Tech Pack
                </Button>
              )}
            </Col>
          </Row>
        </div>
        <Table
          columns={columns}
          dataSource={filteredTechPacks}
          rowKey="_id"
          pagination={{ pageSize: 10, total: filteredTechPacks.length, showSizeChanger: true }}
          onRow={(record) => ({
            onDoubleClick: () => onEditTechPack?.(record),
          })}
          rowClassName="techpack-row"
        />
      </Card>

      {/* Create TechPack Workflow */}
      <CreateTechPackWorkflow
        visible={showCreateWorkflow}
        onCancel={() => setShowCreateWorkflow(false)}
        onCreateTechPack={() => {
          setShowCreateWorkflow(false);
          // Call callback to switch to create tab
          if (onCreateTechPack) {
            onCreateTechPack();
          }
        }}
        onSuccess={(newTechPack) => {
          setShowCreateWorkflow(false);
          // Optionally refresh the list or call onCreateTechPack callback
          if (onCreateTechPack) {
            onCreateTechPack();
          }
        }}
      />
    </div>
  );
};

export const TechPackList = memo(TechPackListComponent);
