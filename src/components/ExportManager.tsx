import React, { useState, useEffect } from 'react';
import { 
  ExportTemplate, 
  ExportJob, 
  ExportQueue as ExportQueueType, 
  ExportSettings,
  ExportHistory,
  TechPack,
  PDFMetadata,
  PageLayout,
  ExportTemplateType
} from '../types';
import { PDFGenerator } from './PDFGenerator';
import { ExportQueue as ExportQueueComponent } from './ExportQueue';
import { TemplateLibrary } from './TemplateLibrary';
import { 
  Download, 
  Settings, 
  FileText, 
  Clock,
  BarChart3,
  CheckCircle
} from 'lucide-react';

interface ExportManagerProps {
  techPack: TechPack;
  className?: string;
}

export const ExportManager: React.FC<ExportManagerProps> = ({
  techPack,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'templates' | 'queue' | 'history' | 'settings'>('generator');
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);
  const [exportQueue, setExportQueue] = useState<ExportQueueType>({
    id: 'queue-1',
    jobs: [],
    isProcessing: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    id: 'settings-1',
    defaultTemplate: '',
    defaultFormat: 'PDF',
    imageSettings: {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 90,
      format: 'JPEG'
    },
    textSettings: {
      defaultFont: 'Arial',
      fontSize: 12,
      lineHeight: 1.2
    },
    layoutSettings: {
      defaultOrientation: 'portrait',
      margins: { top: 20, right: 15, bottom: 20, left: 15 }
    },
    securitySettings: {
      defaultSecurity: 'internal',
      requirePassword: false,
      allowPrinting: true,
      allowCopying: true,
      allowModification: false
    },
    distributionSettings: {
      emailDistribution: [],
      cloudStorage: {
        enabled: false,
        provider: 'Google Drive',
        folderId: ''
      }
    }
  });

  const tabs = [
    { id: 'generator', label: 'PDF Generator', icon: Download },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'queue', label: 'Export Queue', icon: Clock },
    { id: 'history', label: 'History', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Initialize default templates
  useEffect(() => {
    if (templates.length === 0) {
      const defaultTemplates = createDefaultTemplates();
      setTemplates(defaultTemplates);
      if (defaultTemplates.length > 0) {
        setSelectedTemplate(defaultTemplates[0]);
      }
    }
  }, []);

  const createDefaultTemplates = (): ExportTemplate[] => {
    const baseMetadata: PDFMetadata = {
      id: 'meta-default',
      title: `${techPack.name} - Tech Pack`,
      subject: 'Fashion Technical Package',
      author: 'TechPacker Pro',
      creator: 'TechPacker Pro',
      producer: 'TechPacker PDF Generator',
      keywords: ['tech pack', 'fashion', 'design', techPack.category],
      version: '1.0',
      createdDate: new Date(),
      modifiedDate: new Date(),
      securityLevel: 'internal'
    };

    const baseLayout: PageLayout = {
      id: 'layout-default',
      name: 'Standard Layout',
      type: 'content',
      orientation: 'portrait',
      margins: { top: 20, right: 15, bottom: 20, left: 15 },
      header: {
        enabled: true,
        height: 15,
        content: `${techPack.name} - Tech Pack`,
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

    return [
      {
        id: 'template-full',
        name: 'Full Tech Pack',
        type: 'full-techpack' as ExportTemplateType,
        description: 'Complete 35+ page tech pack with all sections',
        pages: [
          { ...baseLayout, id: 'cover', name: 'Cover Page', type: 'cover' },
          { ...baseLayout, id: 'toc', name: 'Table of Contents', type: 'content' },
          { ...baseLayout, id: 'bom', name: 'Bill of Materials', type: 'bom' },
          { ...baseLayout, id: 'measurements', name: 'Measurements', type: 'measurements' },
          { ...baseLayout, id: 'construction', name: 'Construction', type: 'construction' },
          { ...baseLayout, id: 'care', name: 'Care Instructions', type: 'care' },
          { ...baseLayout, id: 'appendix', name: 'Appendix', type: 'appendix' }
        ],
        metadata: baseMetadata,
        branding: {
          companyName: 'Your Company',
          primaryColor: '#3b82f6',
          secondaryColor: '#6b7280',
          fontFamily: 'Arial'
        },
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'System'
      },
      {
        id: 'template-summary',
        name: 'Summary Tech Pack',
        type: 'summary-techpack' as ExportTemplateType,
        description: 'Condensed 5-10 page version for quick reference',
        pages: [
          { ...baseLayout, id: 'cover', name: 'Cover Page', type: 'cover' },
          { ...baseLayout, id: 'bom', name: 'Bill of Materials', type: 'bom' },
          { ...baseLayout, id: 'measurements', name: 'Measurements', type: 'measurements' }
        ],
        metadata: { ...baseMetadata, title: `${techPack.name} - Summary` },
        branding: {
          companyName: 'Your Company',
          primaryColor: '#3b82f6',
          secondaryColor: '#6b7280',
          fontFamily: 'Arial'
        },
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'System'
      },
      {
        id: 'template-bom',
        name: 'BOM Only',
        type: 'bom-only' as ExportTemplateType,
        description: 'Bill of Materials export only',
        pages: [
          { ...baseLayout, id: 'bom', name: 'Bill of Materials', type: 'bom' }
        ],
        metadata: { ...baseMetadata, title: `${techPack.name} - BOM` },
        branding: {
          companyName: 'Your Company',
          primaryColor: '#3b82f6',
          secondaryColor: '#6b7280',
          fontFamily: 'Arial'
        },
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'System'
      }
    ];
  };

  const handleJobCreated = (job: ExportJob) => {
    const updatedQueue = {
      ...exportQueue,
      jobs: [...exportQueue.jobs, job],
      updatedAt: new Date()
    };
    setExportQueue(updatedQueue);

    // Add to history
    const historyEntry: ExportHistory = {
      id: `history-${Date.now()}`,
      jobId: job.id,
      techPackId: job.techPackId,
      fileName: job.fileName,
      fileSize: job.fileSize || 0,
      format: job.format,
      template: job.templateId,
      status: job.status,
      createdAt: job.createdAt,
      downloadCount: 0,
      createdBy: job.createdBy
    };
    setExportHistory([historyEntry, ...exportHistory]);
  };

  const handleQueueUpdate = (queue: ExportQueueType) => {
    setExportQueue(queue);
  };

  const handleTemplatesChange = (newTemplates: ExportTemplate[]) => {
    setTemplates(newTemplates);
  };

  const getQueueStats = () => {
    const totalJobs = exportQueue.jobs.length;
    const pendingJobs = exportQueue.jobs.filter(job => job.status === 'pending').length;
    const completedJobs = exportQueue.jobs.filter(job => job.status === 'completed').length;
    const failedJobs = exportQueue.jobs.filter(job => job.status === 'failed').length;
    const processingJobs = exportQueue.jobs.filter(job => job.status === 'processing').length;

    return { totalJobs, pendingJobs, completedJobs, failedJobs, processingJobs };
  };

  const getHistoryStats = () => {
    const totalExports = exportHistory.length;
    const successfulExports = exportHistory.filter(h => h.status === 'completed').length;
    const totalDownloads = exportHistory.reduce((sum, h) => sum + h.downloadCount, 0);
    const recentExports = exportHistory.filter(h => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return h.createdAt > oneWeekAgo;
    }).length;

    return { totalExports, successfulExports, totalDownloads, recentExports };
  };

  const queueStats = getQueueStats();
  const historyStats = getHistoryStats();

  return (
    <div className={`export-manager ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Export & PDF Generation</h2>
            <p className="text-gray-600">
              Create professional PDF documents with advanced formatting, templates, and quality control.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-600">Tech Pack</div>
              <div className="text-lg font-semibold text-gray-900">{techPack.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{queueStats.totalJobs}</div>
              <div className="text-sm text-gray-600">Total Jobs</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{queueStats.completedJobs}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{historyStats.totalExports}</div>
              <div className="text-sm text-gray-600">Total Exports</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Download className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold text-gray-900">{historyStats.totalDownloads}</div>
              <div className="text-sm text-gray-600">Downloads</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => {
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
      <div>
        {activeTab === 'generator' && selectedTemplate && (
          <PDFGenerator
            techPack={techPack}
            template={selectedTemplate}
            onJobCreated={handleJobCreated}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateLibrary
            templates={templates}
            onTemplatesChange={handleTemplatesChange}
          />
        )}

        {activeTab === 'queue' && (
          <ExportQueueComponent
            queue={exportQueue}
            onQueueUpdate={handleQueueUpdate}
          />
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export History</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{historyStats.totalExports}</div>
                  <div className="text-sm text-gray-600">Total Exports</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{historyStats.successfulExports}</div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{historyStats.recentExports}</div>
                  <div className="text-sm text-gray-600">This Week</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">File Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Format</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Template</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Downloads</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {exportHistory.map(history => (
                      <tr key={history.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{history.fileName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{history.format}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{history.template}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            history.status === 'completed' 
                              ? 'text-green-600 bg-green-100' 
                              : 'text-red-600 bg-red-100'
                          }`}>
                            {history.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {history.createdAt.toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{history.downloadCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Settings</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Default Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Template</label>
                      <select
                        value={exportSettings.defaultTemplate}
                        onChange={(e) => setExportSettings({ ...exportSettings, defaultTemplate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Template</option>
                        {templates.map(template => (
                          <option key={template.id} value={template.id}>{template.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Format</label>
                      <select
                        value={exportSettings.defaultFormat}
                        onChange={(e) => setExportSettings({ ...exportSettings, defaultFormat: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="PDF">PDF</option>
                        <option value="DOCX">DOCX</option>
                        <option value="XLSX">XLSX</option>
                        <option value="HTML">HTML</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Image Settings</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Width</label>
                        <input
                          type="number"
                          value={exportSettings.imageSettings.maxWidth}
                          onChange={(e) => setExportSettings({
                            ...exportSettings,
                            imageSettings: { ...exportSettings.imageSettings, maxWidth: Number(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Height</label>
                        <input
                          type="number"
                          value={exportSettings.imageSettings.maxHeight}
                          onChange={(e) => setExportSettings({
                            ...exportSettings,
                            imageSettings: { ...exportSettings.imageSettings, maxHeight: Number(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quality</label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={exportSettings.imageSettings.quality}
                        onChange={(e) => setExportSettings({
                          ...exportSettings,
                          imageSettings: { ...exportSettings.imageSettings, quality: Number(e.target.value) }
                        })}
                        className="w-full"
                      />
                      <span className="text-sm text-gray-500">{exportSettings.imageSettings.quality}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
