import React, { useState } from 'react';
import { ExportTemplate, PDFMetadata, PageLayout, ExportTemplateType } from '../types';
import { 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  Download, 
  Upload, 
  Save, 
  Settings,
  FileText,
  Layout,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface TemplateLibraryProps {
  templates: ExportTemplate[];
  onTemplatesChange: (templates: ExportTemplate[]) => void;
  className?: string;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templates,
  onTemplatesChange,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'editor' | 'import'>('library');
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ExportTemplateType | 'all'>('all');

  const templateTypes: { value: ExportTemplateType; label: string; description: string }[] = [
    { value: 'full-techpack', label: 'Full Tech Pack', description: 'Complete 35+ page tech pack' },
    { value: 'summary-techpack', label: 'Summary Tech Pack', description: 'Condensed 5-10 page version' },
    { value: 'bom-only', label: 'BOM Only', description: 'Bill of Materials export' },
    { value: 'measurements-only', label: 'Measurements Only', description: 'Measurement charts only' },
    { value: 'construction-only', label: 'Construction Only', description: 'Construction details only' },
    { value: 'care-instructions', label: 'Care Instructions', description: 'Care labels and instructions' },
    { value: 'custom', label: 'Custom', description: 'User-defined template' }
  ];

  const createDefaultTemplate = (type: ExportTemplateType): ExportTemplate => {
    const baseMetadata: PDFMetadata = {
      id: `meta-${Date.now()}`,
      title: 'Tech Pack Document',
      subject: 'Fashion Technical Package',
      author: 'TechPacker Pro',
      creator: 'TechPacker Pro',
      producer: 'TechPacker PDF Generator',
      keywords: ['tech pack', 'fashion', 'design'],
      version: '1.0',
      createdDate: new Date(),
      modifiedDate: new Date(),
      securityLevel: 'internal'
    };

    const baseLayout: PageLayout = {
      id: `layout-${Date.now()}`,
      name: 'Standard Layout',
      type: 'content',
      orientation: 'portrait',
      margins: { top: 20, right: 15, bottom: 20, left: 15 },
      header: {
        enabled: true,
        height: 15,
        content: 'Tech Pack Document',
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fontWeight: 'bold',
          fontStyle: 'normal',
          color: '#000000',
          lineHeight: 1.2,
          textAlign: 'center'
        }
      },
      footer: {
        enabled: true,
        height: 15,
        content: 'Confidential',
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fontWeight: 'normal',
          fontStyle: 'normal',
          color: '#666666',
          lineHeight: 1.2,
          textAlign: 'center'
        },
        pageNumber: true
      },
      columns: 1,
      columnGap: 5
    };

    const pages: PageLayout[] = [];

    switch (type) {
      case 'full-techpack':
        pages.push(
          { ...baseLayout, id: 'cover', name: 'Cover Page', type: 'cover' },
          { ...baseLayout, id: 'toc', name: 'Table of Contents', type: 'content' },
          { ...baseLayout, id: 'bom', name: 'Bill of Materials', type: 'bom' },
          { ...baseLayout, id: 'measurements', name: 'Measurements', type: 'measurements' },
          { ...baseLayout, id: 'construction', name: 'Construction', type: 'construction' },
          { ...baseLayout, id: 'care', name: 'Care Instructions', type: 'care' },
          { ...baseLayout, id: 'appendix', name: 'Appendix', type: 'appendix' }
        );
        break;
      case 'summary-techpack':
        pages.push(
          { ...baseLayout, id: 'cover', name: 'Cover Page', type: 'cover' },
          { ...baseLayout, id: 'bom', name: 'Bill of Materials', type: 'bom' },
          { ...baseLayout, id: 'measurements', name: 'Measurements', type: 'measurements' }
        );
        break;
      case 'bom-only':
        pages.push({ ...baseLayout, id: 'bom', name: 'Bill of Materials', type: 'bom' });
        break;
      case 'measurements-only':
        pages.push({ ...baseLayout, id: 'measurements', name: 'Measurements', type: 'measurements' });
        break;
      case 'construction-only':
        pages.push({ ...baseLayout, id: 'construction', name: 'Construction', type: 'construction' });
        break;
      case 'care-instructions':
        pages.push({ ...baseLayout, id: 'care', name: 'Care Instructions', type: 'care' });
        break;
      default:
        pages.push(baseLayout);
    }

    return {
      id: `template-${Date.now()}`,
      name: `${templateTypes.find(t => t.value === type)?.label} Template`,
      type,
      description: templateTypes.find(t => t.value === type)?.description || '',
      pages,
      metadata: baseMetadata,
      branding: {
        companyName: 'Your Company',
        primaryColor: '#3b82f6',
        secondaryColor: '#6b7280',
        fontFamily: 'Arial'
      },
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'Current User'
    };
  };

  const addTemplate = (type: ExportTemplateType) => {
    const newTemplate = createDefaultTemplate(type);
    onTemplatesChange([...templates, newTemplate]);
    setSelectedTemplate(newTemplate);
    setActiveTab('editor');
  };

  const updateTemplate = (template: ExportTemplate) => {
    const updatedTemplates = templates.map(t => 
      t.id === template.id ? { ...template, updatedAt: new Date() } : t
    );
    onTemplatesChange(updatedTemplates);
    setSelectedTemplate(template);
  };

  const deleteTemplate = (templateId: string) => {
    onTemplatesChange(templates.filter(t => t.id !== templateId));
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
  };

  const duplicateTemplate = (template: ExportTemplate) => {
    const duplicatedTemplate: ExportTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    onTemplatesChange([...templates, duplicatedTemplate]);
  };

  const exportTemplate = (template: ExportTemplate) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const template = JSON.parse(e.target?.result as string) as ExportTemplate;
        template.id = `template-${Date.now()}`;
        template.isDefault = false;
        template.createdAt = new Date();
        template.updatedAt = new Date();
        template.createdBy = 'Current User';
        
        onTemplatesChange([...templates, template]);
        setSelectedTemplate(template);
        setActiveTab('editor');
      } catch (error) {
        console.error('Failed to import template:', error);
      }
    };
    reader.readAsText(file);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || template.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTemplateIcon = (type: ExportTemplateType) => {
    switch (type) {
      case 'full-techpack': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'summary-techpack': return <FileText className="w-5 h-5 text-green-500" />;
      case 'bom-only': return <Layout className="w-5 h-5 text-purple-500" />;
      case 'measurements-only': return <Layout className="w-5 h-5 text-orange-500" />;
      case 'construction-only': return <Layout className="w-5 h-5 text-red-500" />;
      case 'care-instructions': return <Shield className="w-5 h-5 text-yellow-500" />;
      case 'custom': return <Settings className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTemplateStatus = (template: ExportTemplate) => {
    const hasPages = template.pages.length > 0;
    const hasMetadata = template.metadata.title && template.metadata.author;
    const hasBranding = template.branding.companyName && template.branding.primaryColor;
    
    if (hasPages && hasMetadata && hasBranding) {
      return { status: 'complete', icon: CheckCircle, color: 'text-green-600' };
    } else if (hasPages || hasMetadata || hasBranding) {
      return { status: 'partial', icon: AlertTriangle, color: 'text-yellow-600' };
    } else {
      return { status: 'empty', icon: XCircle, color: 'text-red-600' };
    }
  };

  const renderLibraryTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
          <div>
        <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ExportTemplateType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {templateTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
                </div>
              </div>
            </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map(template => {
          const status = getTemplateStatus(template);
          const StatusIcon = status.icon;
          
          return (
            <div
              key={template.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getTemplateIcon(template.type)}
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  </div>
                <StatusIcon className={`w-4 h-4 ${status.color}`} />
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              <div className="text-xs text-gray-500 mb-3">
                <div>Pages: {template.pages.length}</div>
                <div>Type: {templateTypes.find(t => t.value === template.type)?.label}</div>
                <div>Updated: {template.updatedAt.toLocaleDateString()}</div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setActiveTab('editor');
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setActiveTab('editor');
                  }}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => duplicateTemplate(template)}
                  className="p-2 text-gray-600 hover:text-gray-700"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => exportTemplate(template)}
                  className="p-2 text-gray-600 hover:text-gray-700"
                  title="Export"
                >
                  <Download className="w-4 h-4" />
                </button>
                {!template.isDefault && (
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="p-2 text-red-600 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create New Template */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Create New Template</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templateTypes.map(type => (
            <button
              key={type.value}
              onClick={() => addTemplate(type.value)}
              className="p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                {getTemplateIcon(type.value)}
                <span className="font-medium text-gray-900">{type.label}</span>
              </div>
              <p className="text-sm text-gray-600">{type.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEditorTab = () => {
    if (!selectedTemplate) {
      return (
        <div className="text-center py-12 text-gray-500">
          <Edit className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Select a template to edit</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Template Editor</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  updateTemplate(selectedTemplate);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                <Save className="w-4 h-4" />
                Save Template
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                value={selectedTemplate.name}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Type</label>
              <select
                value={selectedTemplate.type}
                onChange={(e) => setSelectedTemplate({ ...selectedTemplate, type: e.target.value as ExportTemplateType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={selectedTemplate.description}
              onChange={(e) => setSelectedTemplate({ ...selectedTemplate, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Template Preview */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Template Preview</h4>
          <div className="space-y-2">
            <div className="text-sm text-gray-600">
              <strong>Pages:</strong> {selectedTemplate.pages.length}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Security Level:</strong> {selectedTemplate.metadata.securityLevel}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Company:</strong> {selectedTemplate.branding.companyName}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImportTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Import Template</h4>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">Upload a template file (.json)</p>
          <input
            type="file"
            accept=".json"
            onChange={importTemplate}
            className="hidden"
            id="template-upload"
          />
          <label
            htmlFor="template-upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Choose File
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`template-library ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Template Library</h3>
        <p className="text-sm text-gray-600">
          Manage PDF export templates for different document types.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'library', label: 'Library', icon: FileText },
              { id: 'editor', label: 'Editor', icon: Edit },
              { id: 'import', label: 'Import', icon: Upload }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
          </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'library' && renderLibraryTab()}
      {activeTab === 'editor' && renderEditorTab()}
      {activeTab === 'import' && renderImportTab()}
    </div>
  );
};